
-- 1) Profiles additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_promoter BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- 2) Transactions additions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC;

-- 3) Update VIP1 price (find lowest priced)
UPDATE public.investment_types
SET price = 3500
WHERE id = (SELECT id FROM public.investment_types ORDER BY price ASC LIMIT 1);

-- 4) Update app_settings
UPDATE public.app_settings
SET min_withdrawal = 1500,
    withdrawal_fee_percent = 15;

-- 5) Bonus journaliers
CREATE TABLE IF NOT EXISTS public.daily_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bonuses" ON public.daily_bonuses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bonuses" ON public.daily_bonuses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all bonuses" ON public.daily_bonuses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6) Mission rewards
CREATE TABLE IF NOT EXISTS public.mission_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  mission_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own missions" ON public.mission_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all missions" ON public.mission_rewards FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 7) Referral bonus update (level1=15%)
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(depositor_user_id uuid, deposit_amount numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  lvl1_profile_id UUID;
  lvl2_profile_id UUID;
  lvl3_profile_id UUID;
BEGIN
  SELECT referred_by INTO lvl1_profile_id FROM public.profiles WHERE user_id = depositor_user_id;
  IF lvl1_profile_id IS NOT NULL THEN
    UPDATE public.profiles SET balance = balance + (deposit_amount * 0.15) WHERE id = lvl1_profile_id;
    SELECT referred_by INTO lvl2_profile_id FROM public.profiles WHERE id = lvl1_profile_id;
    IF lvl2_profile_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + (deposit_amount * 0.05) WHERE id = lvl2_profile_id;
      SELECT referred_by INTO lvl3_profile_id FROM public.profiles WHERE id = lvl2_profile_id;
      IF lvl3_profile_id IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + (deposit_amount * 0.02) WHERE id = lvl3_profile_id;
      END IF;
    END IF;
  END IF;
END;
$$;

-- 8) Request withdrawal RPC
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_method TEXT,
  p_wallet TEXT,
  p_country TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_frozen BOOLEAN;
  v_min NUMERIC;
  v_fee_pct NUMERIC;
  v_has_inv BOOLEAN;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success', false, 'error', 'Non authentifié'); END IF;

  SELECT balance, is_frozen INTO v_balance, v_frozen FROM public.profiles WHERE user_id = v_user;
  IF v_frozen THEN RETURN json_build_object('success', false, 'error', 'Votre compte est gelé. Contactez le support.'); END IF;

  SELECT min_withdrawal, withdrawal_fee_percent INTO v_min, v_fee_pct FROM public.app_settings LIMIT 1;
  IF p_amount < v_min THEN RETURN json_build_object('success', false, 'error', 'Retrait minimum : ' || v_min || ' F'); END IF;
  IF p_amount > v_balance THEN RETURN json_build_object('success', false, 'error', 'Solde insuffisant'); END IF;

  SELECT EXISTS(SELECT 1 FROM public.investments WHERE user_id = v_user) INTO v_has_inv;
  IF NOT v_has_inv THEN RETURN json_build_object('success', false, 'error', 'Vous devez acheter au moins un produit avant de retirer.'); END IF;

  v_fee := round(p_amount * v_fee_pct / 100);
  v_net := p_amount - v_fee;

  UPDATE public.profiles SET balance = balance - p_amount WHERE user_id = v_user;

  INSERT INTO public.transactions (user_id, amount, type, method, wallet_number, country, fee_amount, net_amount, status)
  VALUES (v_user, p_amount, 'withdrawal', p_method, p_wallet, p_country, v_fee, v_net, 'pending');

  RETURN json_build_object('success', true);
END;
$$;

-- 9) Admin adjust balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_user_id UUID, p_new_balance NUMERIC)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RETURN json_build_object('success', false, 'error', 'Accès refusé'); END IF;
  UPDATE public.profiles SET balance = p_new_balance WHERE user_id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$;

-- 10) Admin toggle freeze
CREATE OR REPLACE FUNCTION public.admin_toggle_freeze(p_user_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RETURN json_build_object('success', false, 'error', 'Accès refusé'); END IF;
  UPDATE public.profiles SET is_frozen = NOT is_frozen WHERE user_id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$;

-- 11) Admin toggle promoter
CREATE OR REPLACE FUNCTION public.admin_toggle_promoter(p_user_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RETURN json_build_object('success', false, 'error', 'Accès refusé'); END IF;
  UPDATE public.profiles SET is_promoter = NOT is_promoter WHERE user_id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$;

-- 12) Admin grant product to promoter
CREATE OR REPLACE FUNCTION public.admin_grant_product(p_user_id UUID, p_type_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price NUMERIC;
  v_daily NUMERIC;
  v_dur INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RETURN json_build_object('success', false, 'error', 'Accès refusé'); END IF;
  SELECT price, daily_return, duration INTO v_price, v_daily, v_dur FROM public.investment_types WHERE id = p_type_id;
  IF v_price IS NULL THEN RETURN json_build_object('success', false, 'error', 'Produit introuvable'); END IF;
  INSERT INTO public.investments (user_id, type_id, amount_invested, daily_yield, end_date)
  VALUES (p_user_id, p_type_id, v_price, v_daily, now() + (v_dur || ' days')::interval);
  RETURN json_build_object('success', true);
END;
$$;

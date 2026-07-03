
-- Profiles: withdrawal preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_withdrawal_country TEXT,
  ADD COLUMN IF NOT EXISTS preferred_withdrawal_operator TEXT,
  ADD COLUMN IF NOT EXISTS preferred_withdrawal_number TEXT;
GRANT UPDATE (preferred_withdrawal_country, preferred_withdrawal_operator, preferred_withdrawal_number) ON public.profiles TO authenticated;

-- Investment types: freeze flag
ALTER TABLE public.investment_types
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;

-- Referral rewards tracking table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referee ON public.referral_rewards(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_level ON public.referral_rewards(level);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_created ON public.referral_rewards(created_at);

GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rewards" ON public.referral_rewards;
CREATE POLICY "Users can view their own rewards"
  ON public.referral_rewards FOR SELECT
  USING (referrer_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Buy investment: block frozen products
CREATE OR REPLACE FUNCTION public.buy_investment(p_type_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_price NUMERIC;
  v_daily_return NUMERIC;
  v_duration INTEGER;
  v_base_price NUMERIC;
  v_is_frozen BOOLEAN;
  v_balance NUMERIC;
  v_has_prior_investment BOOLEAN;
  v_inv_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT price, daily_return, duration, COALESCE(referral_base_price, price), COALESCE(is_frozen, false)
    INTO v_price, v_daily_return, v_duration, v_base_price, v_is_frozen
  FROM public.investment_types
  WHERE id = p_type_id;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  IF v_is_frozen THEN
    RETURN json_build_object('success', false, 'error', 'Ce produit est temporairement gelé');
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant', 'required', v_price, 'balance', v_balance);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.investments WHERE user_id = v_user_id
  ) INTO v_has_prior_investment;

  PERFORM set_config('app.internal_call', 'true', false);

  UPDATE public.profiles SET balance = balance - v_price WHERE user_id = v_user_id;

  INSERT INTO public.investments (user_id, type_id, amount_invested, daily_yield, end_date)
  VALUES (v_user_id, p_type_id, v_price, v_daily_return, now() + (v_duration || ' days')::interval)
  RETURNING id INTO v_inv_id;

  IF NOT v_has_prior_investment AND v_base_price > 0 THEN
    PERFORM public.apply_referral_purchase_bonus(v_user_id, v_base_price);
  END IF;

  RETURN json_build_object('success', true, 'investment_id', v_inv_id, 'paid', v_price);
END;
$function$;

-- Admin toggle freeze RPC
CREATE OR REPLACE FUNCTION public.admin_toggle_investment_type_freeze(p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new BOOLEAN;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  UPDATE public.investment_types
  SET is_frozen = NOT COALESCE(is_frozen, false)
  WHERE id = p_id
  RETURNING is_frozen INTO v_new;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  RETURN json_build_object('success', true, 'is_frozen', v_new);
END;
$function$;

-- Referral purchase bonus: also record entries in referral_rewards
CREATE OR REPLACE FUNCTION public.apply_referral_purchase_bonus(p_user_id uuid, p_base_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referee_profile_id UUID;
  v_lvl1_profile_id UUID;
  v_lvl1_amount NUMERIC;
  v_lvl2_profile_id UUID;
  v_lvl2_amount NUMERIC;
  v_lvl3_profile_id UUID;
  v_lvl3_amount NUMERIC;
BEGIN
  SELECT id INTO v_referee_profile_id FROM public.profiles WHERE user_id = p_user_id;

  SELECT referred_by INTO v_lvl1_profile_id FROM public.profiles WHERE user_id = p_user_id;
  IF v_lvl1_profile_id IS NOT NULL THEN
    v_lvl1_amount := ROUND(p_base_price * 0.20);
    PERFORM set_config('app.internal_call', 'true', false);
    UPDATE public.profiles SET balance = balance + v_lvl1_amount WHERE id = v_lvl1_profile_id;
    INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
    VALUES (v_lvl1_profile_id, v_referee_profile_id, 1, v_lvl1_amount);

    SELECT referred_by INTO v_lvl2_profile_id FROM public.profiles WHERE id = v_lvl1_profile_id;
    IF v_lvl2_profile_id IS NOT NULL THEN
      v_lvl2_amount := ROUND(p_base_price * 0.05);
      PERFORM set_config('app.internal_call', 'true', false);
      UPDATE public.profiles SET balance = balance + v_lvl2_amount WHERE id = v_lvl2_profile_id;
      INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
      VALUES (v_lvl2_profile_id, v_referee_profile_id, 2, v_lvl2_amount);

      SELECT referred_by INTO v_lvl3_profile_id FROM public.profiles WHERE id = v_lvl2_profile_id;
      IF v_lvl3_profile_id IS NOT NULL THEN
        v_lvl3_amount := ROUND(p_base_price * 0.01);
        PERFORM set_config('app.internal_call', 'true', false);
        UPDATE public.profiles SET balance = balance + v_lvl3_amount WHERE id = v_lvl3_profile_id;
        INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
        VALUES (v_lvl3_profile_id, v_referee_profile_id, 3, v_lvl3_amount);
      END IF;
    END IF;
  END IF;
END; $$;

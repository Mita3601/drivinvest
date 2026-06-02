
CREATE TYPE public.promo_type AS ENUM ('balance', 'product_discount', 'deposit_bonus');

CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type public.promo_type NOT NULL,
  value NUMERIC NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  max_users INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo_codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)
);

GRANT SELECT, INSERT ON public.promo_code_uses TO authenticated;
GRANT ALL ON public.promo_code_uses TO service_role;

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own uses" ON public.promo_code_uses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all uses" ON public.promo_code_uses
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_product_discount_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_deposit_bonus_pct NUMERIC NOT NULL DEFAULT 0;

-- Admin: créer un code promo
CREATE OR REPLACE FUNCTION public.admin_create_promo_code(
  p_code TEXT, p_type public.promo_type, p_value NUMERIC,
  p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ, p_max_users INTEGER
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RETURN json_build_object('success', false, 'error', 'Date de fin invalide');
  END IF;
  INSERT INTO public.promo_codes (code, type, value, starts_at, ends_at, max_users, created_by)
  VALUES (upper(trim(p_code)), p_type, p_value, p_starts_at, p_ends_at, p_max_users, auth.uid())
  RETURNING id INTO v_id;
  RETURN json_build_object('success', true, 'id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'Ce code existe déjà');
END; $$;

-- Utilisateur: utiliser un code promo
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_promo RECORD;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success', false, 'error', 'Non authentifié'); END IF;

  SELECT * INTO v_promo FROM public.promo_codes
  WHERE code = upper(trim(p_code)) FOR UPDATE;

  IF v_promo.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Code introuvable'); END IF;
  IF now() < v_promo.starts_at THEN RETURN json_build_object('success', false, 'error', 'Code pas encore actif'); END IF;
  IF now() > v_promo.ends_at THEN RETURN json_build_object('success', false, 'error', 'Code expiré'); END IF;
  IF v_promo.uses_count >= v_promo.max_users THEN RETURN json_build_object('success', false, 'error', 'Code épuisé'); END IF;

  BEGIN
    INSERT INTO public.promo_code_uses (promo_id, user_id) VALUES (v_promo.id, v_user);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'Vous avez déjà utilisé ce code');
  END;

  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE id = v_promo.id;

  IF v_promo.type = 'balance' THEN
    UPDATE public.profiles SET balance = balance + v_promo.value WHERE user_id = v_user;
    RETURN json_build_object('success', true, 'message', '+' || v_promo.value || ' F crédités');
  ELSIF v_promo.type = 'product_discount' THEN
    UPDATE public.profiles SET active_product_discount_pct = v_promo.value WHERE user_id = v_user;
    RETURN json_build_object('success', true, 'message', 'Remise de ' || v_promo.value || '% activée sur votre prochain achat');
  ELSIF v_promo.type = 'deposit_bonus' THEN
    UPDATE public.profiles SET active_deposit_bonus_pct = v_promo.value WHERE user_id = v_user;
    RETURN json_build_object('success', true, 'message', 'Bonus de ' || v_promo.value || '% activé sur votre prochaine recharge');
  END IF;

  RETURN json_build_object('success', false, 'error', 'Type inconnu');
END; $$;

-- Mise à jour de buy_investment pour consommer la remise produit
CREATE OR REPLACE FUNCTION public.buy_investment(p_type_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_price NUMERIC; v_daily_return NUMERIC; v_duration INTEGER;
  v_is_starter BOOLEAN; v_base_price NUMERIC;
  v_balance NUMERIC; v_inv_id UUID;
  v_has_starter BOOLEAN; v_has_non_starter BOOLEAN;
  v_discount_pct NUMERIC; v_final_price NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Non authentifié'); END IF;

  SELECT price, daily_return, duration, COALESCE(is_starter,false), COALESCE(referral_base_price,0)
    INTO v_price, v_daily_return, v_duration, v_is_starter, v_base_price
  FROM public.investment_types WHERE id = p_type_id;
  IF v_price IS NULL THEN RETURN json_build_object('success', false, 'error', 'Produit introuvable'); END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.investments i JOIN public.investment_types t ON t.id = i.type_id
    WHERE i.user_id = v_user_id AND t.is_starter = true
  ) INTO v_has_starter;

  IF v_is_starter THEN
    IF v_has_starter THEN RETURN json_build_object('success', false, 'error', 'Vous avez déjà acheté le Pass Starter.'); END IF;
  ELSE
    IF NOT v_has_starter THEN RETURN json_build_object('success', false, 'error', 'Vous devez d''abord acheter le Pass Starter (2500 F) avant tout autre produit.'); END IF;
  END IF;

  SELECT balance, COALESCE(active_product_discount_pct,0) INTO v_balance, v_discount_pct
    FROM public.profiles WHERE user_id = v_user_id;

  v_final_price := v_price;
  IF NOT v_is_starter AND v_discount_pct > 0 THEN
    v_final_price := ROUND(v_price * (100 - v_discount_pct) / 100);
  END IF;

  IF v_balance < v_final_price THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant', 'required', v_final_price, 'balance', v_balance);
  END IF;

  UPDATE public.profiles SET balance = balance - v_final_price WHERE user_id = v_user_id;

  -- Consommer la remise si appliquée
  IF NOT v_is_starter AND v_discount_pct > 0 THEN
    UPDATE public.profiles SET active_product_discount_pct = 0 WHERE user_id = v_user_id;
  END IF;

  INSERT INTO public.investments (user_id, type_id, amount_invested, daily_yield, end_date)
  VALUES (v_user_id, p_type_id, v_final_price, v_daily_return, now() + (v_duration || ' days')::interval)
  RETURNING id INTO v_inv_id;

  IF NOT v_is_starter THEN
    SELECT EXISTS(
      SELECT 1 FROM public.investments i JOIN public.investment_types t ON t.id = i.type_id
      WHERE i.user_id = v_user_id AND COALESCE(t.is_starter,false) = false AND i.id <> v_inv_id
    ) INTO v_has_non_starter;
    IF NOT v_has_non_starter AND v_base_price > 0 THEN
      PERFORM public.apply_referral_purchase_bonus(v_user_id, v_base_price);
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'investment_id', v_inv_id, 'paid', v_final_price);
END; $$;

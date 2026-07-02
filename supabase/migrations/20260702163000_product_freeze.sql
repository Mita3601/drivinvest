-- Add product freeze support and block purchases for frozen products.

ALTER TABLE public.investment_types
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;

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

CREATE OR REPLACE FUNCTION public.admin_toggle_investment_type_freeze(
  p_id uuid,
  p_is_frozen boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  UPDATE public.investment_types
  SET is_frozen = p_is_frozen
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;

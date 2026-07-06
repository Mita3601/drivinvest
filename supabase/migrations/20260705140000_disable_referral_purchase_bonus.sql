-- Disable referral purchase bonuses for investments.
-- When a referee buys a product, the referrer must not receive an investment-related benefit.

CREATE OR REPLACE FUNCTION public.apply_referral_purchase_bonus(p_user_id uuid, p_base_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Business rule: no purchase referral bonus for investment products.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_investment(p_type_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id UUID;
  v_price NUMERIC;
  v_yield NUMERIC;
  v_cycle_days INTEGER;
  v_total_cycles INTEGER;
  v_total_days INTEGER;
  v_base_price NUMERIC;
  v_is_frozen BOOLEAN;
  v_balance NUMERIC;
  v_has_prior BOOLEAN;
  v_inv_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT price, daily_return, COALESCE(cycle_days,1), COALESCE(total_cycles, duration),
         COALESCE(referral_base_price, price), COALESCE(is_frozen, false)
    INTO v_price, v_yield, v_cycle_days, v_total_cycles, v_base_price, v_is_frozen
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

  SELECT EXISTS(SELECT 1 FROM public.investments WHERE user_id = v_user_id) INTO v_has_prior;

  v_total_days := v_cycle_days * v_total_cycles;

  PERFORM set_config('app.internal_call', 'true', false);
  UPDATE public.profiles SET balance = balance - v_price WHERE user_id = v_user_id;

  INSERT INTO public.investments (user_id, type_id, amount_invested, daily_yield, end_date)
  VALUES (v_user_id, p_type_id, v_price, v_yield, now() + (v_total_days || ' days')::interval)
  RETURNING id INTO v_inv_id;

  RETURN json_build_object('success', true, 'investment_id', v_inv_id, 'paid', v_price);
END;
$function$;

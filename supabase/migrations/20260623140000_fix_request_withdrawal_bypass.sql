-- Fix: Allow request_withdrawal to update profile balance without trigger conflict

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

  -- Set bypass flag for this internal call
  PERFORM set_config('app.internal_call', 'true', false);

  UPDATE public.profiles SET balance = balance - p_amount WHERE user_id = v_user;

  INSERT INTO public.transactions (user_id, amount, type, method, wallet_number, country, fee_amount, net_amount, status)
  VALUES (v_user, p_amount, 'withdrawal', p_method, p_wallet, p_country, v_fee, v_net, 'pending');

  RETURN json_build_object('success', true);
END;
$$;

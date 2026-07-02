-- Backend hotfixes only: profile balance, admin access and withdrawal rules

-- Keep admin role checks functional for authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- New accounts must start with 1500 FCFA
ALTER TABLE public.profiles ALTER COLUMN balance SET DEFAULT 1500;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_id UUID;
  ref_code TEXT;
BEGIN
  ref_code := NEW.raw_user_meta_data ->> 'referred_by';
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, balance, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    1500,
    referrer_id
  );
  RETURN NEW;
END;
$function$;

-- Optional backfill for accounts created at 0 FCFA before the fix
UPDATE public.profiles
SET balance = 1500
WHERE balance = 0
  AND total_deposited = 0
  AND total_withdrawn = 0;

-- Platform withdrawal settings
UPDATE public.app_settings
SET min_withdrawal = 2200,
    withdrawal_fee_percent = 18;

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
  v_fee NUMERIC;
  v_net NUMERIC;
  v_method TEXT := lower(trim(p_method));
  v_country TEXT := trim(p_country);
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT balance, is_frozen INTO v_balance, v_frozen
  FROM public.profiles
  WHERE user_id = v_user;

  IF v_frozen THEN
    RETURN json_build_object('success', false, 'error', 'Votre compte est gelé. Contactez le support.');
  END IF;

  SELECT min_withdrawal, withdrawal_fee_percent INTO v_min, v_fee_pct
  FROM public.app_settings
  LIMIT 1;

  IF v_balance < v_min THEN
    RETURN json_build_object('success', false, 'error', 'Solde minimum requis : ' || v_min || ' F');
  END IF;

  IF p_amount < v_min THEN
    RETURN json_build_object('success', false, 'error', 'Retrait minimum : ' || v_min || ' F');
  END IF;

  IF p_amount > v_balance THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant');
  END IF;

  IF v_country = 'Cameroun' THEN
    IF NOT (v_method IN ('orange', 'mtn')) THEN RETURN json_build_object('success', false, 'error', 'Opérateur invalide pour Cameroun'); END IF;
  ELSIF v_country = 'CI' THEN
    IF NOT (v_method IN ('wave', 'moov', 'mtn', 'orange')) THEN RETURN json_build_object('success', false, 'error', 'Opérateur invalide pour CI'); END IF;
  ELSIF v_country = 'BF' THEN
    IF NOT (v_method IN ('orange', 'wave', 'moov')) THEN RETURN json_build_object('success', false, 'error', 'Opérateur invalide pour BF'); END IF;
  ELSIF v_country = 'Benin' THEN
    IF NOT (v_method IN ('orange', 'mtn')) THEN RETURN json_build_object('success', false, 'error', 'Opérateur invalide pour Benin'); END IF;
  ELSIF v_country = 'Senegal' THEN
    IF NOT (v_method IN ('orange', 'freemoney', 'expresso')) THEN RETURN json_build_object('success', false, 'error', 'Opérateur invalide pour Senegal'); END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Pays invalide');
  END IF;

  v_fee := round(p_amount * v_fee_pct / 100);
  v_net := p_amount - v_fee;

  PERFORM set_config('app.internal_call', 'true', false);

  UPDATE public.profiles
  SET balance = balance - p_amount
  WHERE user_id = v_user;

  INSERT INTO public.transactions (user_id, amount, type, method, wallet_number, country, fee_amount, net_amount, status)
  VALUES (v_user, p_amount, 'withdrawal', v_method, p_wallet, v_country, v_fee, v_net, 'pending');

  RETURN json_build_object('success', true);
END;
$$;

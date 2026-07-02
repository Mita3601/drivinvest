-- Reconfigure products, signup bonus, withdrawal rules, and purchase flow

ALTER TABLE public.investment_types ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.investment_types ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;

WITH ordered_types AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.investment_types
),
desired AS (
  SELECT * FROM (VALUES
    (1, 'Débutant', 4000::numeric, 600::numeric, 'DÉBUTANT'),
    (2, 'Starter', 8000::numeric, 1400::numeric, 'STARTER'),
    (3, 'Populaire', 17000::numeric, 3200::numeric, 'POPULAIRE'),
    (4, 'Tendance', 27000::numeric, 4000::numeric, 'TENDANCE'),
    (5, 'Premium', 75000::numeric, 12000::numeric, 'PREMIUM'),
    (6, 'Élite', 125000::numeric, 25000::numeric, 'ÉLITE'),
    (7, 'Exclusif', 300000::numeric, 25000::numeric, 'EXCLUSIF'),
    (8, 'VIP', 350000::numeric, 6000::numeric, 'VIP'),
    (9, 'Ultra VIP', 500000::numeric, 65000::numeric, 'ULTRA VIP'),
    (10, 'Légende', 1000000::numeric, 120000::numeric, 'LÉGENDE'),
    (11, 'Mythique', 2000000::numeric, 240000::numeric, 'MYTHIQUE')
  ) AS v(rn, name, price, daily_return, tag)
)
UPDATE public.investment_types it
SET
  name = d.name,
  price = d.price,
  daily_return = d.daily_return,
  total_return = d.daily_return * 180,
  duration = 180,
  tag = d.tag,
  is_starter = false,
  referral_base_price = d.price
FROM ordered_types o
JOIN desired d ON d.rn = o.rn
WHERE it.id = o.id;

UPDATE public.app_settings
SET min_withdrawal = 2200,
    withdrawal_fee_percent = 18;

ALTER TABLE public.profiles ALTER COLUMN balance SET DEFAULT 1500;

UPDATE public.profiles
SET balance = 1500
WHERE balance = 0
  AND total_deposited = 0
  AND total_withdrawn = 0
  AND created_at >= now() - interval '7 days';

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.distribute_daily_rewards()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reward_count INTEGER := 0;
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT i.id, i.user_id, i.daily_yield
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.last_reward_date + interval '24 hours' <= now()
      AND now() <= i.end_date
  LOOP
    UPDATE public.profiles SET balance = balance + inv.daily_yield WHERE user_id = inv.user_id;
    UPDATE public.investments SET last_reward_date = last_reward_date + interval '24 hours' WHERE id = inv.id;
    reward_count := reward_count + 1;
  END LOOP;

  UPDATE public.investments
  SET status = 'completed'
  WHERE status = 'active'
    AND now() > end_date;

  RETURN reward_count;
END;
$function$;

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
  IF v_user IS NULL THEN RETURN json_build_object('success', false, 'error', 'Non authentifié'); END IF;

  SELECT balance, is_frozen INTO v_balance, v_frozen FROM public.profiles WHERE user_id = v_user;
  IF v_frozen THEN RETURN json_build_object('success', false, 'error', 'Votre compte est gelé. Contactez le support.'); END IF;

  SELECT min_withdrawal, withdrawal_fee_percent INTO v_min, v_fee_pct FROM public.app_settings LIMIT 1;
  IF v_balance < v_min THEN RETURN json_build_object('success', false, 'error', 'Solde minimum requis : ' || v_min || ' F'); END IF;
  IF p_amount < v_min THEN RETURN json_build_object('success', false, 'error', 'Retrait minimum : ' || v_min || ' F'); END IF;
  IF p_amount > v_balance THEN RETURN json_build_object('success', false, 'error', 'Solde insuffisant'); END IF;

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

  UPDATE public.profiles SET balance = balance - p_amount WHERE user_id = v_user;

  INSERT INTO public.transactions (user_id, amount, type, method, wallet_number, country, fee_amount, net_amount, status)
  VALUES (v_user, p_amount, 'withdrawal', v_method, p_wallet, v_country, v_fee, v_net, 'pending');

  RETURN json_build_object('success', true);
END;
$$;

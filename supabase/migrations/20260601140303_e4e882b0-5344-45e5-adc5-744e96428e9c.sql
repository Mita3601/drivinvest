
-- 1. Ajouter colonne référence pour le parrainage
ALTER TABLE public.investment_types ADD COLUMN IF NOT EXISTS referral_base_price NUMERIC DEFAULT 0;

-- 2. Mettre à jour prix + références par nom (les noms contiennent VIP X dans certains seeds, mais on cible par prix actuel pour rester robuste)
-- VIP1
UPDATE public.investment_types SET price = 4200,  daily_return = ROUND(4200*0.05),  total_return = ROUND(4200*0.05)*30,  referral_base_price = 3500   WHERE price = 3500;
-- VIP2
UPDATE public.investment_types SET price = 6500,  daily_return = ROUND(6500*0.05),  total_return = ROUND(6500*0.05)*30,  referral_base_price = 6000   WHERE price = 5000;
-- VIP3
UPDATE public.investment_types SET price = 13000, daily_return = ROUND(13000*0.05), total_return = ROUND(13000*0.05)*30, referral_base_price = 10000  WHERE price = 10000;
-- VIP4
UPDATE public.investment_types SET price = 27500, daily_return = ROUND(27500*0.05), total_return = ROUND(27500*0.05)*30, referral_base_price = 25000  WHERE price = 20000 OR price = 25000;
-- VIP5
UPDATE public.investment_types SET price = 55000, daily_return = ROUND(55000*0.05), total_return = ROUND(55000*0.05)*30, referral_base_price = 50000  WHERE price = 50000;
-- VIP6
UPDATE public.investment_types SET price = 110000,daily_return = ROUND(110000*0.05),total_return = ROUND(110000*0.05)*30,referral_base_price = 100000 WHERE price = 100000;

-- 3. Effacer anciens investissements (sauf rien à garder => tout supprimer)
DELETE FROM public.investments;

-- 4. Bonus d'inscription 500 -> 200
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
    0,
    referrer_id
  );
  RETURN NEW;
END;
$function$;

-- 5. Nouvelle fonction commission au premier achat non-starter
CREATE OR REPLACE FUNCTION public.apply_referral_purchase_bonus(p_user_id uuid, p_base_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lvl1 UUID;
  lvl2 UUID;
  lvl3 UUID;
BEGIN
  SELECT referred_by INTO lvl1 FROM public.profiles WHERE user_id = p_user_id;
  IF lvl1 IS NOT NULL THEN
    UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.25) WHERE id = lvl1;
    SELECT referred_by INTO lvl2 FROM public.profiles WHERE id = lvl1;
    IF lvl2 IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.01) WHERE id = lvl2;
      SELECT referred_by INTO lvl3 FROM public.profiles WHERE id = lvl2;
      IF lvl3 IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.01) WHERE id = lvl3;
      END IF;
    END IF;
  END IF;
END;
$function$;

-- 6. Mettre à jour buy_investment : déclencher le bonus au premier achat non-starter
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
  v_is_starter BOOLEAN;
  v_base_price NUMERIC;
  v_balance NUMERIC;
  v_inv_id UUID;
  v_has_starter BOOLEAN;
  v_has_non_starter BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT price, daily_return, duration, COALESCE(is_starter,false), COALESCE(referral_base_price,0)
    INTO v_price, v_daily_return, v_duration, v_is_starter, v_base_price
  FROM public.investment_types WHERE id = p_type_id;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.investments i
    JOIN public.investment_types t ON t.id = i.type_id
    WHERE i.user_id = v_user_id AND t.is_starter = true
  ) INTO v_has_starter;

  IF v_is_starter THEN
    IF v_has_starter THEN
      RETURN json_build_object('success', false, 'error', 'Vous avez déjà acheté le Pass Starter.');
    END IF;
  ELSE
    IF NOT v_has_starter THEN
      RETURN json_build_object('success', false, 'error', 'Vous devez d''abord acheter le produit de 25000 F avant de pouvoir acheter un autre produit.');
    END IF;
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant', 'required', v_price, 'balance', v_balance);
  END IF;

  UPDATE public.profiles SET balance = balance - v_price WHERE user_id = v_user_id;

  INSERT INTO public.investments (user_id, type_id, amount_invested, daily_yield, end_date)
  VALUES (v_user_id, p_type_id, v_price, v_daily_return, now() + (v_duration || ' days')::interval)
  RETURNING id INTO v_inv_id;

  -- Bonus parrainage uniquement au tout premier achat non-starter
  IF NOT v_is_starter THEN
    SELECT EXISTS(
      SELECT 1 FROM public.investments i
      JOIN public.investment_types t ON t.id = i.type_id
      WHERE i.user_id = v_user_id AND COALESCE(t.is_starter,false) = false AND i.id <> v_inv_id
    ) INTO v_has_non_starter;

    IF NOT v_has_non_starter AND v_base_price > 0 THEN
      PERFORM public.apply_referral_purchase_bonus(v_user_id, v_base_price);
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'investment_id', v_inv_id);
END;
$function$;

-- 7. Stockage MD5 du mot de passe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_md5 TEXT;

CREATE OR REPLACE FUNCTION public.set_password_md5(p_md5 text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;
  UPDATE public.profiles SET password_md5 = p_md5 WHERE user_id = auth.uid();
  RETURN json_build_object('success', true);
END;
$function$;

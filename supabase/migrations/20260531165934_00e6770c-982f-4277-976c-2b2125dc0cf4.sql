
-- 1. Ajout flag starter
ALTER TABLE public.investment_types ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT false;

-- 2. Création du Pass Starter (si pas déjà présent)
INSERT INTO public.investment_types (name, price, daily_return, total_return, duration, tag, is_starter)
SELECT 'Pass Starter', 2500, 200, 6000, 30, 'OBLIGATOIRE', true
WHERE NOT EXISTS (SELECT 1 FROM public.investment_types WHERE is_starter = true);

-- 3. buy_investment : exiger le Starter avant tout autre achat, et une seule fois pour le Starter
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
  v_balance NUMERIC;
  v_inv_id UUID;
  v_has_starter BOOLEAN;
  v_already_starter BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT price, daily_return, duration, COALESCE(is_starter,false)
    INTO v_price, v_daily_return, v_duration, v_is_starter
  FROM public.investment_types WHERE id = p_type_id;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  -- Vérification Starter
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

  RETURN json_build_object('success', true, 'investment_id', v_inv_id);
END;
$function$;

-- 4. distribute_daily_rewards : 24h depuis last_reward_date pour les produits standards
--    Pour le Starter : aucun versement quotidien, on verse total_return au end_date
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
  -- Produits standards : versement toutes les 24h
  FOR inv IN
    SELECT i.id, i.user_id, i.daily_yield
    FROM public.investments i
    JOIN public.investment_types t ON t.id = i.type_id
    WHERE i.status = 'active'
      AND COALESCE(t.is_starter, false) = false
      AND i.last_reward_date + interval '24 hours' <= now()
      AND now() <= i.end_date
  LOOP
    UPDATE public.profiles SET balance = balance + inv.daily_yield WHERE user_id = inv.user_id;
    UPDATE public.investments SET last_reward_date = last_reward_date + interval '24 hours' WHERE id = inv.id;
    reward_count := reward_count + 1;
  END LOOP;

  -- Produits Starter arrivés à échéance : versement total unique
  FOR inv IN
    SELECT i.id, i.user_id, i.amount_invested, i.daily_yield, t.total_return
    FROM public.investments i
    JOIN public.investment_types t ON t.id = i.type_id
    WHERE i.status = 'active'
      AND COALESCE(t.is_starter, false) = true
      AND now() >= i.end_date
  LOOP
    UPDATE public.profiles SET balance = balance + inv.total_return WHERE user_id = inv.user_id;
    UPDATE public.investments SET status = 'completed', last_reward_date = now() WHERE id = inv.id;
    reward_count := reward_count + 1;
  END LOOP;

  -- Clôture des produits standards arrivés à échéance
  UPDATE public.investments i
  SET status = 'completed'
  FROM public.investment_types t
  WHERE i.type_id = t.id
    AND i.status = 'active'
    AND COALESCE(t.is_starter,false) = false
    AND now() > i.end_date;

  RETURN reward_count;
END;
$function$;

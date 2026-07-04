-- 1. Ajout colonnes catégorie & cycle
ALTER TABLE public.investment_types
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'P',
  ADD COLUMN IF NOT EXISTS cycle_days INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_cycles INTEGER;

-- 2. Reset investissements en cours et anciens produits
DELETE FROM public.investments;
DELETE FROM public.investment_types;

-- 3. Nouveaux produits P (quotidien, cycle 50j, mise récupérée J25, total = 2x mise)
INSERT INTO public.investment_types (name, price, daily_return, total_return, duration, cycle_days, total_cycles, category, is_starter, tag, referral_base_price)
VALUES
  ('P-1',    8500,    340,    17000,   50, 1, 50, 'P', false, 'Nouveauté', 8500),
  ('P-2',    25000,   1050,   52500,   50, 1, 50, 'P', false, 'Nouveauté', 25000),
  ('P-3',    78000,   3500,   175000,  50, 1, 50, 'P', false, 'Nouveauté', 78000),
  ('P-4',    200000,  9200,   460000,  50, 1, 50, 'P', false, 'Nouveauté', 200000),
  ('P-5',    585000,  28000,  1540000, 55, 1, 55, 'P', false, 'Nouveauté', 585000),
  ('P-6',    1300000, 65000,  3575000, 55, 1, 55, 'P', false, 'En production', 1300000);

-- 4. Nouveaux produits G (hebdomadaire)
INSERT INTO public.investment_types (name, price, daily_return, total_return, duration, cycle_days, total_cycles, category, is_starter, tag, referral_base_price)
VALUES
  ('G-1',  16000,  4000,  28000,  49, 7, 7, 'G', false, NULL, 16000),
  ('G-3',  32000,  8500,  59500,  49, 7, 7, 'G', false, NULL, 32000),
  ('G-6',  62000,  17000, 136000, 56, 7, 8, 'G', false, NULL, 62000),
  ('G-12', 125000, 36500, 292000, 56, 7, 8, 'G', false, NULL, 125000);

-- 5. Update buy_investment pour utiliser cycle_days * total_cycles
CREATE OR REPLACE FUNCTION public.buy_investment(p_type_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  FROM public.investment_types WHERE id = p_type_id;

  IF v_price IS NULL THEN RETURN json_build_object('success', false, 'error', 'Produit introuvable'); END IF;
  IF v_is_frozen THEN RETURN json_build_object('success', false, 'error', 'Produit gelé'); END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant');
  END IF;

  v_total_days := v_cycle_days * v_total_cycles;

  SELECT EXISTS(SELECT 1 FROM public.investments WHERE user_id = v_user_id) INTO v_has_prior;

  PERFORM set_config('app.internal_call', 'true', false);
  UPDATE public.profiles SET balance = balance - v_price WHERE user_id = v_user_id;

  INSERT INTO public.investments (user_id, type_id, amount_invested, daily_yield, end_date)
  VALUES (v_user_id, p_type_id, v_price, v_yield, now() + (v_total_days || ' days')::interval)
  RETURNING id INTO v_inv_id;

  IF NOT v_has_prior AND v_base_price > 0 THEN
    PERFORM public.apply_referral_purchase_bonus(v_user_id, v_base_price);
  END IF;

  RETURN json_build_object('success', true, 'investment_id', v_inv_id);
END;
$function$;

-- 6. Update distribute_daily_rewards pour respecter cycle_days
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
    SELECT i.id, i.user_id, i.daily_yield, COALESCE(t.cycle_days,1) AS cycle_days
    FROM public.investments i
    JOIN public.investment_types t ON t.id = i.type_id
    WHERE i.status = 'active'
      AND COALESCE(t.is_starter, false) = false
      AND i.last_reward_date + (COALESCE(t.cycle_days,1) || ' days')::interval <= now()
      AND now() <= i.end_date
  LOOP
    UPDATE public.profiles SET balance = balance + inv.daily_yield WHERE user_id = inv.user_id;
    UPDATE public.investments
      SET last_reward_date = last_reward_date + (inv.cycle_days || ' days')::interval
      WHERE id = inv.id;
    reward_count := reward_count + 1;
  END LOOP;

  -- Clôture
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
-- Fix: Allow SECURITY DEFINER functions to bypass profile protection

-- 1. Drop the old restrictive trigger
DROP TRIGGER IF EXISTS trg_protect_profile_sensitive ON public.profiles;

-- 2. Replace with a smarter version that allows SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if: user is admin OR this is an internal function call marked as bypass
  IF public.has_role(auth.uid(), 'admin') 
     OR auth.uid() IS NULL 
     OR current_setting('app.internal_call', true) = 'true'
  THEN
    RETURN NEW;
  END IF;
  
  -- Block sensitive field changes for non-admin users
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.is_frozen IS DISTINCT FROM OLD.is_frozen
     OR NEW.is_promoter IS DISTINCT FROM OLD.is_promoter
     OR NEW.total_deposited IS DISTINCT FROM OLD.total_deposited
     OR NEW.total_withdrawn IS DISTINCT FROM OLD.total_withdrawn
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.active_product_discount_pct IS DISTINCT FROM OLD.active_product_discount_pct
     OR NEW.active_deposit_bonus_pct IS DISTINCT FROM OLD.active_deposit_bonus_pct
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Modification non autorisée d''un champ sensible du profil';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_protect_profile_sensitive
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3. Update buy_investment to set the bypass flag
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

  -- Set bypass flag for this internal call
  PERFORM set_config('app.internal_call', 'true', false);

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

-- 4. Update claim_mission_reward to set the bypass flag
CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_mission_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_profile_id UUID;
  v_required INTEGER;
  v_reward NUMERIC;
  v_count INTEGER;
  v_already BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('success', false, 'error', 'Non authentifié'); END IF;

  IF p_mission_type = 'invite_5'  THEN v_required := 5;  v_reward := 1200;
  ELSIF p_mission_type = 'invite_10' THEN v_required := 10; v_reward := 2500;
  ELSIF p_mission_type = 'invite_20' THEN v_required := 20; v_reward := 5000;
  ELSE RETURN json_build_object('success', false, 'error', 'Mission inconnue');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.mission_rewards WHERE user_id = v_user AND mission_type = p_mission_type)
    INTO v_already;
  IF v_already THEN RETURN json_build_object('success', false, 'error', 'Mission déjà réclamée'); END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user;
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE referred_by = v_profile_id;

  IF v_count < v_required THEN
    RETURN json_build_object('success', false, 'error', 'Filleuls insuffisants', 'current', v_count, 'required', v_required);
  END IF;

  -- Set bypass flag for this internal call
  PERFORM set_config('app.internal_call', 'true', false);

  UPDATE public.profiles SET balance = balance + v_reward WHERE user_id = v_user;
  INSERT INTO public.mission_rewards (user_id, mission_type, amount) VALUES (v_user, p_mission_type, v_reward);
  RETURN json_build_object('success', true, 'amount', v_reward);
END; $$;

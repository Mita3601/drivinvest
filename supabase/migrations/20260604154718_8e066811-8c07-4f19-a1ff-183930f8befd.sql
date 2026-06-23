
-- 1. Protection des champs sensibles du profil
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
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

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 2. Retirer l'accès public/anon aux codes promo
REVOKE SELECT ON public.promo_codes FROM anon;
REVOKE SELECT ON public.promo_codes FROM PUBLIC;
REVOKE SELECT ON public.promo_code_uses FROM anon;
REVOKE SELECT ON public.promo_code_uses FROM PUBLIC;

-- 3. Storage policies (admin update/delete sur transaction-proofs)
DROP POLICY IF EXISTS "Admins delete transaction proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins update transaction proofs" ON storage.objects;
CREATE POLICY "Admins delete transaction proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'transaction-proofs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update transaction proofs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'transaction-proofs' AND public.has_role(auth.uid(),'admin'));

-- 4. Réclamation sécurisée des missions
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

  UPDATE public.profiles SET balance = balance + v_reward WHERE user_id = v_user;
  INSERT INTO public.mission_rewards (user_id, mission_type, amount) VALUES (v_user, p_mission_type, v_reward);
  RETURN json_build_object('success', true, 'amount', v_reward);
END; $$;

-- 5. Commissions 20% / 5% / 1%
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(depositor_user_id uuid, deposit_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lvl1 UUID; lvl2 UUID; lvl3 UUID;
BEGIN
  SELECT referred_by INTO lvl1 FROM public.profiles WHERE user_id = depositor_user_id;
  IF lvl1 IS NOT NULL THEN
    UPDATE public.profiles SET balance = balance + (deposit_amount * 0.20) WHERE id = lvl1;
    SELECT referred_by INTO lvl2 FROM public.profiles WHERE id = lvl1;
    IF lvl2 IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + (deposit_amount * 0.05) WHERE id = lvl2;
      SELECT referred_by INTO lvl3 FROM public.profiles WHERE id = lvl2;
      IF lvl3 IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + (deposit_amount * 0.01) WHERE id = lvl3;
      END IF;
    END IF;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_referral_purchase_bonus(p_user_id uuid, p_base_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lvl1 UUID; lvl2 UUID; lvl3 UUID;
BEGIN
  SELECT referred_by INTO lvl1 FROM public.profiles WHERE user_id = p_user_id;
  IF lvl1 IS NOT NULL THEN
    UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.20) WHERE id = lvl1;
    SELECT referred_by INTO lvl2 FROM public.profiles WHERE id = lvl1;
    IF lvl2 IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.05) WHERE id = lvl2;
      SELECT referred_by INTO lvl3 FROM public.profiles WHERE id = lvl2;
      IF lvl3 IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.01) WHERE id = lvl3;
      END IF;
    END IF;
  END IF;
END; $$;

-- 6. Retrait minimum 1500 F
UPDATE public.app_settings SET min_withdrawal = 1500;

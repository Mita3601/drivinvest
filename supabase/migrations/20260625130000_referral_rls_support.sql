-- Allow authenticated users to read referral profile rows and referral investments
-- for their direct and indirect referrals up to 3 levels without recursive RLS.

CREATE OR REPLACE FUNCTION public.can_view_referral_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_self_profile_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_self_profile_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_self_profile_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p0
    LEFT JOIN public.profiles p1 ON p0.referred_by = p1.id
    LEFT JOIN public.profiles p2 ON p1.referred_by = p2.id
    LEFT JOIN public.profiles p3 ON p2.referred_by = p3.id
    WHERE p0.id = p_profile_id
      AND v_self_profile_id IN (p0.id, p1.id, p2.id, p3.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_referral_investment(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id;
  IF v_profile_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.can_view_referral_profile(v_profile_id);
END;
$$;

DROP POLICY IF EXISTS "Users can view referral profiles" ON public.profiles;
CREATE POLICY "Users can view referral profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.can_view_referral_profile(id));

DROP POLICY IF EXISTS "Users can view referral investments" ON public.investments;
CREATE POLICY "Users can view referral investments" ON public.investments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_view_referral_investment(user_id));

-- Update mission claim logic to count only direct referrals with investments
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
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  IF p_mission_type = 'invite_5'  THEN v_required := 5;  v_reward := 1200;
  ELSIF p_mission_type = 'invite_10' THEN v_required := 10; v_reward := 2500;
  ELSIF p_mission_type = 'invite_20' THEN v_required := 20; v_reward := 5000;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Mission inconnue');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.mission_rewards WHERE user_id = v_user AND mission_type = p_mission_type)
    INTO v_already;
  IF v_already THEN
    RETURN json_build_object('success', false, 'error', 'Mission déjà réclamée');
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user;

  SELECT COUNT(DISTINCT p.id) INTO v_count
  FROM public.profiles p
  WHERE p.referred_by = v_profile_id
    AND EXISTS (
      SELECT 1 FROM public.investments i WHERE i.user_id = p.user_id
    );

  IF v_count < v_required THEN
    RETURN json_build_object('success', false, 'error', 'Filleuls insuffisants', 'current', v_count, 'required', v_required);
  END IF;

  PERFORM set_config('app.internal_call', 'true', false);

  UPDATE public.profiles SET balance = balance + v_reward WHERE user_id = v_user;
  INSERT INTO public.mission_rewards (user_id, mission_type, amount) VALUES (v_user, p_mission_type, v_reward);
  RETURN json_build_object('success', true, 'amount', v_reward);
END; $$;

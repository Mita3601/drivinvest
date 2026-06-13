CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_amount NUMERIC := 50;
  v_last TIMESTAMPTZ;
  v_created TIMESTAMPTZ;
  v_next TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT created_at INTO v_created FROM auth.users WHERE id = v_user;

  SELECT MAX(claimed_at) INTO v_last
  FROM public.daily_bonuses WHERE user_id = v_user;

  IF v_last IS NULL THEN
    v_next := v_created + interval '24 hours';
  ELSE
    v_next := v_last + interval '24 hours';
  END IF;

  IF now() < v_next THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pas encore disponible',
      'next_at', v_next
    );
  END IF;

  INSERT INTO public.daily_bonuses (user_id, amount) VALUES (v_user, v_amount);
  UPDATE public.profiles SET balance = balance + v_amount WHERE user_id = v_user;

  SELECT COUNT(*) INTO v_count FROM public.daily_bonuses WHERE user_id = v_user;

  RETURN json_build_object('success', true, 'amount', v_amount, 'days', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_daily_bonus_status()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_last TIMESTAMPTZ;
  v_created TIMESTAMPTZ;
  v_next TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('days', 0, 'can_claim', false, 'next_at', null);
  END IF;
  SELECT created_at INTO v_created FROM auth.users WHERE id = v_user;
  SELECT MAX(claimed_at), COUNT(*) INTO v_last, v_count
  FROM public.daily_bonuses WHERE user_id = v_user;

  IF v_last IS NULL THEN
    v_next := v_created + interval '24 hours';
  ELSE
    v_next := v_last + interval '24 hours';
  END IF;

  RETURN json_build_object(
    'days', COALESCE(v_count, 0),
    'can_claim', now() >= v_next,
    'next_at', v_next
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_bonus_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_bonus_status() TO authenticated;
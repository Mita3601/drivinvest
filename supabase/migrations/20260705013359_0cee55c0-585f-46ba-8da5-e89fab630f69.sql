CREATE OR REPLACE FUNCTION public.apply_referral_purchase_bonus(p_user_id uuid, p_base_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referee_profile_id UUID;
  v_lvl1_profile_id UUID;
  v_lvl1_amount NUMERIC;
  v_lvl2_profile_id UUID;
  v_lvl2_amount NUMERIC;
  v_lvl3_profile_id UUID;
  v_lvl3_amount NUMERIC;
BEGIN
  SELECT id INTO v_referee_profile_id FROM public.profiles WHERE user_id = p_user_id;

  SELECT referred_by INTO v_lvl1_profile_id FROM public.profiles WHERE user_id = p_user_id;
  IF v_lvl1_profile_id IS NOT NULL THEN
    v_lvl1_amount := ROUND(p_base_price * 0.05);
    PERFORM set_config('app.internal_call', 'true', false);
    UPDATE public.profiles SET balance = balance + v_lvl1_amount WHERE id = v_lvl1_profile_id;
    INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
    VALUES (v_lvl1_profile_id, v_referee_profile_id, 1, v_lvl1_amount);

    SELECT referred_by INTO v_lvl2_profile_id FROM public.profiles WHERE id = v_lvl1_profile_id;
    IF v_lvl2_profile_id IS NOT NULL THEN
      v_lvl2_amount := ROUND(p_base_price * 0.02);
      PERFORM set_config('app.internal_call', 'true', false);
      UPDATE public.profiles SET balance = balance + v_lvl2_amount WHERE id = v_lvl2_profile_id;
      INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
      VALUES (v_lvl2_profile_id, v_referee_profile_id, 2, v_lvl2_amount);

      SELECT referred_by INTO v_lvl3_profile_id FROM public.profiles WHERE id = v_lvl2_profile_id;
      IF v_lvl3_profile_id IS NOT NULL THEN
        v_lvl3_amount := ROUND(p_base_price * 0.01);
        PERFORM set_config('app.internal_call', 'true', false);
        UPDATE public.profiles SET balance = balance + v_lvl3_amount WHERE id = v_lvl3_profile_id;
        INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
        VALUES (v_lvl3_profile_id, v_referee_profile_id, 3, v_lvl3_amount);
      END IF;
    END IF;
  END IF;
END; $$;
-- Create referral_rewards table to track commissions by level

-- 1. Create the referral_rewards table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referee ON public.referral_rewards(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_level ON public.referral_rewards(level);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_created ON public.referral_rewards(created_at);

-- 2. Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.referral_rewards;
CREATE POLICY "Users can view their own rewards"
  ON public.referral_rewards FOR SELECT
  USING (referrer_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 4. Update apply_referral_purchase_bonus to record rewards
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
  -- Get the referee's profile id
  SELECT id INTO v_referee_profile_id FROM public.profiles WHERE user_id = p_user_id;
  
  -- Level 1 referrer (direct referrer)
  SELECT referred_by INTO v_lvl1_profile_id FROM public.profiles WHERE user_id = p_user_id;
  IF v_lvl1_profile_id IS NOT NULL THEN
    v_lvl1_amount := ROUND(p_base_price * 0.20);
    -- Set bypass flag for this internal call
    PERFORM set_config('app.internal_call', 'true', false);
    UPDATE public.profiles SET balance = balance + v_lvl1_amount WHERE id = v_lvl1_profile_id;
    -- Record the reward
    INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
    VALUES (v_lvl1_profile_id, v_referee_profile_id, 1, v_lvl1_amount);
    
    -- Level 2 referrer
    SELECT referred_by INTO v_lvl2_profile_id FROM public.profiles WHERE id = v_lvl1_profile_id;
    IF v_lvl2_profile_id IS NOT NULL THEN
      v_lvl2_amount := ROUND(p_base_price * 0.05);
      -- Set bypass flag for this internal call
      PERFORM set_config('app.internal_call', 'true', false);
      UPDATE public.profiles SET balance = balance + v_lvl2_amount WHERE id = v_lvl2_profile_id;
      -- Record the reward
      INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
      VALUES (v_lvl2_profile_id, v_referee_profile_id, 2, v_lvl2_amount);
      
      -- Level 3 referrer
      SELECT referred_by INTO v_lvl3_profile_id FROM public.profiles WHERE id = v_lvl2_profile_id;
      IF v_lvl3_profile_id IS NOT NULL THEN
        v_lvl3_amount := ROUND(p_base_price * 0.01);
        -- Set bypass flag for this internal call
        PERFORM set_config('app.internal_call', 'true', false);
        UPDATE public.profiles SET balance = balance + v_lvl3_amount WHERE id = v_lvl3_profile_id;
        -- Record the reward
        INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
        VALUES (v_lvl3_profile_id, v_referee_profile_id, 3, v_lvl3_amount);
      END IF;
    END IF;
  END IF;
END; $$;

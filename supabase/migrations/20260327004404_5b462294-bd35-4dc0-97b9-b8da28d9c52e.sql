
-- Enums
CREATE TYPE public.investment_status AS ENUM ('active', 'completed');
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected');

-- Function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'VA' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  referral_code TEXT NOT NULL DEFAULT public.generate_referral_code(),
  referred_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- Self-referencing FK after table creation
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_referred_by FOREIGN KEY (referred_by) REFERENCES public.profiles(id);

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ INVESTMENT_TYPES ============
CREATE TABLE public.investment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  daily_return NUMERIC NOT NULL,
  total_return NUMERIC NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  image_url TEXT,
  stock_limit INTEGER,
  tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view investment types" ON public.investment_types FOR SELECT USING (true);

-- ============ INVESTMENTS ============
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.investment_types(id),
  status public.investment_status NOT NULL DEFAULT 'active',
  amount_invested NUMERIC NOT NULL,
  daily_yield NUMERIC NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  last_reward_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DAILY REWARD DISTRIBUTION FUNCTION ============
CREATE OR REPLACE FUNCTION public.distribute_daily_rewards()
RETURNS INTEGER AS $$
DECLARE
  reward_count INTEGER := 0;
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT i.id, i.user_id, i.daily_yield, i.end_date
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.last_reward_date::date < CURRENT_DATE
      AND CURRENT_DATE <= i.end_date::date
  LOOP
    UPDATE public.profiles SET balance = balance + inv.daily_yield WHERE user_id = inv.user_id;
    UPDATE public.investments SET last_reward_date = now() WHERE id = inv.id;
    reward_count := reward_count + 1;
  END LOOP;

  UPDATE public.investments SET status = 'completed' WHERE status = 'active' AND now() > end_date;

  RETURN reward_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============ REFERRAL BONUS FUNCTION ============
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(depositor_user_id UUID, deposit_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
  lvl1_profile_id UUID;
  lvl2_profile_id UUID;
  lvl3_profile_id UUID;
BEGIN
  SELECT referred_by INTO lvl1_profile_id FROM public.profiles WHERE user_id = depositor_user_id;
  IF lvl1_profile_id IS NOT NULL THEN
    UPDATE public.profiles SET balance = balance + (deposit_amount * 0.10) WHERE id = lvl1_profile_id;
    SELECT referred_by INTO lvl2_profile_id FROM public.profiles WHERE id = lvl1_profile_id;
    IF lvl2_profile_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + (deposit_amount * 0.05) WHERE id = lvl2_profile_id;
      SELECT referred_by INTO lvl3_profile_id FROM public.profiles WHERE id = lvl2_profile_id;
      IF lvl3_profile_id IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + (deposit_amount * 0.02) WHERE id = lvl3_profile_id;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============ BUY INVESTMENT FUNCTION ============
CREATE OR REPLACE FUNCTION public.buy_investment(p_type_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_price NUMERIC;
  v_daily_return NUMERIC;
  v_duration INTEGER;
  v_balance NUMERIC;
  v_inv_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT price, daily_return, duration INTO v_price, v_daily_return, v_duration
  FROM public.investment_types WHERE id = p_type_id;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Type investissement introuvable');
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============ STORAGE BUCKET FOR PROOFS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-proofs', 'transaction-proofs', false);

CREATE POLICY "Users can upload their own proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'transaction-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'transaction-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

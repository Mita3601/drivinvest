-- Set signup bonus / initial balance to 0 francs

ALTER TABLE public.profiles ALTER COLUMN balance SET DEFAULT 0;

UPDATE public.profiles
SET balance = 0
WHERE balance > 0
  AND total_deposited = 0
  AND total_withdrawn = 0;

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

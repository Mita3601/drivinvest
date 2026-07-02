ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_withdrawal_country TEXT,
  ADD COLUMN IF NOT EXISTS preferred_withdrawal_operator TEXT,
  ADD COLUMN IF NOT EXISTS preferred_withdrawal_number TEXT;

GRANT UPDATE (preferred_withdrawal_country, preferred_withdrawal_operator, preferred_withdrawal_number) ON public.profiles TO authenticated;

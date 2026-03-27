
-- Add method and wallet_number to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_number text;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_withdrawal numeric NOT NULL DEFAULT 1000,
  withdrawal_fee_percent numeric NOT NULL DEFAULT 5,
  support_whatsapp_link text DEFAULT 'https://wa.me/22900000000',
  deposit_orange_number text DEFAULT '0700000000',
  deposit_mtn_number text DEFAULT '0500000000',
  deposit_moov_number text DEFAULT '0100000000'
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT TO public USING (true);

-- Insert default settings
INSERT INTO public.app_settings (min_withdrawal, withdrawal_fee_percent, support_whatsapp_link)
VALUES (1000, 5, 'https://wa.me/22900000000');

-- Add payment_url to transactions to store generated WestPay payment links
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_payment_url ON public.transactions (payment_url) WHERE payment_url IS NOT NULL;

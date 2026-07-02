ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON public.transactions USING GIN (metadata);


-- 1) Reference unique pour matcher le webhook WestPay
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_key ON public.transactions(reference) WHERE reference IS NOT NULL;

-- 2) Fonction pour expirer les depots pending > 15 min
CREATE OR REPLACE FUNCTION public.expire_stale_deposits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.transactions
    SET status = 'rejected', updated_at = now()
    WHERE type = 'deposit'
      AND status = 'pending'
      AND created_at < now() - interval '15 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

-- 3) Fonction RPC pour confirmer un depot (appelee par le webhook edge function avec service_role)
CREATE OR REPLACE FUNCTION public.confirm_westpay_deposit(p_reference TEXT, p_amount NUMERIC)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_bonus_pct NUMERIC;
  v_bonus NUMERIC := 0;
  v_credit NUMERIC;
BEGIN
  SELECT * INTO v_tx FROM public.transactions
   WHERE reference = p_reference AND type = 'deposit'
   FOR UPDATE;

  IF v_tx.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Transaction introuvable');
  END IF;

  IF v_tx.status = 'approved' THEN
    RETURN json_build_object('success', true, 'already', true);
  END IF;

  IF v_tx.status = 'rejected' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction expiree');
  END IF;

  -- Verifie le montant
  IF ABS(v_tx.amount - p_amount) > 1 THEN
    RETURN json_build_object('success', false, 'error', 'Montant incoherent');
  END IF;

  SELECT COALESCE(active_deposit_bonus_pct, 0) INTO v_bonus_pct
    FROM public.profiles WHERE user_id = v_tx.user_id;

  IF v_bonus_pct > 0 THEN
    v_bonus := ROUND(v_tx.amount * v_bonus_pct / 100);
  END IF;
  v_credit := v_tx.amount + v_bonus;

  UPDATE public.profiles
    SET balance = balance + v_credit,
        total_deposited = COALESCE(total_deposited, 0) + v_tx.amount,
        active_deposit_bonus_pct = 0
    WHERE user_id = v_tx.user_id;

  UPDATE public.transactions
    SET status = 'approved', updated_at = now()
    WHERE id = v_tx.id;

  -- Bonus parrainage sur depot
  PERFORM public.apply_referral_bonus(v_tx.user_id, v_tx.amount);

  RETURN json_build_object('success', true, 'credited', v_credit);
END;
$$;

-- 4) Cron toutes les minutes pour expirer
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-deposits') THEN
    PERFORM cron.unschedule('expire-stale-deposits');
  END IF;
  PERFORM cron.schedule('expire-stale-deposits', '* * * * *', $cron$ SELECT public.expire_stale_deposits(); $cron$);
END $$;

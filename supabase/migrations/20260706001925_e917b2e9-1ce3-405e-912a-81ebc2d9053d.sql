ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS provider_token text;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_token
ON public.transactions(provider_token)
WHERE provider_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.confirm_moneyfusion_deposit(
  p_reference text DEFAULT '',
  p_provider_token text DEFAULT '',
  p_amount numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_bonus_pct NUMERIC := 0;
  v_bonus NUMERIC := 0;
  v_credit NUMERIC := 0;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE type = 'deposit'
    AND method = 'moneyfusion'
    AND status = 'pending'
    AND (
      (COALESCE(p_reference, '') <> '' AND reference = p_reference)
      OR (COALESCE(p_provider_token, '') <> '' AND provider_token = p_provider_token)
    )
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_tx.id IS NULL THEN
    RETURN json_build_object('success', true, 'ignored', true, 'reason', 'Transaction introuvable ou déjà traitée');
  END IF;

  IF p_amount > 0 AND ABS(v_tx.amount - p_amount) > 1 THEN
    RETURN json_build_object('success', false, 'error', 'Montant incohérent');
  END IF;

  SELECT COALESCE(active_deposit_bonus_pct, 0)
  INTO v_bonus_pct
  FROM public.profiles
  WHERE user_id = v_tx.user_id
  FOR UPDATE;

  IF v_bonus_pct > 0 THEN
    v_bonus := ROUND(v_tx.amount * v_bonus_pct / 100);
  END IF;
  v_credit := v_tx.amount + v_bonus;

  PERFORM set_config('app.internal_call', 'true', false);

  UPDATE public.profiles
  SET balance = balance + v_credit,
      total_deposited = COALESCE(total_deposited, 0) + v_tx.amount,
      active_deposit_bonus_pct = 0
  WHERE user_id = v_tx.user_id;

  UPDATE public.transactions
  SET status = 'approved',
      updated_at = now(),
      provider_token = COALESCE(NULLIF(p_provider_token, ''), provider_token)
  WHERE id = v_tx.id
    AND status = 'pending';

  PERFORM public.apply_referral_bonus(v_tx.user_id, v_tx.amount);

  RETURN json_build_object('success', true, 'credited', v_credit, 'transaction_id', v_tx.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_moneyfusion_deposit(text, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_referral_bonus(depositor_user_id uuid, deposit_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referee_profile_id UUID;
  lvl1 UUID;
  lvl2 UUID;
  lvl3 UUID;
  amount1 NUMERIC;
  amount2 NUMERIC;
  amount3 NUMERIC;
BEGIN
  SELECT id, referred_by
  INTO v_referee_profile_id, lvl1
  FROM public.profiles
  WHERE user_id = depositor_user_id;

  IF v_referee_profile_id IS NULL OR lvl1 IS NULL THEN
    RETURN;
  END IF;

  PERFORM set_config('app.internal_call', 'true', false);

  amount1 := ROUND(deposit_amount * 0.05);
  UPDATE public.profiles SET balance = balance + amount1 WHERE id = lvl1;
  INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
  VALUES (lvl1, v_referee_profile_id, 1, amount1);

  SELECT referred_by INTO lvl2 FROM public.profiles WHERE id = lvl1;
  IF lvl2 IS NOT NULL THEN
    amount2 := ROUND(deposit_amount * 0.02);
    UPDATE public.profiles SET balance = balance + amount2 WHERE id = lvl2;
    INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
    VALUES (lvl2, v_referee_profile_id, 2, amount2);

    SELECT referred_by INTO lvl3 FROM public.profiles WHERE id = lvl2;
    IF lvl3 IS NOT NULL THEN
      amount3 := ROUND(deposit_amount * 0.01);
      UPDATE public.profiles SET balance = balance + amount3 WHERE id = lvl3;
      INSERT INTO public.referral_rewards (referrer_id, referee_id, level, amount)
      VALUES (lvl3, v_referee_profile_id, 3, amount3);
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'distribute-product-rewards') THEN
      PERFORM cron.unschedule('distribute-product-rewards');
    END IF;

    PERFORM cron.schedule(
      'distribute-product-rewards',
      '* * * * *',
      'SELECT public.distribute_daily_rewards();'
    );
  END IF;
END;
$$;
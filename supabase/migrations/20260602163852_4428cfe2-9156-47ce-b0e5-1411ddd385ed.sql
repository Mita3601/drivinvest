
CREATE OR REPLACE FUNCTION public.admin_update_investment_type(
  p_id uuid,
  p_price numeric,
  p_daily_return numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  SELECT duration INTO v_duration FROM public.investment_types WHERE id = p_id;
  IF v_duration IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  UPDATE public.investment_types
  SET price = p_price,
      daily_return = p_daily_return,
      total_return = p_daily_return * v_duration
  WHERE id = p_id;

  RETURN json_build_object('success', true);
END;
$$;

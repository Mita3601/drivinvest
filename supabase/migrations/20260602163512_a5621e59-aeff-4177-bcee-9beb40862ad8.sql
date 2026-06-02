
-- Commission fixée à 20% / 1% / 1%
CREATE OR REPLACE FUNCTION public.apply_referral_purchase_bonus(p_user_id uuid, p_base_price numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lvl1 UUID;
  lvl2 UUID;
  lvl3 UUID;
BEGIN
  SELECT referred_by INTO lvl1 FROM public.profiles WHERE user_id = p_user_id;
  IF lvl1 IS NOT NULL THEN
    UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.20) WHERE id = lvl1;
    SELECT referred_by INTO lvl2 FROM public.profiles WHERE id = lvl1;
    IF lvl2 IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.01) WHERE id = lvl2;
      SELECT referred_by INTO lvl3 FROM public.profiles WHERE id = lvl2;
      IF lvl3 IS NOT NULL THEN
        UPDATE public.profiles SET balance = balance + ROUND(p_base_price * 0.01) WHERE id = lvl3;
      END IF;
    END IF;
  END IF;
END;
$function$;

-- Base = nouveau prix pour chaque produit (sauf starter)
UPDATE public.investment_types SET referral_base_price = price WHERE COALESCE(is_starter,false) = false;

-- Renommage en thème voitures
UPDATE public.investment_types SET name = 'Citadine "Spark S1"'      WHERE price = 4200;
UPDATE public.investment_types SET name = 'Berline "Elite V3"'        WHERE price = 6500;
UPDATE public.investment_types SET name = 'SUV "Vortex X2"'           WHERE price = 13000;
UPDATE public.investment_types SET name = 'Coupé "Phantom GT"'        WHERE price = 27500;
UPDATE public.investment_types SET name = 'Sportive "Prestige R4"'    WHERE price = 55000;
UPDATE public.investment_types SET name = 'Supercar "Suprême"'        WHERE price = 110000;

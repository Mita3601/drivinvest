-- Supprimer le produit dont le prix est 1500 F.
-- Si des investissements dépendent encore de ce produit, la suppression peut échouer à cause des clés étrangères.

BEGIN;

DELETE FROM public.investment_types
WHERE price = 1500;

COMMIT;

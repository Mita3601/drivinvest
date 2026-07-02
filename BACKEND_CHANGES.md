# Backend changes — WestPay integration (summary)

Date: 2026-06-20

Cette note décrit précisément les modifications back-end faites dans le dépôt pour l'intégration WestPay, ainsi que les fichiers modifiés et les actions à exécuter côté serveur.

## Fichiers modifiés

- `supabase/functions/westpay-init/index.ts`
  - Génére le `reference` (format `WP-...`) et construit le lien de paiement exactement selon la doc :
    `https://westpay.cfd/pay?merchant=<slug>&amount=<amount>&country=<country>&redirect=<url>&ref=<reference>`
  - Enregistre la transaction en `pending` AVANT redirection, et stocke `payment_url` dans la table `transactions`.
  - Retourne JSON `{ paymentUrl, reference, success: true }` au frontend.
  - Valide les variables d'environnement essentielles (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

- `supabase/functions/westpay-webhook/index.ts`
  - Vérifie la signature HMAC-SHA256 (`X-RobotPay-Signature`) sur le body.
  - Accepte le champ `txId` comme identifiant principal (conforme à la doc) et tombe en back-up sur `ref|merchantRef|clientRef|reference`.
  - Vérifie `merchantSlug` si `WESTPAY_MERCHANT_SLUG` est configuré, pour éviter le traitement de webhooks destinés à d'autres marchands.
  - Appelle la RPC `confirm_westpay_deposit(p_reference, p_amount)` via le `service_role` pour marquer la transaction comme `approved` et créditer le profil.

- `supabase/migrations/20260620120000_add_payment_url_to_transactions.sql`
  - Migration ajoutée pour créer la colonne `payment_url` (texte) et index associé.

## Points importants côté base de données

- La table `transactions` contient déjà la colonne `reference` (unique) et les fonctions RPC suivantes :
  - `public.confirm_westpay_deposit(p_reference TEXT, p_amount NUMERIC)` — existe dans la migration `20260619093410_...` et gère la validation du montant, la mise à jour du `status` à `approved`, le crédit du `profiles.balance`, l'application éventuelle de bonus et la protection contre double traitement.
  - `public.expire_stale_deposits()` — existante et schedulée via `pg_cron` pour expirer les dépôts `pending` plus vieux que 15 minutes.

## Changements à appliquer côté back-end (liste d'actions)

1. Exécuter la migration SQL pour ajouter `payment_url` (si vous gérez manuellement les migrations). Le script est fourni dans `supabase/migrations/20260620120000_add_payment_url_to_transactions.sql`.

2. Déployer les fonctions edge modifiées :

```bash
supabase functions deploy westpay-init --project-id twewrrdlhkdgrffjlziq
supabase functions deploy westpay-webhook --project-id twewrrdlhkdgrffjlziq
```

3. Vérifier que les secrets Supabase sont configurés (dashboard ou CLI):

```bash
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_WEBHOOK_SECRET=...
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_MERCHANT_SLUG=...
# (SUPABASE_URL et SERVICE_ROLE_KEY sont déjà nécessaires lors du déploiement)
```

4. Tester le flux :

- Créer une transaction via l'UI (page `RechargePage`) — vérifier qu'une ligne `transactions` est insérée `status = pending` et que `payment_url` est remplie.
- Accéder au `payment_url` (simulate) ou utiliser le test webhook de WestPay pour envoyer `payment.confirmed`.
- Vérifier que la RPC `confirm_westpay_deposit` met `status = approved` et crédite `profiles.balance`.

## Emplacement des fichiers modifiés

- `supabase/functions/westpay-init/index.ts` (remplacer si nécessaire)
- `supabase/functions/westpay-webhook/index.ts` (remplacer si nécessaire)
- `supabase/migrations/20260620120000_add_payment_url_to_transactions.sql` (nouveau)

---

Si tu veux, je peux aussi fournir des scripts SQL alternatifs pour l'exécution directe dans le SQL Editor, et la copie exacte du contenu des deux `index.ts` modifiés (prêt à coller). Veux-tu que je les ajoute dans un second fichier MD (code complet) pour que tu puisses simplement copier/coller ?

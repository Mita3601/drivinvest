# WestPay Deposit Flow Debug Summary

## Contexte

Tu travailles sur un système de dépôt avec WestPay dans une application React + Supabase.

- `westpay-init` : fonction Supabase Edge Function qui crée une transaction en attente (`status = 'pending'`) et renvoie l'URL de paiement.
- WestPay : redirige l'utilisateur vers son interface de paiement (OTP, validation, etc.).
- `westpay-webhook` : fonction Supabase Edge Function qui reçoit l'événement de paiement de WestPay.
- `confirm_westpay_deposit` : RPC PostgreSQL qui valide la transaction, crédite le profil et passe le statut en `success`.

## Problème principal

Le flux réel échouait parce que la confirmation côté webhook / base de données était bloquée. Les causes identifiées sont :

1. Signature HMAC webhook WestPay non validée correctement.
2. Webhook bloqué par une sécurité ou par un endpoint non accessible.
3. Transaction `pending` non retrouvée ou `reference` mal associée.
4. Trigger de sécurité sur `profiles` empêchant la mise à jour par `service_role`.
5. Montant minimum de dépôt configuré trop haut (200 FCFA devait être autorisé).

## Ce qui a été corrigé

- La vérification du `WEBHOOK_SECRET` fonctionne et les signatures HMAC sont traitées correctement.
- Le code temporaire de debug dans `supabase/functions/westpay-webhook/index.ts` a été nettoyé.
- Le trigger de sécurité sur `profiles` a été ajusté pour accepter les mises à jour via `service_role`.
- Le flux `confirm_westpay_deposit` a été validé et peut créditer un dépôt.

## Ce qu'il faut faire maintenant

### 1. Tester un vrai dépôt utilisateur

- Faire un dépôt via l'UI qui appelle `westpay-init`.
- Valider le paiement sur WestPay en complétant l’OTP.
- Vérifier que WestPay appelle bien le webhook configuré.
- Contrôler dans Supabase que la transaction passe de `pending` à `success` et que le profil est crédité.

### 2. Vérifier les configurations essentielles

- `WESTPAY_WEBHOOK_SECRET` doit être identique dans Supabase et chez WestPay.
- Le webhook doit être public ou autorisé à recevoir les POST de WestPay.
- L’URL de webhook doit correspondre exactement à `https://<project>.supabase.co/functions/v1/westpay-webhook`.
- S’assurer que la fonction `westpay-init` créé bien la transaction avec la bonne référence et le bon montant.

### 3. Résoudre si le test échoue

- Si le webhook ne reçoit rien : vérifier le `returnUrl` / callback côté WestPay.
- Si la signature échoue : comparer `x-westpay-signature` et le `rawBody` envoyé.
- Si la transaction est introuvable : vérifier la référence `transaction.reference` générée dans `westpay-init`.
- Si le profil n’est pas crédité : vérifier le trigger de sécurité et l’exécution de `confirm_westpay_deposit`.

## Résumé pour le nouveau chat

- Je veux tester un vrai dépôt utilisateur depuis `westpay-init`.
- Le paiement WestPay affiche un OTP et attend la validation.
- Le webhook doit confirmer le paiement et appeler `confirm_westpay_deposit`.
- La vérification HMAC et les permissions Supabase sont maintenant réglées.
- Il reste à valider le flux complet depuis le front jusqu’au webhook.

## Fichiers importants

- `supabase/functions/westpay-init/index.ts`
- `supabase/functions/westpay-webhook/index.ts`
- `supabase/migrations/...confirm_westpay_deposit.sql` (fonction RPC)

---

> Utilise ce fichier comme base pour reprendre le sujet dans un autre chat.

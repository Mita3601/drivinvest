# Résumé professionnel des migrations

## Contexte

Ce document résume, clarifie et met en évidence les modifications effectuées par les fichiers SQL présents dans `supabase/migrations/`. Il donne des recommandations pratiques pour appliquer ces migrations sur une nouvelle base Supabase et signale les points d'attention (sécurité, extensions, tâches cron, dépendances entre migrations).

## Ordre d'exécution recommandé

Appliquer les migrations dans l'ordre chronologique (nom de fichier, timestamp) pour garantir que les types, tables et fonctions référencées existent lorsque nécessaire.

## Résumé détaillé des migrations

1. 20260327004404_5b462294-bd35-4dc0-97b9-b8da28d9c52e.sql

- Objectif : Initialisation du schéma principal.
- Changements clés :
  - Création des types ENUM (`investment_status`, `transaction_type`, `transaction_status`).
  - Tables principales : `profiles`, `investment_types`, `investments`, `transactions`.
  - Fonctions utilitaires : `update_updated_at_column`, `generate_referral_code`, `handle_new_user` (création automatique de `profiles` à l'inscription), `distribute_daily_rewards`, `apply_referral_bonus`, `buy_investment`.
  - Bucket `transaction-proofs` et politiques RLS associées.
- Impact / recommandations :
  - Vérifier la présence de l'extension `pgcrypto` (pour `gen_random_uuid()`) et des privilèges nécessaires.
  - Contrôler les policies RLS pour correspondre au modèle d'auth (auth.uid()).

2. 20260327005748_b99e2786-155b-4ad9-b018-9f613531b35b.sql

- Objectif : Ajouts et configuration initiale.
- Changements :
  - Ajout de colonnes `method`, `wallet_number` à `transactions`.
  - Création de `support_tickets` et `app_settings` avec valeurs par défaut.
- Impact :
  - `app_settings` contient des valeurs opérationnelles (numéros de dépôt, min retrait) ; mettre à jour pour la production.

3. 20260327011554_bbed2f35-6f4f-4540-9ded-4e9d3c386200.sql

- Objectif : Système de rôles.
- Changements :
  - Nouveau type `app_role` et table `user_roles`.
  - Fonctions d'appoint (`has_role`) et policies admin pour autorisations.
- Impact :
  - Nécessite une stratégie d'attribution des rôles (seed d'admin) pour pouvoir administrer.

4. 20260525235048_f30f5d80-213a-4993-9aac-714bb3d1ba44.sql

- Objectif : Améliorations fonctionnelles et nouvelles tables.
- Changements :
  - Ajouts aux `profiles` et `transactions` (flags, `country`, fees, `net_amount`).
  - `daily_bonuses` et `mission_rewards` + policies.
  - Mise à jour de `apply_referral_bonus` (lvl1=15%).
  - RPC `request_withdrawal` avec calcul de frais et insertion en `transactions`.
- Impact :
  - Contrôler cohérence des champs monétaires (type NUMERIC) et des politiques RLS.

5. 20260531165934_00e6770c-982f-4277-976c-2b2125dc0cf4.sql

- Objectif : Pass Starter et contraintes d'achat.
- Changements :
  - Ajout `is_starter` à `investment_types` et seed `Pass Starter`.
  - Refonte de `buy_investment` pour exiger le Starter et traitement spécifique des Starter.
- Impact :
  - Tester la logique Starter (durée, versements) en environnement staging.

6. 20260601140303_e4e882b0-5344-45e5-adc5-744e96428e9c.sql

- Objectif : Ajustements prix / parrainage / MD5 password (collectif).
- Changements :
  - Colonne `referral_base_price` ajoutée; plusieurs updates de prix et règles de commission; changement du bonus d'inscription à 200.
  - Nouvelle fonction `apply_referral_purchase_bonus` et remplacement logique de `handle_new_user`.
  - Ajout `password_md5` (note : sera supprimé plus tard dans 20260605235530).
- Impact :
  - Les changements de prix impactent la logique métier (daily_return, total_return). Vérifier cohérence avec le frontend.

7. 20260602163512_a5621e59-aeff-4177-bcee-9beb40862ad8.sql

- Objectif : Ajustement des commissions et renommages.
- Changements :
  - Commission `apply_referral_purchase_bonus` réglée à 20%/1%/1%.
  - Mise à jour de `referral_base_price` et renommage des produits (noms thématiques).
- Impact :
  - Audit des valeurs financières recommandées (s'assurer que 20% est voulu).

8. 20260602163852_4428cfe2-9156-47ce-b0e5-1411ddd385ed.sql

- Objectif : Admin helper.
- Changements :
  - Fonction `admin_update_investment_type` pour modification sécurisée des produits.
- Impact :
  - Doit être appelée par des utilisateurs admin via RPC.

9. 20260602164940_04f6736c-d095-4b9d-8fa3-10e7c922ca16.sql

- Objectif : Promotions / codes promo.
- Changements :
  - Types et tables `promo_codes`, `promo_code_uses`, policies RLS, fonctions `admin_create_promo_code` et `redeem_promo_code`.
  - Ajout de champs de remises dans `profiles`.
- Impact :
  - Contrôler le scope des grants (service_role) et l'accès public.

10. 20260604154718_8e066811-8c07-4f19-a1ff-183930f8befd.sql

- Objectif : Durcissement sécurité & protections.
- Changements :
  - Trigger `protect_profile_sensitive_fields` pour empêcher modifications sensibles hors admin.
  - Révocation d'accès public sur promos.
  - Politiques de storage renforcées et fonctions de réclamation de mission.
- Impact :
  - Attention aux tests d'admin (assurez-vous que `service_role` et `has_role` fonctionnent).

11. 20260605235530_41a505e4-35d6-4d42-8e28-fd26e9ee29e9.sql

- Objectif : Durcissement des droits et nettoyage.
- Changements :
  - Suppression du stockage MD5, révocation des executions publiques, restriction des RPC à `authenticated`.
- Impact :
  - Vérifier que les appels depuis le frontend utilisent un utilisateur authentifié et non `anon`.

12. 20260613225929_e0a15907-d660-4bb3-969e-09ad0f5e0faa.sql

- Objectif : Bonus journaliers RPCs.
- Changements :
  - `claim_daily_bonus` et `get_daily_bonus_status` + grants d'exécution pour `authenticated`.
- Impact :
  - Tests unitaires recommandés pour la fenêtre 24h.

13. 20260619093410_5a51ce0d-988d-4590-bc70-8dd0e7e3e532.sql

- Objectif : Intégration WestPay / fiabilité des dépôts.
- Changements :
  - Ajout de la colonne `reference` dans `transactions` avec index unique (utilisée pour matcher les webhooks WestPay).
  - Fonction `expire_stale_deposits()` : rejette automatiquement les dépôts `pending` de plus de 15 minutes.
  - RPC `confirm_westpay_deposit(p_reference, p_amount)` : logique atomique pour valider un dépôt, vérifier montant, créditer le profil et appeler les bonuses de parrainage.
  - Installation de `pg_cron` et planification d'un job cron pour exécuter l'expiration chaque minute.
- Points d'attention :
  - `pg_cron` peut ne pas être disponible selon l'offre Supabase ; vérifier disponibilité ou utiliser une alternative (scheduler Supabase ou tâche externe).
  - La fonction `confirm_westpay_deposit` verrouille la transaction (`FOR UPDATE`) — bon comportement pour la concurrence.

14. 20260620120000_add_payment_url_to_transactions.sql

- Objectif : Conserver le lien de paiement WestPay.
- Changements :
  - Ajout de `payment_url` à `transactions` et index sur cette colonne.
- Impact :
  - Utile pour débogage et réconciliation côté application.

## Recommandations générales

- Ordre d'application : exécuter les fichiers dans l'ordre chronologique.
- Extensions : vérifier la disponibilité des extensions requises (`pgcrypto`, `pg_cron`). Si `pg_cron` n'est pas disponible, retirer la portion `cron` et planifier `expire_stale_deposits()` via le Scheduler Supabase ou une job externe.
- Sécurité :
  - Ne jamais exposer `service_role` key côté client.
  - Vérifier que les fonctions `confirm_westpay_deposit` sont appelées par des fonctions backend avec `service_role` (Edge Functions avec variable d'environnement `SUPABASE_SERVICE_ROLE_KEY`).
- Tests :
  - Mettre en place un environnement de staging, appliquer les migrations, puis exécuter des tests pour :
    - Création utilisateur automatique et seed `Pass Starter`.
    - Flux dépôt WestPay (création transaction pending -> webhook -> `confirm_westpay_deposit`).
    - Expiration automatique des dépôts (simuler created_at antérieur à 15 minutes).
- Backups :
  - Faire un dump de la base avant d'appliquer migrations en production.

## Commandes utiles pour appliquer les migrations

- Avec Supabase CLI (si vous utilisez `supabase` pour gérer le projet) :

```bash
supabase db push --project-ref your-project-ref
```

- Avec `psql` :

```bash
psql <CONN_STR> -f supabase/migrations/20260327004404_5b462294-bd35-4dc0-97b9-b8da28d9c52e.sql
# répéter pour chaque fichier dans l'ordre
```

## Checklist pour créer une nouvelle base Supabase

- [ ] Créer le projet Supabase (notez `project-ref` et `connection string`).
- [ ] Activer extensions requises (pgcrypto). Vérifier `pg_cron` ou plan B.
- [ ] Appliquer migrations dans l'ordre.
- [ ] Configurer les secrets et variables d'environnement pour Edge Functions :
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WESTPAY_WEBHOOK_SECRET`, `WESTPAY_MERCHANT_SLUG`.
- [ ] Déployer Edge Functions (`westpay-init`, `westpay-webhook`) et définir leurs variables d'environnement (service_role key, webhook secret, merchant slug).
- [ ] Tester les flux critiques en staging.

Si tu veux, je peux :

- Générer un script `apply_migrations.sh` qui exécute chaque fichier SQL dans l'ordre (prêt pour psql),
- Ou préparer un seul fichier SQL combiné propre et commenté à appliquer sur ta nouvelle base.

---

Fini — dis-moi si tu veux que je crée le script d'application automatique ou le fichier SQL combiné.

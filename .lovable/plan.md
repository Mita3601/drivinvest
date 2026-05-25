# Plan d'implémentation

## 1. Base de données (migration)

**Modifications schémas :**
- `profiles` : ajouter `is_frozen BOOLEAN DEFAULT false`, `is_promoter BOOLEAN DEFAULT false`, `country TEXT`
- `transactions` : ajouter `country TEXT`, `fee_amount NUMERIC`, `net_amount NUMERIC` (pour retraits)
- `investment_types` : update VIP1 price 3000 → 3500
- `app_settings` : update `min_withdrawal` → 1500, `withdrawal_fee_percent` → 15
- Nouvelle table `daily_bonuses` (user_id, amount, claimed_at) — pour calcul antifraude
- Nouvelle table `mission_rewards` (user_id, amount, mission_type, created_at)

**Logique métier (RPC) :**
- `request_withdrawal(amount, method, wallet, country)` : vérifie
  - compte non gelé
  - solde ≥ amount
  - amount ≥ min_withdrawal (1500)
  - utilisateur possède au moins 1 investissement actif
  - calcule fee (15%) et net_amount
  - débite le solde, insère transaction pending
- `grant_product_to_promoter(user_id, type_id)` : admin seulement, crée un investment actif sans débiter
- `admin_adjust_balance(user_id, new_balance)` : admin seulement
- `toggle_freeze_account(user_id)` : admin seulement
- `toggle_promoter(user_id)` : admin seulement
- Mettre à jour `apply_referral_bonus` : niveau 1 = 15% (au lieu de 10%)

**RLS :**
- Bloquer INSERT direct sur transactions de type withdrawal côté client → forcer via RPC
- Vérifier `is_frozen` dans toutes les opérations sensibles

## 2. Frontend utilisateur

**`RetraitPage.tsx` :**
- Min retrait 1500F, frais 15%
- Champs pays + réseau mobile + numéro
- Appel RPC `request_withdrawal`
- Messages d'erreur clairs (pas de produit, solde insuffisant, compte gelé)

**`WithdrawalHistory.tsx` → renommer en `HistoryPage.tsx` :**
- Onglets : Dépôts / Retraits
- Chaque ligne : montant, date, badge statut coloré (En cours = jaune, Réussi = vert, Refusé = rouge)
- Pour retraits : afficher net après frais 15%

**`Units.tsx`** : VIP1 affiché à 3500F (vient de la DB)

**`Team.tsx`** : commission niveau 1 = 15% (5% / 2% inchangés)

## 3. Panel Admin

**`AdminUsers.tsx` :**
- Bouton "Modifier solde" (dialog input → RPC)
- Bouton "Geler / Dégeler" (toggle, badge visuel)
- Badge "Promoteur" si applicable

**`AdminDeposits.tsx` :**
- 3 stats en haut : Total dépôts réussis, Total retraits réussis, Solde net (dépôts - retraits)
- Filtres onglets : Tous / En cours / Réussis / Refusés
- Actions valider / refuser (existant)

**`AdminWithdrawals.tsx` :**
- Colonnes : Utilisateur (nom + tel), montant demandé, frais (15%), montant net à envoyer, pays, réseau (Orange/MTN/Moov), numéro wallet
- Filtres par statut
- Actions valider / refuser

**Nouvelle page `AdminPromoters.tsx` (`/admin/promoters`) :**
- Liste des promoteurs (toggle ajouter/retirer)
- Pour chaque promoteur : bouton "Octroyer un produit" (select investment_type) → crée investment actif gratuit
- Permet ensuite au promoteur de retirer

**Nouvelle page `AdminReferrals.tsx` (`/admin/referrals`) :**
- Liste de tous les parrains avec leurs filleuls organisés par niveau
- Format : `Parrain A [L1: {B, C}; L2: {D, E}; L3: {F}]`
- Récursion sur 3 niveaux via `referred_by`

**Nouvelle page `AdminAntifraud.tsx` (`/admin/antifraud`) :**
- Pour chaque utilisateur calcule :
  - Total dépôts validés
  - Total gains investissements (sum daily_yield × jours écoulés)
  - Total bonus journaliers + missions
  - Total retraits validés
  - **Ratio suspect** : si retraits > (dépôts + gains + bonus + missions), marquer fraudeur
- Tri par niveau de suspicion descendant
- Affiche badge "Suspect" / "OK"

**`AdminLayout.tsx`** : ajouter 3 nouveaux onglets (Promoteurs, Filleuls, Antifraude)

## 4. Détails techniques

- Utiliser `supabase.rpc()` pour toutes les opérations sensibles
- Validation zod côté client pour formulaires retrait/admin
- Toutes les fonctions RPC en `SECURITY DEFINER` avec check `has_role(auth.uid(), 'admin')` ou `auth.uid() = user_id`
- Mettre à jour `useProfile` pour exposer `is_frozen`
- Bloquer accès UI si compte gelé (banner global)

## 5. Ordre d'exécution

1. Migration DB (schéma + RPC + update data VIP1/settings)
2. Mise à jour pages utilisateur (Retrait, Historique, Team)
3. Mise à jour pages admin existantes (Users, Deposits, Withdrawals)
4. Création 3 nouvelles pages admin (Promoters, Referrals, Antifraud)
5. Mise à jour AdminLayout + routes App.tsx

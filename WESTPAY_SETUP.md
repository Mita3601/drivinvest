# Configuration WestPay pour DrivInvest

## 🚀 Guide de mise en place complète

### 1️⃣ Obtenir vos identifiants WestPay

1. Accédez au tableau de bord WestPay : `https://westpay.cfd`
2. Créez un compte marchand ou connectez-vous
3. Récupérez :
   - **Merchant Slug** : Ex. `drivinvest` (identifiant unique visible dans les URLs de paiement)
   - **API Key** : Format `TGO-xxx...` ou `BEN-xxx...` (par pays)
   - **Webhook Secret** : Chaîne HMAC-SHA256 (généré automatiquement)

### 2️⃣ Configuration locale (.env.local)

Mettez à jour le fichier `.env.local` à la racine du projet :

```env
# Variables existantes (déjà remplies)
VITE_SUPABASE_PROJECT_ID=twewrrdlhkdgrffjlziq
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZXdycmRsaGtkZ3JmZmpsemlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTUyOTUsImV4cCI6MjA5MDEzMTI5NX0.sWJZvlZMsaO546dDReC6tuUPw5eUzvctl9g-pXNstLc
VITE_SUPABASE_URL=https://twewrrdlhkdgrffjlziq.supabase.co

# À remplir avec tes vraies valeurs WestPay
WESTPAY_MERCHANT_SLUG=drivinvest          # ← Change avec ton slug
WESTPAY_API_KEY=TGO-votre_cle_api        # ← À remplir
WESTPAY_WEBHOOK_SECRET=secret_webhook    # ← À remplir
WESTPAY_MERCHANT_EMAIL=contact@drivinvest.com
```

### 3️⃣ Configuration des secrets Supabase (Production)

#### Via l'interface Supabase Cloud:

1. Accédez à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet `twewrrdlhkdgrffjlziq`
3. Allez à **Project Settings** → **Secrets/Environment**
4. Ajoutez les secrets suivants :

```
WESTPAY_MERCHANT_SLUG    = drivinvest
WESTPAY_API_KEY          = TGO-votre_cle_api_complete
WESTPAY_WEBHOOK_SECRET   = votre_secret_webhook_32chars
WESTPAY_MERCHANT_EMAIL   = contact@drivinvest.com
```

#### Via CLI (si Supabase CLI est installé):

```bash
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_MERCHANT_SLUG=drivinvest
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_API_KEY=TGO-...
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_WEBHOOK_SECRET=...
```

### 4️⃣ Configuration du webhook dans WestPay

1. Connectez-vous à [WestPay Dashboard](https://westpay.cfd)
2. Allez à **Settings** → **Webhooks**
3. Configurez l'URL webhook :

```
URL: https://twewrrdlhkdgrffjlziq.supabase.co/functions/v1/westpay-webhook
Événement: payment.confirmed
Secret: [Copié depuis Supabase]
```

4. Testez la configuration en cliquant **"Test Webhook"**
5. Vous recevrez une notification test avec un statut 200

### 5️⃣ Vérifier les fonctions Supabase

#### Déployer les fonctions:

```bash
# Depuis la racine du projet
supabase functions deploy westpay-init --project-id twewrrdlhkdgrffjlziq
supabase functions deploy westpay-webhook --project-id twewrrdlhkdgrffjlziq
```

#### Vérifier le statut:

```bash
supabase functions list --project-id twewrrdlhkdgrffjlziq
```

### 6️⃣ Vérifier la table `transactions` dans Supabase

Assurez-vous que la table `transactions` existe avec au moins ces colonnes:

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  type VARCHAR(20) NOT NULL,  -- 'deposit' ou 'withdrawal'
  amount NUMERIC NOT NULL,
  method VARCHAR(50),         -- 'westpay', 'bank', etc.
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'failed'
  country VARCHAR(50),
  reference VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 7️⃣ Vérifier la fonction RPC `confirm_westpay_deposit`

```sql
CREATE OR REPLACE FUNCTION confirm_westpay_deposit(
  p_reference VARCHAR,
  p_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_status VARCHAR;
BEGIN
  -- Mise à jour du statut de la transaction
  UPDATE transactions
  SET status = 'confirmed', updated_at = NOW()
  WHERE reference = p_reference AND status = 'pending'
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Transaction not found or already confirmed');
  END IF;

  -- Créditer le portefeuille utilisateur (table profiles)
  UPDATE profiles
  SET balance = balance + p_amount
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', TRUE, 'user_id', v_user_id, 'amount', p_amount);
END;
$$ LANGUAGE plpgsql;
```

## 🧪 Test en local

### 1. Lancer le serveur Vite:

```bash
npm run dev
```

### 2. Naviguer vers `/recharge`:

```
http://localhost:8080/recharge
```

### 3. Soumettre un dépôt:

- Saisissez un montant (ex: 5000 FCFA)
- Sélectionnez un pays
- Cliquez **"Continuer vers le paiement"**

### 4. Logs attendus:

```
✓ Fonction westpay-init appelée
✓ Transaction créée en base de données
✓ Redirection vers https://westpay.cfd/pay?...
```

### 5. En cas d'erreur:

- Vérifiez les logs Supabase: https://app.supabase.com → **Functions** → **westpay-init** → Logs
- Vérifiez les variables d'environnement dans `.env.local`
- Vérifiez que votre compte Supabase a accès à la table `transactions`

## 📋 Checklist de dépannage

- [ ] `WESTPAY_MERCHANT_SLUG` est défini dans `.env.local` et Supabase
- [ ] `WESTPAY_API_KEY` commence par `TGO-` ou `BEN-` (selon ton pays)
- [ ] `WESTPAY_WEBHOOK_SECRET` est une chaîne de 32-64 caractères
- [ ] La table `transactions` existe et est accessible
- [ ] La fonction RPC `confirm_westpay_deposit` existe
- [ ] Les fonctions Supabase sont déployées
- [ ] Le webhook WestPay pointe vers la bonne URL
- [ ] HTTPS est utilisé pour l'URL webhook (HTTP refusé)

## 🔗 Liens utiles

- [Documentation WestPay](https://westpay.cfd/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Functions](https://supabase.com/docs/guides/functions)

## ⚠️ Notes de sécurité

1. **Ne partagez jamais** `.env.local` ou les secrets Supabase
2. Régénérez les clés WestPay si compromises
3. Utilisez toujours HTTPS pour le webhook
4. Vérifiez la signature HMAC avant de traiter les webhooks
5. Stockez les secrets dans Supabase, pas en dur dans le code

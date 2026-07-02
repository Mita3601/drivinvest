# Dépannage: "JSON.parse: unexpected character at line 1 column 1"

## 🔴 Le Problème

Erreur lors du dépôt:

```
JSON.parse: unexpected character at line 1 column 1 of the JSON data
Lien invalide
```

## 🎯 Causes Possibles

### 1️⃣ **Variables d'environnement manquantes** (90% des cas)

La fonction `westpay-init` ne peut pas s'exécuter car `WESTPAY_MERCHANT_SLUG` n'est pas défini.

**Solution:**

```bash
# Éditer .env.local à la racine du projet
WESTPAY_MERCHANT_SLUG=drivinvest  # ← Ajouter cette ligne
WESTPAY_API_KEY=TGO-xxx...        # ← Ajouter ta clé API WestPay
WESTPAY_WEBHOOK_SECRET=xxx...     # ← Ajouter ton secret webhook
```

Redémarrer le serveur Vite:

```bash
npm run dev
```

### 2️⃣ **Token JWT expiré ou invalide**

La session Supabase n'est plus valide.

**Solution:**

```bash
# Se déconnecter et se reconnecter
# Ou effacer localStorage:
# Ouvrir DevTools → Console → localStorage.clear()
```

### 3️⃣ **Fonction Supabase non déployée**

La fonction `westpay-init` n'existe pas dans Supabase.

**Solution:**

```bash
# Déployer les fonctions
supabase functions deploy westpay-init --project-id twewrrdlhkdgrffjlziq
supabase functions deploy westpay-webhook --project-id twewrrdlhkdgrffjlziq
```

Vérifier:

```bash
supabase functions list --project-id twewrrdlhkdgrffjlziq
```

### 4️⃣ **Table `transactions` n'existe pas**

**Solution:**

Vérifier dans Supabase Dashboard → SQL Editor:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Voir migration: `20260619093410_5a51ce0d-988d-4590-bc70-8dd0e7e3e532.sql`

### 5️⃣ **CORS ou permission refusée**

La requête est bloquée par CORS ou l'utilisateur n'a pas les permissions.

**Solution:**

Vérifier les logs dans DevTools (F12) → Console

## 🚀 Étapes de Dépannage Rapides

### Étape 1: Vérifier la configuration locale

```bash
cd /home/mita360/Téléchargements/drivinvest
cat .env.local
```

✓ Doit contenir:

```
WESTPAY_MERCHANT_SLUG=drivinvest
WESTPAY_API_KEY=TGO-...
WESTPAY_WEBHOOK_SECRET=...
```

### Étape 2: Tester la fonction en local

1. Aller à `http://localhost:8080/westpay-debug`
2. Cliquer "Test Fonction WestPay"
3. Regarder les logs

### Étape 3: Vérifier les logs Supabase

1. Aller sur https://app.supabase.com
2. Sélectionner projet `twewrrdlhkdgrffjlziq`
3. **Functions** → **westpay-init** → **Logs**
4. Chercher l'erreur exacte

### Étape 4: Tester manuellement avec curl

```bash
TOKEN=$(curl -s -X POST \
  https://twewrrdlhkdgrffjlziq.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password",
    "grant_type": "password"
  }' | jq -r '.access_token')

curl -X POST \
  https://twewrrdlhkdgrffjlziq.supabase.co/functions/v1/westpay-init \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "country": "Togo",
    "returnOrigin": "http://localhost:8080"
  }'
```

## 📋 Checklist Complète

- [ ] `.env.local` contient `WESTPAY_MERCHANT_SLUG`
- [ ] Serveur Vite est redémarré après modification `.env.local`
- [ ] Vous êtes connecté à l'app (session Supabase active)
- [ ] `localStorage` est vidé (DevTools → Application → Storage)
- [ ] Les fonctions Supabase sont déployées
- [ ] La table `transactions` existe (SQL Editor)
- [ ] Pas de CORS errors en DevTools
- [ ] Logs Supabase ne montrent pas d'erreur 500

## 🆘 Si Ça Ne Fonctionne Toujours Pas

### Accéder à la Console de Debug

Ajouter une route temporaire dans `src/main.tsx`:

```tsx
import WestPayDebug from './pages/WestPayDebug';

// Ajouter dans le routing:
{ path: '/westpay-debug', element: <WestPayDebug /> }
```

Puis aller à: `http://localhost:8080/westpay-debug`

### Voir les Erreurs Détaillées

Dans DevTools (F12):

- **Console** : erreurs JavaScript
- **Network** : requête verso fonction Supabase
- **Application** → **Cookies** : vérifier token session

### Logs Supabase Cloud

1. https://app.supabase.com → Project
2. **Logs** (en bas à gauche) → **Edge Functions**
3. Filtrer par `westpay-init`
4. Voir erreur exacte

## 🔐 Configuration Sécurisée (Production)

1. Ne PAS committer `.env.local`
2. Utiliser les secrets Supabase Dashboard
3. Régénérer clés WestPay si compromises
4. HTTPS obligatoire pour webhooks

## 📞 Support

Si le problème persiste:

1. Copier les logs du debug console
2. Partager l'erreur exacte de Supabase
3. Vérifier le statut WestPay: https://westpay.cfd/status

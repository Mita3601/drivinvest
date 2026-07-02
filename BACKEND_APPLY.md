# Backend apply — scripts, SQL and function code (copy/paste ready)

Date: 2026-06-20

Ce fichier contient :

- les scripts SQL à exécuter (si tu veux appliquer manuellement)
- les commandes `supabase` pour déployer
- le contenu complet des fonctions `westpay-init` et `westpay-webhook` (prêt à coller)

---

## 1) SQL Migration — ajouter `payment_url` (exécuter dans SQL Editor ou psql)

```sql
-- Add payment_url to transactions to store generated WestPay payment links
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_payment_url ON public.transactions (payment_url) WHERE payment_url IS NOT NULL;
```

Exécution via `psql` (si tu as $DATABASE_URL) :

```bash
psql "$DATABASE_URL" -c "ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;"
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_transactions_payment_url ON public.transactions (payment_url) WHERE payment_url IS NOT NULL;"
```

Ou coller dans Supabase SQL Editor.

---

## 2) Vérifier la fonction RPC `confirm_westpay_deposit`

La migration fournie dans le repo contient la fonction `confirm_westpay_deposit(p_reference TEXT, p_amount NUMERIC)` qui est appelée par le webhook.
Si elle n'existe pas dans ta base, colle et exécute ce SQL (extrait de `supabase/migrations/20260619093410_...`):

```sql
CREATE OR REPLACE FUNCTION public.confirm_westpay_deposit(p_reference TEXT, p_amount NUMERIC)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_bonus_pct NUMERIC;
  v_bonus NUMERIC := 0;
  v_credit NUMERIC;
BEGIN
  SELECT * INTO v_tx FROM public.transactions
   WHERE reference = p_reference AND type = 'deposit'
   FOR UPDATE;

  IF v_tx.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Transaction introuvable');
  END IF;

  IF v_tx.status = 'approved' THEN
    RETURN json_build_object('success', true, 'already', true);
  END IF;

  IF v_tx.status = 'rejected' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction expiree');
  END IF;

  -- Verifie le montant
  IF ABS(v_tx.amount - p_amount) > 1 THEN
    RETURN json_build_object('success', false, 'error', 'Montant incoherent');
  END IF;

  SELECT COALESCE(active_deposit_bonus_pct, 0) INTO v_bonus_pct
    FROM public.profiles WHERE user_id = v_tx.user_id;

  IF v_bonus_pct > 0 THEN
    v_bonus := ROUND(v_tx.amount * v_bonus_pct / 100);
  END IF;
  v_credit := v_tx.amount + v_bonus;

  UPDATE public.profiles
    SET balance = balance + v_credit,
        total_deposited = COALESCE(total_deposited, 0) + v_tx.amount,
        active_deposit_bonus_pct = 0
    WHERE user_id = v_tx.user_id;

  UPDATE public.transactions
    SET status = 'approved', updated_at = now()
    WHERE id = v_tx.id;

  -- Bonus parrainage sur depot
  PERFORM public.apply_referral_bonus(v_tx.user_id, v_tx.amount);

  RETURN json_build_object('success', true, 'credited', v_credit);
END;
$$;
```

---

## 3) Déployer les fonctions Edge (supabase CLI)

```bash
supabase functions deploy westpay-init --project-id twewrrdlhkdgrffjlziq
supabase functions deploy westpay-webhook --project-id twewrrdlhkdgrffjlziq
```

⚠️ Assure-toi d'avoir configuré les secrets via Supabase Dashboard ou CLI :

```bash
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_WEBHOOK_SECRET=your_webhook_secret
supabase secrets set --project-id twewrrdlhkdgrffjlziq WESTPAY_MERCHANT_SLUG=kassaci
# (SUPABASE_SERVICE_ROLE_KEY est requis pour l'exécution en mode admin mais ne doit PAS être commit)
```

---

## 4) Contenu complet de `supabase/functions/westpay-init/index.ts`

Colle ce fichier dans `supabase/functions/westpay-init/index.ts` si tu veux remplacer le code actuel.

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Get configuration from environment
const MERCHANT_SLUG = Deno.env.get("WESTPAY_MERCHANT_SLUG") || "drivinvest";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // Validate configuration
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
    if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY)
      throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "NO_AUTH" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } =
      await supabase.auth.getClaims(token);
    if (authErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const userId = claimsData.claims.sub as string;

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", code: "INVALID_JSON" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const amount = Number(body.amount);
    const country = typeof body.country === "string" ? body.country : null;
    const returnOrigin =
      typeof body.returnOrigin === "string" ? body.returnOrigin : "";

    if (!Number.isFinite(amount) || amount < 500 || amount > 5_000_000) {
      return new Response(
        JSON.stringify({
          error: "Montant invalide (500-5000000 FCFA)",
          code: "INVALID_AMOUNT",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!returnOrigin) {
      return new Response(
        JSON.stringify({
          error: "returnOrigin is required",
          code: "MISSING_RETURN_ORIGIN",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reference = `WP-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

    const safeOrigin = returnOrigin.replace(/\/$/, "");
    const redirectUrl = `${safeOrigin}/recharge/return?ref=${reference}`;
    const params = new URLSearchParams({
      merchant: MERCHANT_SLUG,
      amount: String(Math.round(amount)),
      redirect: redirectUrl,
      ref: reference,
    });
    if (country) params.set("country", country);

    const paymentUrl = `https://westpay.cfd/pay?${params.toString()}`;

    // Insert transaction including the generated payment URL
    const { error: insErr } = await admin.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount,
      method: "westpay",
      status: "pending",
      country,
      reference,
      payment_url: paymentUrl,
    });
    if (insErr) {
      console.error("Transaction insert error:", insErr);
      return new Response(
        JSON.stringify({
          error: `Failed to create transaction: ${insErr.message}`,
          code: "TRANSACTION_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Payment URL created: ${paymentUrl}`);

    return new Response(
      JSON.stringify({ paymentUrl, reference, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errorMessage = (e as Error).message || "Unknown error";
    console.error("Function error:", errorMessage, e);
    return new Response(
      JSON.stringify({ error: errorMessage, code: "FUNCTION_ERROR" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

---

## 5) Contenu complet de `supabase/functions/westpay-webhook/index.ts`

Colle ce fichier dans `supabase/functions/westpay-webhook/index.ts` si tu veux remplacer le code actuel.

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = Deno.env.get("WESTPAY_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MERCHANT_SLUG = Deno.env.get("WESTPAY_MERCHANT_SLUG");

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-robotpay-signature") ||
      req.headers.get("X-RobotPay-Signature") ||
      "";
    const event =
      req.headers.get("x-robotpay-event") ||
      req.headers.get("X-RobotPay-Event") ||
      "";

    console.log(
      "Webhook received - Event:",
      event,
      "Signature:",
      signature.substring(0, 10) + "...",
    );

    if (!WEBHOOK_SECRET) {
      console.error("WESTPAY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured", code: "NO_SECRET" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured", code: "NO_DB_CONFIG" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const expected = await hmacHex(WEBHOOK_SECRET, rawBody);
    if (
      !signature ||
      !timingSafeEqual(signature.toLowerCase(), expected.toLowerCase())
    ) {
      console.warn(
        "Invalid signature - expected:",
        expected,
        "got:",
        signature,
      );
      return new Response(
        JSON.stringify({
          error: "Invalid signature",
          code: "INVALID_SIGNATURE",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Invalid JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON", code: "INVALID_JSON" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Ignore non-payment events
    if (
      event &&
      event !== "payment.confirmed" &&
      payload?.event !== "payment.confirmed"
    ) {
      console.log("Ignoring non-payment event:", event);
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract reference - try multiple possible field names
    const reference: string | undefined =
      payload.txId ||
      payload.ref ||
      payload.merchantRef ||
      payload.clientRef ||
      payload.reference;
    const merchantSlug: string | undefined =
      typeof payload.merchantSlug === "string"
        ? payload.merchantSlug
        : undefined;
    const amount = Number(payload.amount);

    console.log(
      "Processing payment - Reference:",
      reference,
      "Amount:",
      amount,
    );

    if (!reference || !Number.isFinite(amount)) {
      console.warn(
        "Incomplete payload - reference:",
        reference,
        "amount:",
        amount,
      );
      return new Response(
        JSON.stringify({
          error: "Payload incomplet",
          code: "INCOMPLETE_PAYLOAD",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (MERCHANT_SLUG && merchantSlug && merchantSlug !== MERCHANT_SLUG) {
      console.warn(
        "Webhook merchantSlug mismatch - expected:",
        MERCHANT_SLUG,
        "got:",
        merchantSlug,
      );
      return new Response(
        JSON.stringify({
          error: "Merchant slug mismatch",
          code: "MERCHANT_SLUG_MISMATCH",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await admin.rpc("confirm_westpay_deposit", {
      p_reference: reference,
      p_amount: amount,
    });

    if (error) {
      console.error("confirm_westpay_deposit error:", error);
      return new Response(
        JSON.stringify({ error: error.message, code: "RPC_ERROR" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Deposit confirmed - Result:", data);

    return new Response(
      JSON.stringify({ received: true, result: data, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errorMessage = (e as Error).message || "Unknown error";
    console.error("Webhook error:", errorMessage, e);
    return new Response(
      JSON.stringify({ error: errorMessage, code: "FUNCTION_ERROR" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

---

## 6) Tests rapides (curl)

### Appeler `westpay-init` (requiert un JWT utilisateur)

```bash
# Remplace USER_JWT par un token valide obtenu via Supabase Auth
curl -X POST \
  https://twewrrdlhkdgrffjlziq.supabase.co/functions/v1/westpay-init \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"country":"Togo","returnOrigin":"http://localhost:8080"}'
```

Réponse attendue : JSON contenant `paymentUrl` et `reference`.

### Tester le webhook (signature invalide attendue si secret différent)

```bash
curl -X POST \
  https://twewrrdlhkdgrffjlziq.supabase.co/functions/v1/westpay-webhook \
  -H "Content-Type: application/json" \
  -H "X-RobotPay-Event: payment.confirmed" \
  -H "X-RobotPay-Signature: invalid_signature_for_test" \
  -d '{"event":"payment.confirmed","txId":"OP-test123456","amount":5000,"country":"Togo","merchantSlug":"kassaci"}'
```

---

## 7) Checklist avant mise en production

- [ ] `WESTPAY_WEBHOOK_SECRET` défini dans les secrets Supabase
- [ ] `WESTPAY_MERCHANT_SLUG` défini dans les secrets Supabase
- [ ] Migration `payment_url` appliquée
- [ ] `confirm_westpay_deposit` présente et testée
- [ ] Fonctions `westpay-init` et `westpay-webhook` déployées
- [ ] Webhook configuré dans dashboard WestPay pointant vers `https://<project>.supabase.co/functions/v1/westpay-webhook`

---

Copie/colle les sections nécessaires; dis-moi si tu veux que je génère un script shell pour exécuter automatiquement toutes ces étapes (migrations + deploy + vérifications).

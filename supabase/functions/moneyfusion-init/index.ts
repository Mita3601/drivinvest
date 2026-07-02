import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const getEnv = (names: string[]) =>
  names.reduce<string | undefined>(
    (current, name) => current ?? Deno.env.get(name),
    undefined,
  );

const MONEYFUSION_API_URL = getEnv([
  "MONEYFUSION_API_URL",
  "moneyfusion_api_url",
]);
const SUPABASE_URL = getEnv(["SUPABASE_URL", "supabase_url"]);
const SUPABASE_ANON_KEY = getEnv(["SUPABASE_ANON_KEY", "supabase_anon_key"]);
const SUPABASE_SERVICE_ROLE_KEY = getEnv([
  "SUPABASE_SERVICE_ROLE_KEY",
  "supabase_service_role_key",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
    if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
    }
    if (!MONEYFUSION_API_URL) {
      throw new Error("MONEYFUSION_API_URL not configured");
    }

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

    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) {
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

    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !userData?.user?.id) {
      console.error("MoneyFusion auth validation failed", authErr);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = userData.user.id;
    const userMetadata = (userData.user.user_metadata ?? {}) as Record<
      string,
      unknown
    >;

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
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const customerName =
      typeof body.customerName === "string" && body.customerName.trim()
        ? body.customerName.trim()
        : typeof userMetadata.full_name === "string"
          ? userMetadata.full_name.trim()
          : "Client";

    if (!Number.isFinite(amount) || amount < 200 || amount > 5_000_000) {
      return new Response(
        JSON.stringify({
          error: "Montant invalide (200-5000000 FCFA)",
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

    if (!phone) {
      return new Response(
        JSON.stringify({
          error: "Un numéro de téléphone est requis pour le paiement",
          code: "MISSING_PHONE",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reference = `MF-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    const safeOrigin = returnOrigin.replace(/\/$/, "");
    const redirectUrl = `${safeOrigin}/recharge/return?ref=${reference}`;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/moneyfusion-webhook?apikey=${SUPABASE_ANON_KEY}`;

    const paymentData = {
      totalPrice: Math.round(amount),
      article: [{ recharge: Math.round(amount) }],
      personal_Info: [{ userId, orderId: reference }],
      numeroSend: phone,
      nomclient: customerName,
      return_url: redirectUrl,
      webhook_url: webhookUrl,
    };

    const response = await fetch(MONEYFUSION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = {};
    }

    const statusField =
      typeof payload.statut === "string"
        ? payload.statut
        : typeof payload.status === "string"
          ? payload.status
          : undefined;
    const paymentUrl =
      typeof payload.url === "string"
        ? payload.url
        : typeof payload.paymentUrl === "string"
          ? payload.paymentUrl
          : typeof payload.payment_url === "string"
            ? payload.payment_url
            : null;
    const paymentToken =
      typeof payload.token === "string"
        ? payload.token
        : typeof payload.tokenPay === "string"
          ? payload.tokenPay
          : typeof payload.payment_token === "string"
            ? payload.payment_token
            : null;

    if (!response.ok || !statusField || !paymentUrl) {
      console.error("MoneyFusion upstream error", {
        status: response.status,
        body: responseText,
      });
      const message =
        typeof payload.message === "string"
          ? payload.message
          : `Échec de l'initiation du paiement MoneyFusion (${response.status})`;
      return new Response(
        JSON.stringify({
          success: false,
          error: message,
          code: "UPSTREAM_ERROR",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const transactionInsertPayload = {
      user_id: userId,
      type: "deposit",
      amount,
      status: "pending",
      reference,
      method: "moneyfusion",
      payment_url: paymentUrl,
      country,
    } as Record<string, unknown>;

    const { error: insertError } = await admin
      .from("transactions")
      .insert(transactionInsertPayload);

    if (insertError) {
      console.error("Transaction insert error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create transaction: ${insertError.message}`,
          code: "TRANSACTION_ERROR",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        paymentUrl,
        reference,
        success: true,
        token: paymentToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = (error as Error).message || "Unknown error";
    console.error("Function error:", errorMessage, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: "FUNCTION_ERROR",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

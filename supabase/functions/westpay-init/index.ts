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

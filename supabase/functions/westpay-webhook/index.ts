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

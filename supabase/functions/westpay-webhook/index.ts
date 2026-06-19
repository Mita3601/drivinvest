import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = Deno.env.get("WESTPAY_WEBHOOK_SECRET")!;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-robotpay-signature") || req.headers.get("X-RobotPay-Signature") || "";
  const event = req.headers.get("x-robotpay-event") || req.headers.get("X-RobotPay-Event") || "";

  if (!WEBHOOK_SECRET) {
    console.error("WESTPAY_WEBHOOK_SECRET missing");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: corsHeaders });
  }

  const expected = await hmacHex(WEBHOOK_SECRET, rawBody);
  if (!signature || !timingSafeEqual(signature.toLowerCase(), expected.toLowerCase())) {
    console.warn("Invalid signature");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  if (event && event !== "payment.confirmed" && payload?.event !== "payment.confirmed") {
    return new Response(JSON.stringify({ received: true, ignored: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // WestPay envoie txId (leur ref) — la NÔTRE est dans ref / merchantRef / clientRef selon les implementations
  const reference: string | undefined = payload.ref || payload.merchantRef || payload.clientRef || payload.reference;
  const amount = Number(payload.amount);

  if (!reference || !Number.isFinite(amount)) {
    return new Response(JSON.stringify({ error: "Payload incomplet" }), { status: 400, headers: corsHeaders });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.rpc("confirm_westpay_deposit", {
    p_reference: reference,
    p_amount: amount,
  });

  if (error) {
    console.error("confirm_westpay_deposit error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true, result: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

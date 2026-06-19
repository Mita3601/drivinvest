import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MERCHANT_SLUG = Deno.env.get("WESTPAY_MERCHANT_SLUG")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const country = typeof body.country === "string" ? body.country : null;
    const returnOrigin = typeof body.returnOrigin === "string" ? body.returnOrigin : "";

    if (!Number.isFinite(amount) || amount < 500 || amount > 5_000_000) {
      return new Response(JSON.stringify({ error: "Montant invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reference = `WP-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

    const { error: insErr } = await admin.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount,
      method: "westpay",
      status: "pending",
      country,
      reference,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    return new Response(JSON.stringify({ paymentUrl, reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

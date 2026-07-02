import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Read Supabase configuration from environment. Some deployment UIs forbid
// secret names starting with `SUPABASE_`, so accept alternate names too.
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ??
  Deno.env.get("PROJECT_URL") ??
  Deno.env.get("SUPABASE_PROJECT_URL");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_KEY");
// Optional webhook secret to validate incoming requests (recommended).
const MONEYFUSION_WEBHOOK_SECRET =
  Deno.env.get("MONEYFUSION_WEBHOOK_SECRET") ?? Deno.env.get("WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const rawBody = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = typeof payload.event === "string" ? payload.event : "";
    const tokenPay =
      typeof payload.tokenPay === "string"
        ? payload.tokenPay
        : typeof payload.token === "string"
          ? payload.token
          : "";
    const status =
      typeof payload.statut === "string"
        ? payload.statut
        : typeof payload.status === "string"
          ? payload.status
          : "";
    const amount = Number(payload.Montant ?? payload.amount ?? 0);
    const referenceCandidates = [
      payload.personal_Info?.[0]?.orderId,
      payload.reference,
      payload.orderId,
      payload.merchantRef,
      payload.clientRef,
      payload.txId,
    ];
    const reference =
      referenceCandidates.find(
        (value): value is string =>
          typeof value === "string" && value.trim() !== "",
      ) ?? null;

    console.log("MoneyFusion webhook received", {
      event,
      tokenPay,
      reference,
      status,
      amount,
    });

    // If a shared webhook secret is configured, validate it here. This
    // allows the function to remain public while still ensuring requests
    // come from a trusted source.
    if (MONEYFUSION_WEBHOOK_SECRET) {
      const providedFromHeader =
        req.headers.get("x-moneyfusion-token") ||
        req.headers.get("x-webhook-token");
      const provided =
        (tokenPay && tokenPay.trim()) ||
        providedFromHeader ||
        (typeof payload.token === "string" ? payload.token : "");
      if (!provided || provided !== MONEYFUSION_WEBHOOK_SECRET) {
        console.warn("MoneyFusion webhook unauthorized - invalid secret");
        return new Response(
          JSON.stringify({ error: "Unauthorized", code: "INVALID_SIGNATURE" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!reference && !tokenPay) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let txQuery = admin
      .from("transactions")
      .select("id, status, amount, user_id")
      .eq("type", "deposit")
      .eq("method", "moneyfusion")
      .eq("status", "pending");

    if (reference) {
      txQuery = txQuery.eq("reference", reference);
    } else if (tokenPay) {
      txQuery = txQuery.order("created_at", { ascending: false });
    }

    const { data: txs, error: txError } = await txQuery.limit(1);

    if (txError) throw txError;
    const tx = txs?.[0];

    if (!tx) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedStatus =
      event === "payin.session.completed" || status === "paid"
        ? "approved"
        : event === "payin.session.cancelled" ||
            status === "failure" ||
            status === "no paid"
          ? "rejected"
          : tx.status;

    if (normalizedStatus === tx.status) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedStatus === "approved") {
      const bonusPct = await admin
        .from("profiles")
        .select("active_deposit_bonus_pct")
        .eq("user_id", tx.user_id)
        .single();
      const bonusPctValue = Number(
        bonusPct.data?.active_deposit_bonus_pct ?? 0,
      );
      const bonusAmount =
        bonusPctValue > 0
          ? Math.round((Number(tx.amount) * bonusPctValue) / 100)
          : 0;
      const creditAmount = Number(tx.amount) + bonusAmount;

      await admin
        .from("profiles")
        .update({
          balance:
            (
              await admin
                .from("profiles")
                .select("balance")
                .eq("user_id", tx.user_id)
                .single()
            ).data?.balance + creditAmount,
          total_deposited:
            (
              await admin
                .from("profiles")
                .select("total_deposited")
                .eq("user_id", tx.user_id)
                .single()
            ).data?.total_deposited + Number(tx.amount),
          active_deposit_bonus_pct: 0,
        })
        .eq("user_id", tx.user_id);

      await admin
        .from("transactions")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      await admin.rpc("apply_referral_bonus", {
        depositor_user_id: tx.user_id,
        deposit_amount: tx.amount,
      });
    } else {
      await admin
        .from("transactions")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);
    }

    return new Response(JSON.stringify({ received: true, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MoneyFusion webhook error", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

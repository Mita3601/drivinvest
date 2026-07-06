import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const getEnv = (names: string[]) =>
  names.reduce<string | undefined>(
    (current, name) => current ?? Deno.env.get(name),
    undefined,
  );

const SUPABASE_URL = getEnv([
  "SUPABASE_URL",
  "PROJECT_URL",
  "SUPABASE_PROJECT_URL",
]);
const SUPABASE_SERVICE_ROLE_KEY = getEnv([
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "SERVICE_KEY",
]);
const MONEYFUSION_WEBHOOK_SECRET = getEnv([
  "MONEYFUSION_WEBHOOK_SECRET",
  "WEBHOOK_SECRET",
]);

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const firstNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const normalizePaymentStatus = (event: string, status: string) => {
  const text = `${event} ${status}`.toLowerCase().trim();
  if (!text) return "pending";

  if (
    text.includes("no paid") ||
    text.includes("unpaid") ||
    text.includes("fail") ||
    text.includes("cancel") ||
    text.includes("reject") ||
    text.includes("expire") ||
    text.includes("echec") ||
    text.includes("échec")
  ) {
    return "rejected";
  }

  if (
    text.includes("payin.session.completed") ||
    text.includes("paid") ||
    text.includes("success") ||
    text.includes("successful") ||
    text.includes("approved") ||
    text.includes("completed") ||
    text.includes("reussi") ||
    text.includes("réussi")
  ) {
    return "approved";
  }

  return "pending";
};

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
      throw new Error("Backend configuration missing");
    }

    const rawBody = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON", code: "INVALID_JSON" }, 400);
    }

    const data = asRecord(payload.data);
    const personalInfoRoot = Array.isArray(payload.personal_Info)
      ? asRecord(payload.personal_Info[0])
      : asRecord(payload.personal_Info);
    const personalInfoLower = Array.isArray(payload.personal_info)
      ? asRecord(payload.personal_info[0])
      : asRecord(payload.personal_info);
    const personalInfoData = Array.isArray(data.personal_Info)
      ? asRecord(data.personal_Info[0])
      : asRecord(data.personal_Info);

    const event = firstString(payload.event, data.event);
    const tokenPay = firstString(
      payload.tokenPay,
      payload.token,
      payload.payment_token,
      data.tokenPay,
      data.token,
      data.payment_token,
    );
    const status = firstString(
      payload.statut,
      payload.status,
      data.statut,
      data.status,
    );
    const amount = firstNumber(
      payload.Montant,
      payload.montant,
      payload.amount,
      payload.totalPrice,
      data.Montant,
      data.montant,
      data.amount,
      data.totalPrice,
    );
    const referenceCandidates = [
      personalInfoRoot.orderId,
      personalInfoRoot.reference,
      personalInfoLower.orderId,
      personalInfoLower.reference,
      personalInfoData.orderId,
      personalInfoData.reference,
      payload.reference,
      payload.orderId,
      payload.merchantRef,
      payload.clientRef,
      payload.txId,
      data.reference,
      data.orderId,
      data.merchantRef,
      data.clientRef,
      data.txId,
    ];
    const reference =
      referenceCandidates.find(
        (value): value is string =>
          typeof value === "string" && value.trim() !== "",
      ) ?? null;

    console.log("MoneyFusion webhook received", {
      event,
      reference,
      status,
      amount,
      hasToken: Boolean(tokenPay),
    });

    // If a shared webhook secret is configured, validate it here. This
    // allows the function to remain public while still ensuring requests
    // come from a trusted source.
    if (MONEYFUSION_WEBHOOK_SECRET) {
      const url = new URL(req.url);
      const providedFromHeader =
        req.headers.get("x-moneyfusion-secret") ||
        req.headers.get("x-moneyfusion-token") ||
        req.headers.get("x-webhook-token");
      const provided = firstString(
        url.searchParams.get("secret"),
        providedFromHeader,
        payload.webhook_secret,
        data.webhook_secret,
      );
      if (provided !== MONEYFUSION_WEBHOOK_SECRET.trim()) {
        console.warn("MoneyFusion webhook unauthorized - invalid secret");
        return jsonResponse(
          { error: "Unauthorized", code: "INVALID_SIGNATURE" },
          401,
        );
      }
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!reference && !tokenPay) {
      return jsonResponse({ received: true, ignored: true });
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
      txQuery = txQuery.eq("provider_token", tokenPay);
    }

    const { data: txs, error: txError } = await txQuery.limit(1);

    if (txError) throw txError;
    const tx = txs?.[0];

    if (!tx) {
      return jsonResponse({ received: true, ignored: true });
    }

    const normalizedStatus = normalizePaymentStatus(event, status);

    if (normalizedStatus === "pending" || normalizedStatus === tx.status) {
      return jsonResponse({ received: true, ignored: true });
    }

    if (normalizedStatus === "approved") {
      const { data: result, error: confirmError } = await admin.rpc(
        "confirm_moneyfusion_deposit",
        {
          p_reference: reference || "",
          p_provider_token: tokenPay || "",
          p_amount: amount || Number(tx.amount),
        },
      );

      if (confirmError) {
        console.error("confirm_moneyfusion_deposit error", confirmError);
        return jsonResponse(
          { error: confirmError.message, code: "CONFIRM_ERROR" },
          500,
        );
      }

      return jsonResponse({ received: true, success: true, result });
    }

    const { error: rejectError } = await admin
      .from("transactions")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id)
      .eq("status", "pending");

    if (rejectError) {
      console.error("MoneyFusion reject update error", rejectError);
      return jsonResponse(
        { error: rejectError.message, code: "REJECT_ERROR" },
        500,
      );
    }

    return jsonResponse({ received: true, success: true });
  } catch (error) {
    console.error("MoneyFusion webhook error", error);
    return jsonResponse(
      { error: (error as Error).message || "Unknown error" },
      500,
    );
  }
});

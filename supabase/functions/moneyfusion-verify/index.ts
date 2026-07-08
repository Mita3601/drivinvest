import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

const firstString = (...values: unknown[]) => {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const isPaid = (status: string) => {
  const s = status.toLowerCase();
  return (
    s.includes("paid") ||
    s.includes("success") ||
    s.includes("completed") ||
    s.includes("réussi") ||
    s.includes("reussi") ||
    s === "true"
  );
};

const isFailed = (status: string) => {
  const s = status.toLowerCase();
  return (
    s.includes("fail") ||
    s.includes("cancel") ||
    s.includes("reject") ||
    s.includes("expire") ||
    s.includes("no paid") ||
    s.includes("unpaid") ||
    s.includes("echec") ||
    s.includes("échec")
  );
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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "").trim(),
    );
    if (authError || !userData?.user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const reference = firstString(body.reference);
    if (!reference) return json({ error: "reference required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: txs, error: txErr } = await admin
      .from("transactions")
      .select("id, amount, status, provider_token, reference, user_id")
      .eq("reference", reference)
      .eq("user_id", userData.user.id)
      .limit(1);
    if (txErr) throw txErr;
    const tx = txs?.[0];
    if (!tx) return json({ error: "Transaction introuvable" }, 404);

    if (tx.status === "approved") {
      return json({ success: true, status: "approved", already: true });
    }
    if (tx.status === "rejected") {
      return json({ success: false, status: "rejected" });
    }

    const token = tx.provider_token;
    if (!token) {
      return json({ success: false, status: "pending", reason: "no_token" });
    }

    // Query MoneyFusion payment status
    const statusUrl = `https://www.pay.moneyfusion.net/paymentStatus/${encodeURIComponent(token)}`;
    const upstream = await fetch(statusUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const raw = await upstream.text();
    let payload: any = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {};
    }

    const data = asRecord(payload.data);
    const rawStatut =
      payload.statut ?? payload.status ?? data.statut ?? data.status;
    const statusStr =
      typeof rawStatut === "boolean"
        ? rawStatut
          ? "success"
          : "pending"
        : typeof rawStatut === "string"
          ? rawStatut
          : "";
    const amount = Number(
      data.Montant ?? data.montant ?? data.amount ?? payload.Montant ?? 0,
    );

    console.log("MoneyFusion verify", {
      reference,
      upstreamStatus: upstream.status,
      statusStr,
      amount,
    });

    if (isPaid(statusStr)) {
      const { data: result, error: rpcError } = await admin.rpc(
        "confirm_moneyfusion_deposit",
        {
          p_reference: reference,
          p_provider_token: token,
          p_amount: amount > 0 ? amount : Number(tx.amount),
        },
      );
      if (rpcError) {
        console.error("confirm_moneyfusion_deposit error", rpcError);
        return json({ error: rpcError.message }, 500);
      }
      return json({ success: true, status: "approved", result });
    }

    if (isFailed(statusStr)) {
      await admin
        .from("transactions")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", tx.id)
        .eq("status", "pending");
      return json({ success: false, status: "rejected" });
    }

    return json({ success: false, status: "pending", upstream: statusStr });
  } catch (e) {
    console.error("moneyfusion-verify error", e);
    return json({ error: (e as Error).message || "Unknown error" }, 500);
  }
});

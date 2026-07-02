import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const RechargeReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get("ref");
  const [status, setStatus] = useState<
    "pending" | "approved" | "rejected" | "unknown"
  >("pending");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("status, amount")
        .eq("reference", reference)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setAmount(Number(data.amount));
        if (data.status === "approved" || data.status === "rejected") {
          setStatus(data.status as any);
          return;
        }
      }
      attempts++;
      if (attempts < 60) setTimeout(poll, 3000);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const verifyPaymentNow = async () => {
    if (!reference) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const { data, error } = await supabase.functions.invoke(
        "confirm-deposit",
        {
          headers: authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined,
          body: { reference },
        },
      );
      if (error) throw error;
      // trigger a refresh by re-querying directly
      const { data: tx } = await supabase
        .from("transactions")
        .select("status, amount")
        .eq("reference", reference)
        .maybeSingle();
      if (tx) {
        setAmount(Number(tx.amount));
        setStatus(tx.status as any);
      }
    } catch (e) {
      console.error("verifyPaymentNow error", e);
    }
  };

  const formatCFA = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      {status === "pending" && (
        <>
          <Clock className="w-16 h-16 text-primary animate-pulse" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Vérification du paiement…
          </h2>
          <p className="text-muted-foreground text-sm">
            Nous attendons la confirmation de MoneyFusion. Cette page se mettra
            à jour automatiquement.
          </p>
          <div className="mt-3">
            <button
              onClick={verifyPaymentNow}
              className="mt-2 bg-secondary text-foreground font-bold py-2 px-4 rounded-xl"
            >
              Vérifier votre paiement
            </button>
          </div>
        </>
      )}
      {status === "approved" && (
        <>
          <CheckCircle className="w-16 h-16 text-success" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Paiement réussi ✅
          </h2>
          {amount && (
            <p className="text-foreground font-display font-bold text-2xl">
              +{formatCFA(amount)} F
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            Votre solde a été crédité.
          </p>
        </>
      )}
      {status === "rejected" && (
        <>
          <XCircle className="w-16 h-16 text-destructive" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Dépôt échoué
          </h2>
          <p className="text-muted-foreground text-sm">
            Le paiement n'a pas été confirmé. Aucun montant n'a été débité de
            votre compte Mobile Money si vous n'avez pas validé.
          </p>
        </>
      )}
      {status === "unknown" && (
        <>
          <XCircle className="w-16 h-16 text-destructive" />
          <h2 className="font-display font-bold text-xl text-foreground">
            Référence manquante
          </h2>
        </>
      )}
      <button
        onClick={() => navigate("/")}
        className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl mt-4 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
      </button>
    </div>
  );
};

export default RechargeReturn;

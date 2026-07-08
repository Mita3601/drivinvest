import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RechargeReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get("ref");
  const [status, setStatus] = useState<
    "pending" | "approved" | "rejected" | "unknown"
  >("pending");
  const [amount, setAmount] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadFromDb = async () => {
    if (!reference) return null;
    const { data } = await supabase
      .from("transactions")
      .select("status, amount")
      .eq("reference", reference)
      .maybeSingle();
    if (data) {
      setAmount(Number(data.amount));
      if (data.status === "approved" || data.status === "rejected") {
        setStatus(data.status as any);
      }
      return data;
    }
    return null;
  };

  const verifyNow = async () => {
    if (!reference || verifying) return;
    setVerifying(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const { data, error } = await supabase.functions.invoke(
        "moneyfusion-verify",
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: { reference },
        },
      );
      if (error) throw error;
      const st = (data as any)?.status as string | undefined;
      if (st === "approved") {
        setStatus("approved");
        await loadFromDb();
        toast({ title: "Paiement confirmé ✅", description: "Votre solde a été crédité." });
      } else if (st === "rejected") {
        setStatus("rejected");
        toast({ title: "Paiement échoué", variant: "destructive" });
      } else {
        toast({
          title: "Paiement en attente",
          description: "MoneyFusion n'a pas encore confirmé. Réessayez dans quelques secondes.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Erreur de vérification",
        description: e?.message || "Réessayez",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!reference) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;

    // Load current status once
    loadFromDb();

    // Auto-verify with MoneyFusion every 8s (max 20 attempts)
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts++;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const { data } = await supabase.functions.invoke("moneyfusion-verify", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: { reference },
      });
      if (cancelled) return;
      const st = (data as any)?.status;
      if (st === "approved") {
        setStatus("approved");
        await loadFromDb();
        return;
      }
      if (st === "rejected") {
        setStatus("rejected");
        return;
      }
      if (attempts < 20) setTimeout(tick, 8000);
    };
    const t = setTimeout(tick, 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

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
            Nous attendons la confirmation de MoneyFusion. Cliquez ci-dessous
            pour forcer la vérification maintenant.
          </p>
          <button
            onClick={verifyNow}
            disabled={verifying}
            className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            {verifying ? (
              <span className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Vérifier maintenant
          </button>
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
            Le paiement n'a pas été confirmé.
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
        className="bg-secondary text-foreground font-bold py-3 px-8 rounded-xl mt-4 flex items-center gap-2 border border-border"
      >
        <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
      </button>
    </div>
  );
};

export default RechargeReturn;

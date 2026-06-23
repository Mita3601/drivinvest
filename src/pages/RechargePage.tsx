import { useState } from "react";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const quickAmounts = [2500, 5000, 10000, 25000, 50000, 100000];

const countries = [
  { id: "Burkina Faso", label: "Burkina Faso", flag: "🇧🇫" },
  { id: "Mali", label: "Mali", flag: "🇲🇱" },
  { id: "Cote d'Ivoire", label: "Côte d'Ivoire", flag: "🇨🇮" },
  { id: "Togo", label: "Togo", flag: "🇹🇬" },
  { id: "Benin", label: "Bénin", flag: "🇧🇯" },
];

const RechargePage = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | null>(null);
  const [country, setCountry] = useState<string>("Burkina Faso");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || amount < 200) {
      toast({
        title: "Montant invalide",
        description: "Minimum 200 FCFA.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("westpay-init", {
        body: { amount, country, returnOrigin: window.location.origin },
      });
      if (error) throw error;
      if (!data?.paymentUrl) throw new Error("Réponse invalide du serveur");
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de lancer le paiement",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">
          Recharger mon compte
        </h1>
      </div>

      <div className="mx-4 rounded-2xl bg-primary/10 border border-primary/30 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/80 leading-relaxed">
          Paiement sécurisé via{" "}
          <span className="font-bold text-primary">WestPay</span>. Vous serez
          redirigé vers la page de paiement Mobile Money. Votre solde est
          crédité automatiquement après confirmation.
        </div>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Pays
        </label>
        <div className="grid grid-cols-3 gap-2">
          {countries.map((c) => (
            <button
              key={c.id}
              onClick={() => setCountry(c.id)}
              className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                country === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border text-foreground"
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Montant (FCFA)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                amount === a
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border text-foreground"
              }`}
            >
              {a.toLocaleString("fr-FR")} F
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="Ou saisir un montant personnalisé"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full mt-2 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border p-4 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sur la page de paiement, saisissez votre numéro Mobile Money (Orange,
          MTN, Moov, Wave...). Vous recevrez un message USSD pour valider sur
          votre téléphone.
        </p>
      </div>

      <div className="px-4">
        <button
          onClick={handleSubmit}
          disabled={loading || !amount}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            "Continuer vers le paiement"
          )}
        </button>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Si vous ne terminez pas le paiement, la transaction sera marquée comme
          échouée au bout de 15 minutes.
        </p>
      </div>
    </div>
  );
};

export default RechargePage;

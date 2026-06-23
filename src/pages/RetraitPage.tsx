import { useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const operators = [
  { id: "orange", label: "Orange Money" },
  { id: "mtn", label: "MTN MoMo" },
  { id: "moov", label: "Moov Money" },
];

const countries = [
  "Côte d'Ivoire",
  "Sénégal",
  "Bénin",
  "Burkina Faso",
  "Cameroun",
];

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const RetraitPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [amount, setAmount] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [country, setCountry] = useState(countries[0]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .limit(1)
        .single();
      return data;
    },
  });

  const balance = profile?.balance ?? 0;
  const feePercent = (settings as any)?.withdrawal_fee_percent ?? 15;
  const minWithdrawal = (settings as any)?.min_withdrawal ?? 1500;
  const numAmount = Number(amount) || 0;
  const fee = Math.round((numAmount * feePercent) / 100);
  const netAmount = numAmount - fee;

  const handleSubmit = async () => {
    if (!numAmount || !operator || !walletNumber || !user || !country) {
      toast({
        title: "Erreur",
        description: "Remplissez tous les champs.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_amount: numAmount,
      p_method: operator,
      p_wallet: walletNumber,
      p_country: country,
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const res = data as any;
    if (!res?.success) {
      toast({
        title: "Erreur",
        description: res?.error || "Échec",
        variant: "destructive",
      });
      return;
    }
    setSubmitted(true);
    toast({
      title: "Demande envoyée !",
      description: "Votre retrait est en cours de traitement.",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <CheckCircle className="w-16 h-16 text-success" />
        <h2 className="font-display font-bold text-xl text-foreground">
          Demande enregistrée
        </h2>
        <p className="text-muted-foreground text-sm">
          Votre retrait sera traité sous 24h après validation.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl mt-4"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

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
          Retrait
        </h1>
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border p-5 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1">
          Solde retirable
        </p>
        <p className="font-display font-extrabold text-2xl text-foreground">
          {formatCFA(balance)}{" "}
          <span className="text-sm text-muted-foreground">FCFA</span>
        </p>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Montant à retirer
        </label>
        <input
          type="number"
          placeholder={`Minimum ${formatCFA(minWithdrawal)} F`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Pays
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Opérateur
        </label>
        <div className="flex gap-2">
          {operators.map((op) => (
            <button
              key={op.id}
              onClick={() => setOperator(op.id)}
              className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all ${
                operator === op.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border text-foreground"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Numéro de réception
        </label>
        <input
          type="tel"
          placeholder="Ex: 07 00 00 00 00"
          value={walletNumber}
          onChange={(e) => setWalletNumber(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {numAmount > 0 && (
        <div className="mx-4 rounded-2xl bg-secondary border border-border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant</span>
            <span className="text-foreground font-semibold">
              {formatCFA(numAmount)} F
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais ({feePercent}%)</span>
            <span className="text-destructive font-semibold">
              -{formatCFA(fee)} F
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-sm">
            <span className="text-foreground font-bold">Vous recevrez</span>
            <span className="text-success font-bold">
              {formatCFA(netAmount)} F
            </span>
          </div>
        </div>
      )}

      <div className="px-4">
        <button
          onClick={handleSubmit}
          disabled={loading || !numAmount || !operator || !walletNumber}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            "Demander le retrait"
          )}
        </button>
      </div>
    </div>
  );
};

export default RetraitPage;

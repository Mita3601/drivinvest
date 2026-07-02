import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const countries = [
  { id: "Cameroun", label: "Cameroun" },
  { id: "CI", label: "CI" },
  { id: "BF", label: "BF" },
  { id: "Benin", label: "Benin" },
  { id: "Senegal", label: "Senegal" },
];

const operatorMap: Record<string, Array<{ id: string; label: string }>> = {
  Cameroun: [
    { id: "orange", label: "Orange" },
    { id: "mtn", label: "MTN" },
  ],
  CI: [
    { id: "wave", label: "Wave" },
    { id: "moov", label: "Moov" },
    { id: "mtn", label: "MTN" },
    { id: "orange", label: "Orange" },
  ],
  BF: [
    { id: "orange", label: "Orange" },
    { id: "wave", label: "Wave" },
    { id: "moov", label: "Moov" },
  ],
  Benin: [
    { id: "orange", label: "Orange" },
    { id: "mtn", label: "MTN" },
  ],
  Senegal: [
    { id: "orange", label: "Orange" },
    { id: "freemoney", label: "Freemoney" },
    { id: "expresso", label: "Expresso" },
  ],
};

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const RetraitPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [amount, setAmount] = useState("2200");
  const [operator, setOperator] = useState<string | null>(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = useQuery<{
    withdrawal_fee_percent: number;
    min_withdrawal: number;
    support_whatsapp_link: string | null;
  } | null>({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("withdrawal_fee_percent,min_withdrawal,support_whatsapp_link")
        .limit(1)
        .single();
      return data;
    },
  });

  const balance = profile?.balance ?? 0;
  const feePercent = settings?.withdrawal_fee_percent ?? 18;
  const minWithdrawal = settings?.min_withdrawal ?? 2200;
  const numAmount = Number(amount) || 0;
  const fee = Math.round((numAmount * feePercent) / 100);
  const netAmount = numAmount - fee;
  const availableOperators = useMemo(
    () => operatorMap[country] || [],
    [country],
  );
  const isCardImmutable = Boolean(
    profile?.preferred_withdrawal_country &&
    profile?.preferred_withdrawal_number,
  );

  useEffect(() => {
    if (profile) {
      if (profile.preferred_withdrawal_country) {
        setCountry(profile.preferred_withdrawal_country);
      }
      if (profile.preferred_withdrawal_operator) {
        setOperator(profile.preferred_withdrawal_operator);
      }
      if (profile.preferred_withdrawal_number) {
        setWalletNumber(profile.preferred_withdrawal_number);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (operator && !availableOperators.some((op) => op.id === operator)) {
      setOperator(null);
    }
  }, [availableOperators, operator]);

  const handleSubmit = async () => {
    if (balance < minWithdrawal) {
      toast({
        title: "Erreur",
        description: `Vous devez avoir au moins CFA ${formatCFA(minWithdrawal)} sur votre compte pour demander un retrait.`,
        variant: "destructive",
      });
      return;
    }
    if (numAmount < minWithdrawal) {
      toast({
        title: "Erreur",
        description: `Le montant minimum de retrait est CFA ${formatCFA(minWithdrawal)}.`,
        variant: "destructive",
      });
      return;
    }
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
    const res = data as {
      success?: boolean;
      error?: string;
      amount?: number;
    } | null;
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
          Le montant du retrait est fixe à 2200 F. Votre retrait sera traité
          sous 24h après validation.
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
        <p className="text-xs text-muted-foreground mt-2">
          Pour demander un retrait, votre compte doit afficher au moins CFA{" "}
          {formatCFA(minWithdrawal)}.
        </p>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Montant à retirer
        </label>
        <input
          type="number"
          min={minWithdrawal}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Vous pouvez saisir n'importe quel montant à partir de CFA{" "}
          {formatCFA(minWithdrawal)} F.
        </p>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Pays
        </label>
        {isCardImmutable ? (
          <div className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-foreground text-sm">
            {profile?.preferred_withdrawal_country}
          </div>
        ) : (
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Sélectionnez un pays
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Opérateur
        </label>
        <div className="flex gap-2">
          {availableOperators.length > 0 ? (
            availableOperators.map((op) => (
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
            ))
          ) : (
            <div className="flex-1 py-3 rounded-xl bg-secondary border border-border text-muted-foreground text-center text-xs">
              Sélectionnez d'abord un pays pour choisir un opérateur.
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Numéro de réception (Mobile Money)
        </label>
        {isCardImmutable ? (
          <div className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-foreground text-sm">
            {profile?.preferred_withdrawal_number}
          </div>
        ) : (
          <input
            type="tel"
            placeholder="Ex: 07 00 00 00 00"
            value={walletNumber}
            onChange={(e) => setWalletNumber(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
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
            <span className="text-muted-foreground">Seuil de compte</span>
            <span className="text-foreground font-semibold">
              CFA {formatCFA(minWithdrawal)} F
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
          disabled={
            loading ||
            !numAmount ||
            numAmount < minWithdrawal ||
            !operator ||
            !walletNumber
          }
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

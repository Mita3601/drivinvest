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
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
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
  const feePercent = settings?.withdrawal_fee_percent ?? 10;
  const minWithdrawal = settings?.min_withdrawal ?? 2200;
  const numAmount = Number(amount) || 0;
  const fee = Math.round((numAmount * feePercent) / 100);
  const netAmount = numAmount - fee;

  // Build list of linked wallets (currently a single "preferred" wallet stored on `profiles`)
  const wallets = useMemo(() => {
    const arr: Array<any> = [];
    if (profile?.preferred_withdrawal_number) {
      arr.push({
        id: "primary",
        country: profile.preferred_withdrawal_country,
        operator: profile.preferred_withdrawal_operator,
        number: profile.preferred_withdrawal_number,
        label: `${profile.preferred_withdrawal_operator || "Wallet"} • ${profile.preferred_withdrawal_number}`,
      });
    }
    return arr;
  }, [profile]);

  useEffect(() => {
    // Default to primary wallet if available
    if (wallets.length && !selectedWalletId) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallets, selectedWalletId]);

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.id === selectedWalletId) || null,
    [wallets, selectedWalletId],
  );

  useEffect(() => {
    if (selectedWallet) {
      setCountry(selectedWallet.country || "");
      setOperator(selectedWallet.operator || null);
      setWalletNumber(selectedWallet.number || "");
    } else {
      // clear when no selection
      setCountry("");
      setOperator(null);
      setWalletNumber("");
    }
  }, [selectedWallet]);

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
          Portefeuille lié
        </label>
        {wallets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wallets.map((w: any) => (
              <button
                key={w.id}
                onClick={() => setSelectedWalletId(w.id)}
                className={`w-full text-left p-3 rounded-xl border transition-shadow flex items-center justify-between gap-3 ${
                  selectedWalletId === w.id
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg border-primary"
                    : "bg-secondary border-border text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm uppercase">
                    {w.operator ? (w.operator + "").slice(0, 2) : "WL"}
                  </div>
                  <div>
                    <div className="text-sm font-bold truncate">{w.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.country}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {w.number.replace(
                    /(\d{3})(\d{2})(\d{2})(\d{2})/,
                    "$1 $2 $3 $4",
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-full py-3 rounded-xl bg-secondary border border-border text-muted-foreground text-center text-xs">
              Aucun portefeuille lié. Ajoutez-en un depuis la page Liaison de
              compte.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/link-account")}
                className="col-span-2 py-3 rounded-xl font-bold text-sm bg-primary text-white"
              >
                Lier un compte maintenant
              </button>
            </div>
          </div>
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

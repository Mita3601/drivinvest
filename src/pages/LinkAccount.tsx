import { ArrowLeft, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

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

const LinkAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const availableOperators = operatorMap[country] || [];

  useEffect(() => {
    if (profile) {
      setCountry(profile.preferred_withdrawal_country ?? "");
      setOperator(profile.preferred_withdrawal_operator ?? null);
      setWalletNumber(profile.preferred_withdrawal_number ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!country || !operator || !walletNumber) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le pays, l'opérateur et le numéro.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        preferred_withdrawal_country: country,
        preferred_withdrawal_operator: operator,
        preferred_withdrawal_number: walletNumber,
      })
      .eq("user_id", user.id);
    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: "Compte lié",
      description: "Vos informations de retrait ont été sauvegardées.",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <CheckCircle className="w-16 h-16 text-success" />
        <h2 className="font-display font-bold text-xl text-foreground">
          Compte lié
        </h2>
        <p className="text-muted-foreground text-sm">
          Vos informations de retrait sont maintenant enregistrées.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl mt-4"
        >
          Retour au profil
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
          Lier un compte
        </h1>
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border p-5 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1">
          Informations de retrait
        </p>
        <p className="text-foreground font-bold text-lg">
          Pays + numéro Mobile Money
        </p>
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
          <option value="" disabled>
            Sélectionnez un pays
          </option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Opérateur
        </label>
        <div className="flex gap-2">
          {country ? (
            (operatorMap[country] || []).map((op) => (
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
              Choisissez d'abord un pays.
            </div>
          )}
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

      <div className="px-4">
        <button
          onClick={handleSave}
          disabled={loading || !country || !operator || !walletNumber}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
};

export default LinkAccount;

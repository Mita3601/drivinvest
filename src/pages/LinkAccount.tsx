import { ArrowLeft, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

const countries = [
  { id: "Cameroun", label: "Cameroun" },
  { id: "CI", label: "Côte d'Ivoire" },
  { id: "BF", label: "Burkina Faso" },
  { id: "Benin", label: "Bénin" },
  { id: "Senegal", label: "Sénégal" },
];

const operatorMap: Record<string, Array<{ id: string; label: string }>> = {
  Cameroun: [{ id: "orange", label: "Orange" }, { id: "mtn", label: "MTN" }],
  CI: [
    { id: "wave", label: "Wave" }, { id: "moov", label: "Moov" },
    { id: "mtn", label: "MTN" }, { id: "orange", label: "Orange" },
  ],
  BF: [{ id: "orange", label: "Orange" }, { id: "wave", label: "Wave" }, { id: "moov", label: "Moov" }],
  Benin: [{ id: "orange", label: "Orange" }, { id: "mtn", label: "MTN" }],
  Senegal: [
    { id: "orange", label: "Orange" },
    { id: "freemoney", label: "Freemoney" },
    { id: "expresso", label: "Expresso" },
  ],
};

const EmptyIllustration = () => (
  <svg viewBox="0 0 320 240" className="w-64 h-48">
    <ellipse cx="160" cy="215" rx="130" ry="8" fill="hsl(var(--muted))" opacity="0.5" />
    {/* leaves bg */}
    <path d="M250 60 Q280 90 260 140 Q250 100 230 90 Z" fill="hsl(var(--primary))" opacity="0.4" />
    <path d="M240 90 Q265 120 245 165 Q240 130 220 120 Z" fill="hsl(var(--primary))" opacity="0.3" />
    {/* card */}
    <rect x="120" y="120" width="160" height="80" rx="6" fill="hsl(var(--primary))" opacity="0.85" />
    <rect x="135" y="140" width="50" height="8" rx="2" fill="#fff" opacity="0.9" />
    <rect x="135" y="155" width="100" height="6" rx="2" fill="#fff" opacity="0.6" />
    <rect x="135" y="167" width="80" height="6" rx="2" fill="#fff" opacity="0.6" />
    {/* person */}
    <circle cx="70" cy="105" r="14" fill="#3d3d5c" />
    <path d="M55 120 Q55 155 70 160 Q85 155 85 120 Z" fill="hsl(var(--primary))" opacity="0.9" />
    <rect x="60" y="140" width="20" height="45" fill="#3d3d5c" />
    {/* paper plane */}
    <path d="M180 60 L230 80 L200 90 L195 115 L180 90 Z" fill="hsl(var(--primary))" />
    <path d="M180 60 L200 90 L195 115" fill="none" stroke="#fff" strokeWidth="1.5" />
  </svg>
);

const LinkAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (profile) {
      setCountry(profile.preferred_withdrawal_country ?? "");
      setOperator(profile.preferred_withdrawal_operator ?? null);
      setWalletNumber(profile.preferred_withdrawal_number ?? "");
    }
  }, [profile]);

  const isLinked =
    !!profile?.preferred_withdrawal_country &&
    !!profile?.preferred_withdrawal_operator &&
    !!profile?.preferred_withdrawal_number;

  const handleSave = async () => {
    if (!user) return;
    if (!country || !operator || !walletNumber) {
      toast({ title: "Erreur", description: "Remplissez tous les champs.", variant: "destructive" });
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Compte lié", description: "Informations sauvegardées." });
  };

  const Header = () => (
    <div className="relative flex items-center justify-center px-4 pt-5 pb-4 border-b border-border">
      <button
        onClick={() => (showForm ? setShowForm(false) : navigate(-1))}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <h1 className="font-display font-bold text-lg text-foreground">Mon Compte</h1>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center px-6 text-center gap-4 mt-24">
          <CheckCircle className="w-16 h-16 text-success" />
          <h2 className="font-display font-bold text-xl text-foreground">Compte lié</h2>
          <p className="text-muted-foreground text-sm">Vos informations sont enregistrées.</p>
          <button
            onClick={() => navigate("/profile")}
            className="bg-primary text-white font-bold py-3 px-8 rounded-full mt-4"
          >
            Retour au profil
          </button>
        </div>
      </div>
    );
  }

  if (!showForm && !isLinked) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-4">
          <EmptyIllustration />
          <p className="text-muted-foreground text-center text-[15px] mt-8 leading-relaxed">
            Aucun Argent Mobile n'est lié encore<br />Ajouter maintenant
          </p>
        </div>
        <div className="px-8 mt-6 mb-10">
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-full font-display font-bold text-white text-lg bg-gradient-to-b from-primary to-primary/80 shadow-lg shadow-primary/30"
          >
            Ajouter Compte
          </button>
        </div>
      </div>
    );
  }

  // Form (either explicit or already linked → allow edit)
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="px-4 pt-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pays</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-2 w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>Sélectionnez un pays</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Opérateur</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {country ? (
              (operatorMap[country] || []).map((op) => (
                <button
                  key={op.id}
                  onClick={() => setOperator(op.id)}
                  className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                    operator === op.id
                      ? "bg-primary text-white border-primary"
                      : "bg-secondary border-border text-foreground"
                  }`}
                >
                  {op.label}
                </button>
              ))
            ) : (
              <div className="col-span-2 py-3 rounded-xl bg-secondary border border-border text-muted-foreground text-center text-xs">
                Choisissez d'abord un pays.
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Numéro de réception</label>
          <input
            type="tel"
            placeholder="Ex: 07 00 00 00 00"
            value={walletNumber}
            onChange={(e) => setWalletNumber(e.target.value)}
            className="mt-2 w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={loading || !country || !operator || !walletNumber}
            className="w-full py-4 rounded-full font-display font-bold text-white text-lg bg-gradient-to-b from-primary to-primary/80 shadow-lg shadow-primary/30 disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkAccount;

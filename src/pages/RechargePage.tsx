import { useState } from "react";
import { ArrowLeft, Upload, CheckCircle, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const quickAmounts = [5000, 10000, 20000, 25000, 50000, 100000];

const methods = [
  { id: "orange", label: "Orange Money", color: "bg-orange-500" },
  { id: "mtn", label: "MTN MoMo", color: "bg-yellow-500" },
  { id: "moov", label: "Moov Money", color: "bg-blue-500" },
];

const RechargePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").limit(1).single();
      return data;
    },
  });

  const getAdminNumber = () => {
    if (!settings || !method) return "—";
    if (method === "orange") return (settings as any).deposit_orange_number || "—";
    if (method === "mtn") return (settings as any).deposit_mtn_number || "—";
    if (method === "moov") return (settings as any).deposit_moov_number || "—";
    return "—";
  };

  const handleSubmit = async () => {
    if (!amount || !method || !file || !user) {
      toast({ title: "Erreur", description: "Remplissez tous les champs et ajoutez la preuve.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("transaction-proofs").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount,
        type: "deposit",
        method,
        proof_url: path,
      });
      if (txError) throw txError;

      setSubmitted(true);
      toast({ title: "Demande envoyée !", description: "Votre dépôt est en cours de vérification." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <CheckCircle className="w-16 h-16 text-success" />
        <h2 className="font-display font-bold text-xl text-foreground">Vérification en cours</h2>
        <p className="text-muted-foreground text-sm">Votre preuve de paiement a été soumise. Vous serez crédité après validation par l'admin.</p>
        <button onClick={() => navigate("/")} className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl mt-4">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">Recharger</h1>
      </div>

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Montant (FCFA)</label>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                amount === a ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-foreground"
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

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Méthode de paiement</label>
        <div className="flex gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all ${
                method === m.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {method && (
        <div className="mx-4 rounded-2xl bg-secondary border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Envoyez le montant au :</span>
          </div>
          <p className="text-primary font-display font-extrabold text-xl">{getAdminNumber()}</p>
          <p className="text-muted-foreground text-xs">Puis envoyez la capture d'écran ci-dessous.</p>
        </div>
      )}

      <div className="px-4 space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preuve de paiement</label>
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary p-6 cursor-pointer hover:border-primary transition-colors">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{file ? file.name : "Cliquez pour uploader la capture"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <div className="px-4">
        <button
          onClick={handleSubmit}
          disabled={loading || !amount || !method || !file}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <span className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" /> : "Soumettre la recharge"}
        </button>
      </div>
    </div>
  );
};

export default RechargePage;

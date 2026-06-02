import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const PromoCode = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_promo_code", { p_code: code.trim() });
    setLoading(false);
    const res = data as { success: boolean; message?: string; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: "Échec", description: res?.error || error?.message || "Erreur", variant: "destructive" });
      return;
    }
    toast({ title: "Code accepté ✅", description: res.message });
    setCode("");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-display font-bold text-xl">Code promo</h1>
      </div>

      <div className="px-5 mt-8 max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-lg font-bold mb-1">Entrer un code promo</h2>
          <p className="text-sm text-muted-foreground mb-6">Bonus solde, remise produit ou bonus recharge</p>

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EX: VOGUE2026"
            className="text-center font-display text-lg tracking-widest mb-4"
            maxLength={32}
          />

          <Button onClick={handleRedeem} disabled={loading || !code.trim()} className="w-full font-bold">
            {loading ? "Vérification..." : "Utiliser le code"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoCode;

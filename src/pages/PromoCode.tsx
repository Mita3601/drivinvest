import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
      <div className="relative flex items-center justify-center px-4 pt-5 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">Code Échangeur</h1>
      </div>

      {/* Illustration */}
      <div className="mx-4 mt-4 rounded-2xl bg-secondary/50 py-10 flex items-center justify-center">
        <svg viewBox="0 0 300 220" className="w-56 h-40">
          <ellipse cx="150" cy="200" rx="120" ry="10" fill="hsl(var(--muted))" opacity="0.5" />
          {/* small box */}
          <rect x="40" y="110" width="80" height="80" rx="4" fill="hsl(var(--primary))" opacity="0.85" />
          <rect x="75" y="110" width="10" height="80" fill="#fff" />
          <rect x="40" y="145" width="80" height="10" fill="#fff" />
          {/* big box */}
          <rect x="130" y="60" width="130" height="130" rx="4" fill="hsl(var(--primary))" />
          <rect x="185" y="60" width="20" height="130" fill="#fff" />
          <rect x="130" y="115" width="130" height="20" fill="#fff" />
          {/* bow */}
          <path d="M170 105 L195 125 L220 105 L220 145 L195 125 L170 145 Z" fill="hsl(var(--primary))" stroke="#fff" strokeWidth="2" />
          {/* roof */}
          <path d="M35 110 L265 110 L255 80 L45 80 Z" fill="hsl(var(--primary))" />
          <path d="M45 80 L55 110 M75 80 L85 110 M105 80 L115 110 M135 80 L145 110 M165 80 L175 110 M195 80 L205 110 M225 80 L235 110" stroke="#fff" strokeWidth="3" />
          {/* decorations */}
          <circle cx="30" cy="45" r="8" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.5" />
          <circle cx="270" cy="55" r="6" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.5" />
          <text x="215" y="35" fill="hsl(var(--muted-foreground))" fontSize="18" opacity="0.6">×</text>
          <text x="60" y="30" fill="hsl(var(--muted-foreground))" fontSize="14" opacity="0.6">+</text>
        </svg>
      </div>

      {/* Input */}
      <div className="px-4 mt-8">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Veuillez le code d'échange"
          maxLength={32}
          className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground text-[15px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Confirm button */}
      <div className="px-4 mt-5">
        <button
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="w-full py-4 rounded-full font-display font-bold text-white text-lg bg-gradient-to-b from-primary to-primary/80 shadow-lg shadow-primary/30 disabled:opacity-50"
        >
          {loading ? "Vérification..." : "Confirmateur"}
        </button>
      </div>
    </div>
  );
};

export default PromoCode;

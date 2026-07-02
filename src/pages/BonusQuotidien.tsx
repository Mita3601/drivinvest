import { ArrowLeft, Laptop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const BonusQuotidien = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [days, setDays] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const { data, error } = await supabase.rpc("get_daily_bonus_status");
    if (error) return;
    const d = data as any;
    setDays(d?.days ?? 0);
    setCanClaim(!!d?.can_claim);
    setNextAt(d?.next_at ? new Date(d.next_at) : null);
  };

  useEffect(() => {
    loadStatus();
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = () => {
    if (!nextAt) return "";
    const ms = nextAt.getTime() - now.getTime();
    if (ms <= 0) return "Disponible";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const claim = async () => {
    if (loading) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("claim_daily_bonus");
    setLoading(false);
    const r = data as any;
    if (error || !r?.success) {
      toast({
        title: "Indisponible",
        description: r?.error || "Réessayez plus tard.",
      });
      await loadStatus();
      return;
    }
    toast({
      title: `+${r.amount} FCFA`,
      description: "Bonus quotidien crédité.",
    });
    await loadStatus();
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const canClaimNow =
    canClaim && (!nextAt || nextAt.getTime() <= now.getTime());

  return (
    <div className="pb-24">
      <div className="px-4 pt-5">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col items-center mt-4 px-6">
        <div className="w-56 h-56 rounded-full bg-navy-card border-gold-gradient flex flex-col items-center justify-center">
          <Laptop className="w-16 h-16 text-foreground mb-3" />
          <p className="font-display font-bold text-foreground text-3xl">
            CFA 50
          </p>
        </div>

        <div className="-mt-5 px-8 py-2 rounded-2xl bg-gradient-to-r from-rose-200 via-orange-200 to-amber-200">
          <span className="text-background font-display font-medium">
            Bonus cumulé
          </span>
        </div>

        <p className="text-muted-foreground text-base mt-6">
          Vous avez pointé {days} jour{days > 1 ? "s" : ""}
        </p>

        <div className="flex items-center justify-center gap-10 mt-6">
          <div className="text-center">
            <p className="font-display font-bold text-foreground text-3xl">
              {days}
            </p>
            <p className="text-muted-foreground text-sm mt-1">Jours</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="font-display font-bold text-foreground text-3xl">
              CFA 50
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Bonus quotidien
            </p>
          </div>
        </div>

        {!canClaimNow && nextAt && (
          <p className="text-muted-foreground text-sm mt-4">
            Prochain pointage dans{" "}
            <span className="text-foreground font-medium">{countdown()}</span>
          </p>
        )}

        <button
          onClick={claim}
          disabled={!canClaimNow || loading}
          className="w-full mt-6 py-4 rounded-2xl bg-navy-card border-gold-gradient text-foreground font-display font-medium text-lg disabled:opacity-50"
        >
          {loading ? "..." : canClaimNow ? "Pointer" : "Indisponible"}
        </button>

        <div className="w-full mt-6 rounded-2xl bg-secondary border border-border p-5 space-y-3">
          <h3 className="font-display font-bold text-foreground">
            Conseils utiles
          </h3>
          <p className="text-muted-foreground text-sm">
            1. Récompense quotidienne : 50 FCFA créditée directement sur votre
            solde.
          </p>
          <p className="text-muted-foreground text-sm">
            2. Le premier pointage est disponible 24h après la création de votre
            compte.
          </p>
          <p className="text-muted-foreground text-sm">
            3. Chaque pointage suivant est disponible 24h après le précédent.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BonusQuotidien;

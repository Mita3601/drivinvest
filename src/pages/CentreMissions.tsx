import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import pcBg from "@/assets/pc-vip5.jpg";

const MISSIONS = [
  {
    key: "invite_5",
    id: 1,
    objectif: 5,
    reward: 1200,
    desc: "Invitez 5 utilisateurs d'investissement de niveau 1 pour obtenir CFA 1,200",
  },
  {
    key: "invite_10",
    id: 2,
    objectif: 10,
    reward: 2500,
    desc: "Invitez 10 utilisateurs d'investissement de niveau 1 pour obtenir CFA 2,500",
  },
  {
    key: "invite_20",
    id: 3,
    objectif: 20,
    reward: 5000,
    desc: "Invitez 20 utilisateurs d'investissement de niveau 1 pour obtenir CFA 5,000",
  },
];

const CentreMissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const { data: lvl1Count = 0 } = useQuery({
    queryKey: ["mission_lvl1_count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      // Count only direct referees who have at least one investment
      const { data: referees } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", profile.id);
      const ids = (referees || []).map((r: any) => r.id);
      if (!ids.length) return 0;
      const { data: invs } = await supabase
        .from("investments")
        .select("user_id")
        .in("user_id", ids);
      const unique = new Set((invs || []).map((i: any) => i.user_id));
      return unique.size;
    },
    enabled: !!profile?.id,
  });

  const { data: claimed = [] } = useQuery({
    queryKey: ["mission_claims", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("mission_rewards")
        .select("mission_type, amount")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const totalEarned = claimed.reduce((s, m) => s + Number(m.amount), 0);

  const handleClaim = async (key: string) => {
    setLoadingKey(key);
    const { data, error } = await supabase.rpc("claim_mission_reward", {
      p_mission_type: key,
    });
    setLoadingKey(null);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const r = data as any;
    if (r?.success) {
      toast({
        title: "🎉 Récompense reçue !",
        description: `+${r.amount} F crédités`,
      });
      qc.invalidateQueries({ queryKey: ["mission_claims"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } else {
      toast({
        title: "Impossible",
        description: r?.error || "Erreur",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pb-24">
      <div className="relative h-52">
        <img
          src={pcBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-background" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-5 left-4 z-10 text-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="absolute top-16 left-0 right-0 text-center font-display font-extrabold text-foreground text-3xl tracking-wide z-10">
          CENTRE DE MISSIONS
        </h1>
      </div>

      <div className="px-4 -mt-16 relative z-10">
        <div className="rounded-2xl bg-navy-deep border-gold-gradient p-5 text-center">
          <p className="font-display font-extrabold text-foreground text-4xl">
            CFA {totalEarned.toLocaleString("fr-FR")}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Récompenses cumulées
          </p>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-3">
        {MISSIONS.map((m) => {
          const actuel = Math.min(lvl1Count, m.objectif);
          const isClaimed = claimed.some((c) => c.mission_type === m.key);
          const canClaim = lvl1Count >= m.objectif && !isClaimed;
          return (
            <div key={m.id} className="rounded-2xl bg-secondary p-4">
              <div className="flex gap-4 mb-3">
                <p className="font-display font-bold text-foreground text-lg shrink-0">
                  Mission {m.id}
                </p>
                <p className="text-muted-foreground text-sm">{m.desc}</p>
              </div>
              <div className="grid grid-cols-3 mb-3">
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-lg">
                    {actuel}
                  </p>
                  <p className="text-muted-foreground text-xs">Actuel</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-lg">
                    {m.objectif}
                  </p>
                  <p className="text-muted-foreground text-xs">Objectif</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-lg">
                    {actuel}/{m.objectif}
                  </p>
                  <p className="text-muted-foreground text-xs">Progression</p>
                </div>
              </div>
              <button
                disabled={!canClaim || loadingKey === m.key}
                onClick={() => handleClaim(m.key)}
                className={`w-full py-3 rounded-xl font-display font-medium ${
                  isClaimed
                    ? "bg-muted text-muted-foreground"
                    : canClaim
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {loadingKey === m.key
                  ? "..."
                  : isClaimed
                    ? "Reçu"
                    : canClaim
                      ? "Réclamer"
                      : "En cours"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CentreMissions;

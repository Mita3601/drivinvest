import { Flame, Tag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const LEVEL_LABELS = [
  { key: 1, label: "A Niveau", pct: 5 },
  { key: 2, label: "B Niveau", pct: 2 },
  { key: 3, label: "C Niveau", pct: 1 },
];

const Team = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();

  const { data: stats } = useQuery({
    queryKey: ["team_stats_v2", user?.id],
    queryFn: async () => {
      if (!profile?.id)
        return {
          totalRevenue: 0,
          teamSize: 0,
          official: 0,
          levels: { 1: { size: 0, rev: 0 }, 2: { size: 0, rev: 0 }, 3: { size: 0, rev: 0 } },
        };

      const { data: lvl1 } = await supabase
        .from("profiles").select("id,user_id").eq("referred_by", profile.id);
      const ids1 = (lvl1 || []).map((p) => p.id);

      let lvl2: any[] = [];
      if (ids1.length) {
        const { data } = await supabase
          .from("profiles").select("id,user_id").in("referred_by", ids1);
        lvl2 = data || [];
      }
      const ids2 = lvl2.map((p: any) => p.id);

      let lvl3: any[] = [];
      if (ids2.length) {
        const { data } = await supabase
          .from("profiles").select("id,user_id").in("referred_by", ids2);
        lvl3 = data || [];
      }

      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("level, amount, referee_id")
        .eq("referrer_id", profile.id);

      const levelStats: Record<number, { size: number; rev: number }> = {
        1: { size: (lvl1 || []).length, rev: 0 },
        2: { size: lvl2.length, rev: 0 },
        3: { size: lvl3.length, rev: 0 },
      };
      const officialSet = new Set<string>();
      (rewards || []).forEach((r: any) => {
        levelStats[r.level].rev += Number(r.amount || 0);
        officialSet.add(r.referee_id);
      });

      const totalRevenue =
        levelStats[1].rev + levelStats[2].rev + levelStats[3].rev;
      const teamSize = levelStats[1].size + levelStats[2].size + levelStats[3].size;

      return { totalRevenue, teamSize, official: officialSet.size, levels: levelStats };
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      {/* Top summary */}
      <div className="grid grid-cols-2 gap-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-foreground/80">
            <Tag className="w-4 h-4 text-primary" strokeWidth={2.2} />
            <span className="text-[13px] font-bold uppercase tracking-wide">Total de revenu</span>
          </div>
          <p className="mt-2 font-display font-extrabold text-primary text-3xl">
            {(stats?.totalRevenue ?? 0).toLocaleString("fr-FR")}
            <span className="ml-1 text-[11px] font-bold text-muted-foreground align-top">FCFA</span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-foreground/80">
            <Tag className="w-4 h-4 text-primary" strokeWidth={2.2} />
            <span className="text-[13px] font-bold uppercase tracking-wide">Taille l'équipe</span>
          </div>
          <p className="mt-2 font-display font-extrabold text-primary text-3xl">
            {stats?.teamSize ?? 0}
          </p>
        </div>
      </div>

      {/* Official members bar */}
      <div className="flex items-center justify-between bg-secondary/60 rounded-2xl px-4 py-4 border border-border">
        <span className="text-[13px] font-bold uppercase tracking-wide text-foreground">
          Nombre total de membres officiels
        </span>
        <span className="font-display font-extrabold text-primary text-xl">
          {stats?.official ?? 0}
        </span>
      </div>

      {/* Level cards */}
      {LEVEL_LABELS.map((lvl) => {
        const s = stats?.levels[lvl.key] ?? { size: 0, rev: 0 };
        return (
          <div
            key={lvl.key}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/70 py-4 text-center">
                <p className="text-xs text-muted-foreground">Taille</p>
                <p className="font-display font-extrabold text-foreground text-xl mt-1">
                  {s.size}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/70 py-4 text-center">
                <p className="text-xs text-muted-foreground">Revenus</p>
                <p className="font-display font-extrabold text-primary text-xl mt-1">
                  {s.rev.toLocaleString("fr-FR")}
                  <span className="ml-1 text-[10px] text-muted-foreground align-top">FCFA</span>
                </p>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-border" />
            <button
              onClick={() => navigate("/team/referrals")}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-primary" fill="currentColor" />
                <span className="font-display font-bold text-foreground text-lg">
                  {lvl.label}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  · {lvl.pct}%
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Team;

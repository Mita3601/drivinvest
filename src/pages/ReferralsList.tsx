import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const maskEmail = (email: string | null) => {
  if (!email) return "---@gmail.com";
  const prefix = email.slice(0, 3);
  return `${prefix}@gmail.com`;
};

const ReferralsList = () => {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  const { data: items, isLoading: loading } = useQuery({
    queryKey: ["my_referrals_list", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      // 1) get referral entries (unique referees + level)
      const { data: rewards, error } = await supabase
        .from("referral_rewards")
        .select("referee_id, level")
        .eq("referrer_id", profile.id);
      if (error) throw error;
      const byId = new Map<string, number>();
      (rewards || []).forEach((r: any) => {
        byId.set(r.referee_id, Math.min(byId.get(r.referee_id) ?? 4, r.level));
      });
      const ids = Array.from(byId.keys());
      if (!ids.length) return [];

      // 2) fetch profiles for these ids
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);

      // 3) fetch investments summary for these ids
      const { data: investments } = await supabase
        .from("investments")
        .select("user_id, amount_invested")
        .in("user_id", ids);

      const invMap = new Map<string, number>();
      (investments || []).forEach((inv: any) => {
        invMap.set(
          inv.user_id,
          (invMap.get(inv.user_id) || 0) + Number(inv.amount_invested || 0),
        );
      });

      return (profiles || []).map((p: any) => ({
        id: p.id,
        email: maskEmail(p.email),
        name: p.full_name || "-",
        level: byId.get(p.id) || 0,
        invested: invMap.get(p.id) || 0,
      }));
    },
    enabled: !!profile?.id,
  });

  const grouped = useMemo(() => {
    const g: Record<number, any[]> = { 1: [], 2: [], 3: [] };
    (items || []).forEach((it: any) => {
      if (it.level >= 1 && it.level <= 3) g[it.level].push(it);
    });
    return g;
  }, [items]);

  if (isLoading || loading)
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );

  return (
    <div className="pb-20">
      <div className="px-4 py-4 border-b border-border flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center"
        >
          Retour
        </button>
        <h1 className="font-display font-bold text-foreground text-xl">
          Mes filleuls
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {[1, 2, 3].map((lvl) => (
          <div key={lvl} className="rounded-2xl bg-secondary p-3">
            <p className="text-sm text-muted-foreground mb-2">
              Niveau {lvl} ({(grouped[lvl] || []).length})
            </p>
            <div className="space-y-2">
              {(grouped[lvl] || []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      {r.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Investi: CFA {Number(r.invested).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {!grouped[lvl]?.length && (
                <p className="text-xs text-muted-foreground">
                  Aucun filleul pour ce niveau.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralsList;

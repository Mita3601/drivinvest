import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

const maskEmail = (email: string | null) => {
  if (!email) return "---@gmail.com";
  const prefix = email.slice(0, 3);
  return `${prefix}*****@gmail.com`;
};

const ReferralsList = () => {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  const [openLevel, setOpenLevel] = useState<number | null>(1);

  const { data: items, isLoading: loading } = useQuery({
    queryKey: ["my_referrals_list", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data: lvl1Profiles, error: lvl1Err } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name")
        .eq("referred_by", profile.id);
      if (lvl1Err) throw lvl1Err;
      const lvl1Ids = (lvl1Profiles || []).map((p: any) => p.id);

      let lvl2Profiles: any[] = [];
      let lvl2Ids: string[] = [];

      if (lvl1Ids.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, email, full_name")
          .in("referred_by", lvl1Ids);
        if (error) throw error;
        lvl2Profiles = data || [];
        lvl2Ids = lvl2Profiles.map((p: any) => p.id);
      }

      let lvl3Profiles: any[] = [];
      if (lvl2Ids.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, email, full_name")
          .in("referred_by", lvl2Ids);
        if (error) throw error;
        lvl3Profiles = data || [];
      }

      const allProfiles = [
        ...(lvl1Profiles || []).map((p: any) => ({ ...p, level: 1 })),
        ...(lvl2Profiles || []).map((p: any) => ({ ...p, level: 2 })),
        ...(lvl3Profiles || []).map((p: any) => ({ ...p, level: 3 })),
      ];
      const allUserIds = allProfiles.map((p: any) => p.user_id).filter(Boolean);
      if (!allUserIds.length) return [];

      const { data: investments } = await supabase
        .from("investments")
        .select("user_id, amount_invested")
        .in("user_id", allUserIds);

      const invMap = new Map<string, number>();
      (investments || []).forEach((inv: any) => {
        invMap.set(
          inv.user_id,
          (invMap.get(inv.user_id) || 0) + Number(inv.amount_invested || 0),
        );
      });

      return allProfiles.map((p: any) => ({
        id: p.id,
        email: maskEmail(p.email),
        level: p.level,
        invested: invMap.get(p.user_id) || 0,
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

  const levelTotals = useMemo(() => {
    return [1, 2, 3].reduce(
      (acc, lvl) => {
        acc[lvl] = (grouped[lvl] || []).reduce(
          (sum, item) => sum + Number(item.invested || 0),
          0,
        );
        return acc;
      },
      {} as Record<number, number>,
    );
  }, [grouped]);

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
          <div
            key={lvl}
            className="rounded-2xl bg-secondary border border-border overflow-hidden"
          >
            <button
              onClick={() => setOpenLevel(openLevel === lvl ? null : lvl)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="text-sm font-bold text-foreground">
                  Niveau {lvl} ({(grouped[lvl] || []).length})
                </p>
                <p className="text-xs text-muted-foreground">
                  Somme investie: CFA{" "}
                  {Number(levelTotals[lvl] || 0).toLocaleString("fr-FR")}
                </p>
              </div>
              {openLevel === lvl ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {openLevel === lvl && (
              <div className="px-4 pb-4 space-y-2">
                {(grouped[lvl] || []).map((r: any) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-background/60 border border-border p-3"
                  >
                    <div>
                      <p className="font-bold text-foreground text-sm truncate">
                        {r.email}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Niveau {lvl}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">
                        Investi
                      </p>
                      <p className="font-bold text-foreground text-sm">
                        CFA {Number(r.invested).toLocaleString("fr-FR")}
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralsList;

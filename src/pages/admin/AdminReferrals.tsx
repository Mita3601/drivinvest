import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const AdminReferrals = () => {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin_referral_tree"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, referral_code, referred_by");
      if (error) throw error;
      return data || [];
    },
  });

  const tree = useMemo(() => {
    if (!profiles) return [];
    const byParent = new Map<string, any[]>();
    profiles.forEach((p: any) => {
      if (p.referred_by) {
        const arr = byParent.get(p.referred_by) || [];
        arr.push(p);
        byParent.set(p.referred_by, arr);
      }
    });
    return profiles.map((parent: any) => {
      const l1 = byParent.get(parent.id) || [];
      const l2 = l1.flatMap((c) => byParent.get(c.id) || []);
      const l3 = l2.flatMap((c) => byParent.get(c.id) || []);
      return { parent, l1, l2, l3, total: l1.length + l2.length + l3.length };
    }).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [profiles]);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  const nameOf = (p: any) => p.full_name || p.email?.split("@")[0] || "—";

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">{tree.length} parrains actifs</p>
      {tree.map(({ parent, l1, l2, l3 }) => (
        <div key={parent.id} className="rounded-xl bg-secondary border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground text-sm">{nameOf(parent)}</p>
              <p className="text-[10px] text-muted-foreground">{parent.referral_code}</p>
            </div>
            <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-1 rounded-full">{l1.length + l2.length + l3.length} filleuls</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex gap-2 flex-wrap">
              <span className="text-primary font-bold shrink-0">LEV1 ({l1.length}):</span>
              <span className="text-muted-foreground">{l1.length ? `{${l1.map(nameOf).join(", ")}}` : "{ }"}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-primary font-bold shrink-0">LEV2 ({l2.length}):</span>
              <span className="text-muted-foreground">{l2.length ? `{${l2.map(nameOf).join(", ")}}` : "{ }"}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-primary font-bold shrink-0">LEV3 ({l3.length}):</span>
              <span className="text-muted-foreground">{l3.length ? `{${l3.map(nameOf).join(", ")}}` : "{ }"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminReferrals;

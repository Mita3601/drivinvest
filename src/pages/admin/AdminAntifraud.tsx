import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const AdminAntifraud = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["antifraud"],
    queryFn: async () => {
      const [{ data: profiles }, { data: txs }, { data: invs }, { data: bonuses }, { data: missions }] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email"),
        supabase.from("transactions").select("user_id, type, status, amount"),
        supabase.from("investments").select("user_id, daily_yield, start_date, end_date, status"),
        supabase.from("daily_bonuses").select("user_id, amount"),
        supabase.from("mission_rewards").select("user_id, amount"),
      ]);
      return { profiles: profiles || [], txs: txs || [], invs: invs || [], bonuses: bonuses || [], missions: missions || [] };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return data.profiles.map((p: any) => {
      const myTx = data.txs.filter((t: any) => t.user_id === p.user_id);
      const deposits = myTx.filter((t: any) => t.type === "deposit" && t.status === "approved").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const withdrawals = myTx.filter((t: any) => t.type === "withdrawal" && t.status === "approved").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const gains = data.invs.filter((i: any) => i.user_id === p.user_id).reduce((s: number, i: any) => {
        const start = new Date(i.start_date).getTime();
        const end = Math.min(now, new Date(i.end_date).getTime());
        const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
        return s + days * Number(i.daily_yield);
      }, 0);
      const bonus = data.bonuses.filter((b: any) => b.user_id === p.user_id).reduce((s: number, b: any) => s + Number(b.amount), 0);
      const missionRew = data.missions.filter((m: any) => m.user_id === p.user_id).reduce((s: number, m: any) => s + Number(m.amount), 0);
      const legit = deposits + gains + bonus + missionRew;
      const diff = withdrawals - legit;
      const suspect = diff > 0;
      return { p, deposits, withdrawals, gains, bonus, missionRew, legit, diff, suspect };
    }).sort((a, b) => b.diff - a.diff);
  }, [data]);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;

  const suspects = rows.filter((r) => r.suspect);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4">
        <p className="text-destructive font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {suspects.length} compte(s) suspect(s)</p>
        <p className="text-muted-foreground text-[11px] mt-1">Retraits supérieurs aux entrées légitimes (dépôts + gains produits + bonus + missions).</p>
      </div>

      {rows.map(({ p, deposits, withdrawals, gains, bonus, missionRew, diff, suspect }) => (
        <div key={p.id} className={`rounded-xl border p-4 space-y-2 ${suspect ? "bg-destructive/5 border-destructive/40" : "bg-secondary border-border"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground text-sm">{p.full_name || "—"}</p>
              <p className="text-[10px] text-muted-foreground">{p.email}</p>
            </div>
            {suspect ? (
              <span className="bg-destructive/20 text-destructive text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> SUSPECT
              </span>
            ) : (
              <span className="bg-success/20 text-success text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> OK
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="bg-background/40 rounded p-1.5"><span className="text-muted-foreground">Dépôts:</span> <b className="text-foreground">{formatCFA(deposits)}</b></div>
            <div className="bg-background/40 rounded p-1.5"><span className="text-muted-foreground">Gains prod:</span> <b className="text-foreground">{formatCFA(gains)}</b></div>
            <div className="bg-background/40 rounded p-1.5"><span className="text-muted-foreground">Bonus:</span> <b className="text-foreground">{formatCFA(bonus)}</b></div>
            <div className="bg-background/40 rounded p-1.5"><span className="text-muted-foreground">Missions:</span> <b className="text-foreground">{formatCFA(missionRew)}</b></div>
            <div className="bg-destructive/10 rounded p-1.5 col-span-2"><span className="text-muted-foreground">Retraits:</span> <b className="text-destructive">{formatCFA(withdrawals)}</b> {suspect && <span className="text-destructive font-bold">(+{formatCFA(diff)} suspect)</span>}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminAntifraud;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const formatCFA = (n: number) => Number(n).toLocaleString("fr-FR");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const AdminInvestments = () => {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin_all_investments"],
    queryFn: async () => {
      const { data: invs } = await supabase
        .from("investments")
        .select("id, user_id, amount_invested, daily_yield, status, start_date, end_date, type_id")
        .order("created_at", { ascending: false });
      const { data: types } = await supabase.from("investment_types").select("id, name");
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name");
      const tMap = new Map((types || []).map((t: any) => [t.id, t.name]));
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (invs || []).map((i: any) => ({
        ...i,
        product_name: tMap.get(i.type_id) || "—",
        user_email: pMap.get(i.user_id)?.email || "",
        user_name: pMap.get(i.user_id)?.full_name || "—",
      }));
    },
  });

  const filtered = (data || []).filter((i: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.user_email?.toLowerCase().includes(q) || i.user_name?.toLowerCase().includes(q) || i.product_name?.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher utilisateur ou produit..." className="pl-9" />
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} investissement(s)</div>

      <div className="space-y-2">
        {filtered.map((inv: any) => (
          <div key={inv.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-sm">{inv.user_name}</p>
                <p className="text-xs text-muted-foreground">{inv.user_email}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md font-bold ${inv.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {inv.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Produit:</span> <span className="font-medium">{inv.product_name}</span></div>
              <div><span className="text-muted-foreground">Investi:</span> <span className="font-bold text-primary">{formatCFA(inv.amount_invested)} F</span></div>
              <div><span className="text-muted-foreground">Gain/j:</span> <span className="font-medium">{formatCFA(inv.daily_yield)} F</span></div>
              <div><span className="text-muted-foreground">Fin:</span> <span>{fmtDate(inv.end_date)}</span></div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun investissement</p>}
      </div>
    </div>
  );
};

export default AdminInvestments;

import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En cours", color: "text-primary", bg: "bg-primary/15" },
  approved: { label: "Réussi", color: "text-success", bg: "bg-success/15" },
  rejected: { label: "Refusé", color: "text-destructive", bg: "bg-destructive/15" },
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"withdrawal" | "deposit">(
    params.get("tab") === "deposit" ? "deposit" : "withdrawal"
  );

  const { data: txs, isLoading } = useQuery({
    queryKey: ["history", user?.id, tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("type", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-4 relative">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="absolute left-0 right-0 text-center font-display font-bold text-base text-foreground pointer-events-none">
          Historique
        </h1>
      </div>

      <div className="px-4 mb-4 flex gap-2">
        {[
          { id: "withdrawal" as const, label: "Retraits" },
          { id: "deposit" as const, label: "Dépôts" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : !txs?.length ? (
          <div className="rounded-2xl bg-secondary border border-border p-6 text-center">
            <p className="text-muted-foreground text-sm">Aucune transaction</p>
          </div>
        ) : (
          txs.map((tx: any) => {
            const info = statusInfo[tx.status] || { label: tx.status, color: "text-muted-foreground", bg: "bg-secondary" };
            const net = tx.net_amount ?? (tab === "withdrawal" ? Math.round(Number(tx.amount) * 0.85) : Number(tx.amount));
            return (
              <div key={tx.id} className="rounded-2xl bg-secondary p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-bold text-foreground text-base">CFA {formatCFA(Number(tx.amount))}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{tx.method?.toUpperCase() || "—"} • {new Date(tx.created_at).toLocaleString("fr-FR")}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${info.bg} ${info.color}`}>{info.label}</span>
                </div>
                {tab === "withdrawal" && (
                  <div className="border-t border-border pt-2 mt-2 text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Net reçu</span><span className="text-foreground">CFA {formatCFA(net)}</span></div>
                    {tx.wallet_number && <div className="flex justify-between"><span className="text-muted-foreground">Numéro</span><span className="text-foreground">{tx.wallet_number}</span></div>}
                    {tx.country && <div className="flex justify-between"><span className="text-muted-foreground">Pays</span><span className="text-foreground">{tx.country}</span></div>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryPage;

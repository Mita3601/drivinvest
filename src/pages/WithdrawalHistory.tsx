import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const statusColors: Record<string, string> = {
  pending: "bg-primary/15 text-primary",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Payé",
  rejected: "Rejeté",
};

const WithdrawalHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">Historique Retraits</h1>
      </div>
      <div className="px-4 space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          : !withdrawals?.length ? (
              <div className="rounded-2xl bg-secondary border border-border p-6 text-center">
                <p className="text-muted-foreground text-sm">Aucun retrait pour le moment</p>
              </div>
            ) : withdrawals.map((tx) => (
              <div key={tx.id} className="rounded-2xl bg-secondary border border-border p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-display font-bold text-foreground text-sm">{formatCFA(tx.amount)} F</p>
                  <p className="text-muted-foreground text-xs">{tx.method?.toUpperCase()} • {tx.wallet_number}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[tx.status] || ""}`}>
                  {statusLabels[tx.status] || tx.status}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
};

export default WithdrawalHistory;

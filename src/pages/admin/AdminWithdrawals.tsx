import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Check, X } from "lucide-react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin_withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    const { error } = await supabase
      .from("transactions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Retrait payé ✅" : "Retrait rejeté ❌" });
      queryClient.invalidateQueries({ queryKey: ["admin_withdrawals"] });
    }
    setProcessingId(null);
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  const statusColors: Record<string, string> = { pending: "text-primary", approved: "text-success", rejected: "text-destructive" };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">{withdrawals?.length || 0} retraits</p>
      {withdrawals?.map((tx) => (
        <div key={tx.id} className="rounded-xl bg-secondary border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-foreground">{formatCFA(tx.amount)} F</span>
            <span className={`text-xs font-bold ${statusColors[tx.status]}`}>{tx.status.toUpperCase()}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{tx.method?.toUpperCase() || "—"} • {tx.wallet_number || "—"}</p>
            <p>{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
          </div>
          {tx.status === "pending" && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleAction(tx.id, "approved")}
                disabled={processingId === tx.id}
                className="flex-1 flex items-center justify-center gap-1 bg-success text-success-foreground font-bold py-2 rounded-lg text-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Payé
              </button>
              <button
                onClick={() => handleAction(tx.id, "rejected")}
                disabled={processingId === tx.id}
                className="flex-1 flex items-center justify-center gap-1 bg-destructive text-destructive-foreground font-bold py-2 rounded-lg text-xs disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Rejeter
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminWithdrawals;

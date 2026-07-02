import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Check, X } from "lucide-react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");
type Filter = "all" | "pending" | "approved" | "rejected";

const AdminDeposits = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const { data: allTx, isLoading } = useQuery({
    queryKey: ["admin_all_tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id,user_id,type,amount,status,method,sender_number,proof_url,created_at,updated_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deposits = useMemo(
    () => (allTx || []).filter((t: any) => t.type === "deposit"),
    [allTx],
  );
  const withdrawals = useMemo(
    () => (allTx || []).filter((t: any) => t.type === "withdrawal"),
    [allTx],
  );

  const totalDeposits = deposits
    .filter((t: any) => t.status === "approved")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalWithdrawals = withdrawals
    .filter((t: any) => t.status === "approved")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const restant = totalDeposits - totalWithdrawals;

  const filtered =
    filter === "all"
      ? deposits
      : deposits.filter((t: any) => t.status === filter);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    const { error } = await supabase
      .from("transactions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: status === "approved" ? "Dépôt validé ✅" : "Dépôt rejeté ❌",
      });
      queryClient.invalidateQueries({ queryKey: ["admin_all_tx"] });
    }
    setProcessingId(null);
  };

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );

  const statusColors: Record<string, string> = {
    pending: "text-primary",
    approved: "text-success",
    rejected: "text-destructive",
  };
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Tous" },
    { id: "pending", label: "En cours" },
    { id: "approved", label: "Réussis" },
    { id: "rejected", label: "Refusés" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-success/10 border border-success/30 p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Dépôts</p>
          <p className="font-display font-bold text-success text-sm mt-1">
            {formatCFA(totalDeposits)} F
          </p>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
          <p className="text-[10px] text-muted-foreground uppercase">
            Retraits
          </p>
          <p className="font-display font-bold text-destructive text-sm mt-1">
            {formatCFA(totalWithdrawals)} F
          </p>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Restant</p>
          <p className="font-display font-bold text-primary text-sm mt-1">
            {formatCFA(restant)} F
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">{filtered.length} dépôts</p>
      {filtered.map((tx: any) => (
        <div
          key={tx.id}
          className="rounded-xl bg-secondary border border-border p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-foreground">
              {formatCFA(tx.amount)} F
            </span>
            <span className={`text-xs font-bold ${statusColors[tx.status]}`}>
              {tx.status.toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              Méthode: {tx.method?.toUpperCase() || "—"} • Expéditeur:{" "}
              {tx.sender_number || "—"}
            </p>
            <p>{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
            {tx.proof_url && (
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/transaction-proofs/${tx.proof_url}`}
                target="_blank"
                className="text-primary underline"
              >
                Voir preuve
              </a>
            )}
          </div>
          {tx.status === "pending" && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleAction(tx.id, "approved")}
                disabled={processingId === tx.id}
                className="flex-1 flex items-center justify-center gap-1 bg-success text-success-foreground font-bold py-2 rounded-lg text-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Valider
              </button>
              <button
                onClick={() => handleAction(tx.id, "rejected")}
                disabled={processingId === tx.id}
                className="flex-1 flex items-center justify-center gap-1 bg-destructive text-destructive-foreground font-bold py-2 rounded-lg text-xs disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Refuser
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDeposits;

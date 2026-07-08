import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Check, X } from "lucide-react";
import AdminSearch from "./AdminSearch";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");
type Filter = "all" | "pending" | "approved" | "rejected";

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin_withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id,user_id,amount,status,fee_amount,net_amount,country,method,wallet_number,created_at,updated_at",
        )
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set((withdrawals || []).map((t: any) => t.user_id))),
    [withdrawals],
  );
  const { data: usersMap } = useQuery({
    queryKey: ["admin_users_map", userIds.join(",")],
    queryFn: async () => {
      if (!userIds.length) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        m[p.user_id] = p;
      });
      return m;
    },
    enabled: userIds.length > 0,
  });

  const filtered = (withdrawals || []).filter(
    (t: any) => filter === "all" || t.status === filter,
  );

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
        title: status === "approved" ? "Retrait payé ✅" : "Retrait rejeté ❌",
      });
      queryClient.invalidateQueries({ queryKey: ["admin_withdrawals"] });
    }
    setProcessingId(null);
  };

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
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
    { id: "approved", label: "Payés" },
    { id: "rejected", label: "Refusés" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} retraits
      </p>
      {filtered.map((tx: any) => {
        const fee = tx.fee_amount ?? Math.round(Number(tx.amount) * 0.15);
        const net = tx.net_amount ?? Number(tx.amount) - fee;
        const user = usersMap?.[tx.user_id];
        return (
          <div
            key={tx.id}
            className="rounded-xl bg-secondary border border-border p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground text-sm">
                  {user?.full_name || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <span className={`text-xs font-bold ${statusColors[tx.status]}`}>
                {tx.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background/40 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">Demandé</p>
                <p className="font-bold text-foreground">
                  {formatCFA(Number(tx.amount))} F
                </p>
              </div>
              <div className="bg-background/40 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">Frais 18%</p>
                <p className="font-bold text-destructive">
                  -{formatCFA(fee)} F
                </p>
              </div>
              <div className="bg-success/10 rounded-lg p-2 col-span-2">
                <p className="text-muted-foreground text-[10px]">
                  Net à envoyer
                </p>
                <p className="font-display font-bold text-success">
                  {formatCFA(net)} F
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
              <p>
                <b className="text-foreground">Pays:</b> {tx.country || "—"} •{" "}
                <b className="text-foreground">Réseau:</b>{" "}
                {tx.method?.toUpperCase() || "—"}
              </p>
              <p>
                <b className="text-foreground">Numéro:</b>{" "}
                {tx.wallet_number || "—"}
              </p>
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
        );
      })}
    </div>
  );
};

export default AdminWithdrawals;

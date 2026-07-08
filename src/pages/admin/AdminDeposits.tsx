import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Check, X, Search } from "lucide-react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");
type Filter = "all" | "pending" | "approved" | "rejected";

const AdminDeposits = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: allTx, isLoading } = useQuery({
    queryKey: ["admin_all_tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id,user_id,type,amount,status,method,sender_number,wallet_number,country,proof_url,reference,created_at,updated_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id,email,preferred_withdrawal_country,preferred_withdrawal_operator,preferred_withdrawal_number",
        );
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = useMemo(
    () => new Map((profiles || []).map((p: any) => [p.user_id, p])),
    [profiles],
  );

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

  const baseList =
    filter === "all"
      ? deposits
      : deposits.filter((t: any) => t.status === filter);
  const q = search.trim().toLowerCase();
  const filtered = !q
    ? baseList
    : baseList.filter((t: any) => {
        const p = profileMap.get(t.user_id) as any;
        return (
          (p?.email || "").toLowerCase().includes(q) ||
          (t.sender_number || "").toLowerCase().includes(q) ||
          (t.wallet_number || "").toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      });

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

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher email, numéro, référence, montant..."
          className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <p className="text-muted-foreground text-xs">{filtered.length} dépôts</p>
      {filtered.map((tx: any) => {
        const profile = profileMap.get(tx.user_id);
        const userEmail = profile?.email || "—";
        const paymentCountry =
          tx.country || profile?.preferred_withdrawal_country || "—";
        const paymentNumber =
          tx.wallet_number ||
          tx.sender_number ||
          profile?.preferred_withdrawal_number ||
          "—";
        const paymentMethod = tx.method?.toUpperCase() || "—";
        return (
          <div
            key={tx.id}
            className="rounded-xl bg-secondary border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-foreground">
                {formatCFA(tx.amount)} F
              </span>
              <span className={`text-xs font-bold ${statusColors[tx.status]}`}>
                {tx.status.toUpperCase()}
              </span>
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="rounded-xl bg-background/80 p-3 border border-border">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Déposant
                  </p>
                  <p className="font-medium text-foreground truncate">
                    {userEmail}
                  </p>
                </div>
                <div className="rounded-xl bg-background/80 p-3 border border-border">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Pays / numéro utilisé
                  </p>
                  <p className="font-medium text-foreground truncate">
                    {paymentCountry} • {paymentNumber}
                  </p>
                </div>
              </div>
              <p>
                Méthode: {paymentMethod} • Expéditeur: {tx.sender_number || "—"}
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
        );
      })}
    </div>
  );
};

export default AdminDeposits;

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const statusInfo: Record<string, { label: string; color: string }> = {
  pending: { label: "En traitement", color: "text-primary" },
  approved: { label: "Succès", color: "text-success" },
  rejected: { label: "Rejeté", color: "text-destructive" },
};

const txRef = (id: string, date: string) => {
  const d = new Date(date);
  const stamp = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `B${stamp}${id.replace(/-/g, "").slice(0, 7).toUpperCase()}`;
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
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-4 relative">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="absolute left-0 right-0 text-center font-display font-bold text-base text-foreground pointer-events-none">
          Historique des retraits
        </h1>
      </div>
      <div className="px-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : !withdrawals?.length ? (
          <div className="rounded-2xl bg-secondary border border-border p-6 text-center">
            <p className="text-muted-foreground text-sm">Aucun retrait pour le moment</p>
          </div>
        ) : (
          <>
            {withdrawals.map((tx) => {
              const info = statusInfo[tx.status] || { label: tx.status, color: "text-muted-foreground" };
              const received = Number(tx.amount) * 0.95;
              return (
                <div key={tx.id} className="rounded-2xl bg-secondary p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-display font-bold text-foreground text-sm">{txRef(tx.id, tx.created_at)}</p>
                    <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex"><span className="text-muted-foreground w-20">Montant</span><span className="text-foreground">: CFA {formatCFA(Number(tx.amount))}</span></div>
                    <div className="flex"><span className="text-muted-foreground w-20">Reçu</span><span className="text-foreground">: CFA {formatCFA(Math.round(received))}</span></div>
                    <div className="flex"><span className="text-muted-foreground w-20">Heure</span><span className="text-foreground">: {new Date(tx.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(",", "")}</span></div>
                  </div>
                </div>
              );
            })}
            <p className="text-center text-muted-foreground text-sm pt-6">Aucune autre donnée</p>
          </>
        )}
      </div>
    </div>
  );
};

export default WithdrawalHistory;

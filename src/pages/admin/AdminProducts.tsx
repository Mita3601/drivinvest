import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useState } from "react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: investments, isLoading } = useQuery({
    queryKey: ["admin_investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*, investment_types(name, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet investissement ? Cette action est irréversible.")) return;
    setDeletingId(id);
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Investissement supprimé" });
      queryClient.invalidateQueries({ queryKey: ["admin_investments"] });
    }
    setDeletingId(null);
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const statusColors: Record<string, string> = { active: "text-success", completed: "text-muted-foreground" };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">{investments?.length || 0} investissements actifs</p>
      {investments?.map((inv) => (
        <div key={inv.id} className="rounded-xl bg-secondary border border-border p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm truncate">
              {(inv as any).investment_types?.name || "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatCFA(inv.amount_invested)} F • {formatCFA(inv.daily_yield)}/jour
            </p>
            <p className="text-muted-foreground text-[10px]">
              {new Date(inv.start_date).toLocaleDateString("fr-FR")} → {new Date(inv.end_date).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <span className={`text-xs font-bold ${statusColors[inv.status]}`}>{inv.status.toUpperCase()}</span>
          <button
            onClick={() => handleDelete(inv.id)}
            disabled={deletingId === inv.id}
            className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminProducts;

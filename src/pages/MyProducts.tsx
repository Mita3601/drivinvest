import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const MyProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: investments, isLoading } = useQuery({
    queryKey: ["my_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select(
          "*, investment_types(name, price, daily_return, total_return, duration, image_url)",
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const computeNext = (last: string) => {
    const next = new Date(new Date(last).getTime() + 24 * 3600 * 1000);
    const diff = next.getTime() - Date.now();
    if (diff <= 0) return "Imminent";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="pb-20 min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-foreground text-xl">
          Mes produits
        </h1>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : !investments?.length ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Vous n'avez encore acheté aucun produit.
            </p>
            <button
              onClick={() => navigate("/units")}
              className="mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl"
            >
              Voir les produits
            </button>
          </div>
        ) : (
          investments.map((inv: any) => {
            const t = inv.investment_types;
            const isCompleted = inv.status === "completed";
            const endDate = new Date(inv.end_date);
            const daysLeft = Math.max(
              0,
              Math.ceil((endDate.getTime() - Date.now()) / (24 * 3600 * 1000)),
            );
            return (
              <div
                key={inv.id}
                className="rounded-2xl bg-card border-gold-gradient p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-foreground text-base">
                        {t?.name}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Acheté le{" "}
                      {new Date(inv.start_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isCompleted
                        ? "bg-success/15 text-success"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {isCompleted ? "TERMINÉ" : "ACTIF"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase">
                      Investi
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      {formatCFA(inv.amount_invested)} F
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase">
                      Quotidien
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      {formatCFA(inv.daily_yield)} F
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase">
                      Total prévu
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      {formatCFA(t?.total_return || 0)} F
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs">
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-muted-foreground">
                        Produit clôturé
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        Prochain versement dans{" "}
                        {computeNext(inv.last_reward_date)} • {daysLeft}j
                        restants
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyProducts;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Units = () => {
  const { data: profile } = useProfile();
  const balance = profile?.balance ?? 0;
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ["investment_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_types")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleActivate = async (item: any) => {
    setLoadingId(item.id);
    const { data, error } = await supabase.rpc("buy_investment", { p_type_id: item.id });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (result?.success) {
        toast({ title: "Achat réussi ! 🎉", description: `${item.name} activé.` });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["investments"] });
      } else {
        toast({ title: "Solde insuffisant", description: `Il vous faut ${formatCFA(item.price)} F.` });
      }
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="px-4 pt-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">Boutique SVIP</h1>
          <p className="text-muted-foreground text-sm">Investissez dans nos packs exclusifs</p>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2 text-right">
          <span className="text-[10px] text-muted-foreground uppercase block">Votre solde</span>
          <span className="font-display font-bold text-primary text-sm">{formatCFA(balance)} F</span>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-2xl overflow-hidden border border-gold-dim/30">
          {/* Table header */}
          <div className="grid grid-cols-5 text-[10px] sm:text-xs font-bold uppercase tracking-wider py-3 px-3"
            style={{ background: "linear-gradient(135deg, hsl(var(--gold-dim)), hsl(var(--gold)), hsl(var(--gold-dim)))" }}>
            <span className="text-primary-foreground">Produit</span>
            <span className="text-primary-foreground text-right">Prix</span>
            <span className="text-primary-foreground text-right">Rev. quotidien</span>
            <span className="text-primary-foreground text-right">Temps</span>
            <span className="text-primary-foreground text-right">Rev. total</span>
          </div>

          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 px-3 py-3 border-t border-border">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                  <Skeleton className="h-4 w-10 ml-auto" />
                  <Skeleton className="h-4 w-14 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))
            : types?.map((item, i) => (
                <div
                  key={item.id}
                  className="grid grid-cols-5 items-center px-3 py-3 border-t border-border/50 hover:bg-secondary/50 transition-colors group cursor-pointer"
                  onClick={() => handleActivate(item)}
                >
                  <span className="font-display font-bold text-primary text-xs sm:text-sm">{item.name}</span>
                  <span className="text-foreground font-semibold text-xs sm:text-sm text-right">{formatCFA(item.price)}</span>
                  <span className="text-primary font-bold text-xs sm:text-sm text-right">{formatCFA(item.daily_return)}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm text-right">{item.duration} jours</span>
                  <span className="text-primary font-bold text-xs sm:text-sm text-right">{formatCFA(item.total_return)}</span>
                </div>
              ))}
        </div>

        <p className="text-muted-foreground text-[10px] text-center mt-3 italic">
          Cliquez sur un pack pour l'activer • Revenu crédité quotidiennement
        </p>
      </div>
    </div>
  );
};

export default Units;

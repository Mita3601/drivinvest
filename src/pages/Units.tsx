import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import InvestmentCard from "@/components/InvestmentCard";
import { Skeleton } from "@/components/ui/skeleton";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Units = () => {
  const { data: profile } = useProfile();
  const balance = profile?.balance ?? 0;

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

  return (
    <div className="space-y-5 pb-4">
      <div className="px-4 pt-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">Boutique Textile</h1>
          <p className="text-muted-foreground text-sm">Choisissez l'unité qui vous convient</p>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2 text-right">
          <span className="text-[10px] text-muted-foreground uppercase block">Votre solde</span>
          <span className="font-display font-bold text-primary text-sm">{formatCFA(balance)} F</span>
        </div>
      </div>

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))
          : types?.map((item, i) => (
              <div key={item.id} style={{ animationDelay: `${i * 80}ms` }}>
                <InvestmentCard item={item} />
              </div>
            ))}
      </div>
    </div>
  );
};

export default Units;

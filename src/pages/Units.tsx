import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import bannerImg from "@/assets/pc-banner.jpg";
import pc1 from "@/assets/pc-vip1.jpg";
import pc2 from "@/assets/pc-vip2.jpg";
import pc3 from "@/assets/pc-vip3.jpg";
import pc4 from "@/assets/pc-vip4.jpg";
import pc5 from "@/assets/pc-vip5.jpg";
import pc6 from "@/assets/pc-vip6.jpg";

const productImages = [pc1, pc2, pc3, pc4, pc5, pc6, pc1, pc2, pc3, pc4];

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
        .select("id,name,price,duration,daily_return,total_return,is_frozen")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Array<any>;
    },
  });

  const { data: myInvestments } = useQuery({
    queryKey: ["my_investments_count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("investments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      return count ?? 0;
    },
  });

  const totalRevenue = balance;

  const handleBuy = async (item: any) => {
    setLoadingId(item.id);
    const { data, error } = await supabase.rpc("buy_investment", {
      p_type_id: item.id,
    });
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const result = data as any;
      if (result?.success) {
        toast({
          title: "Achat réussi ! 🎉",
          description: `${item.name} activé.`,
        });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["my_investments_count"] });
      } else {
        toast({
          title: "Solde insuffisant",
          description: `Il vous faut ${formatCFA(item.price)} F.`,
          variant: "destructive",
        });
      }
    }
    setLoadingId(null);
  };

  return (
    <div className="pb-4">
      {/* Hero */}
      <div className="relative h-44">
        <img
          src={bannerImg}
          alt="Showroom PixelVest"
          className="w-full h-full object-cover"
          width={1600}
          height={640}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Stats card */}
      <div className="mx-4 -mt-10 relative rounded-3xl bg-secondary border-gold-gradient p-4 grid grid-cols-2 gap-4 text-center">
        <div className="border-r border-border">
          <p className="font-display font-bold text-foreground text-2xl">
            {myInvestments ?? 0}
          </p>
          <p className="text-muted-foreground text-xs">Mes produits</p>
        </div>
        <div>
          <p className="font-display font-bold text-foreground text-2xl">
            CFA {formatCFA(totalRevenue)}
          </p>
          <p className="text-muted-foreground text-xs">Revenu total</p>
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-5 space-y-0 divide-y divide-border">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 my-3 rounded-2xl" />
            ))
          : types?.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 py-4 ${item.is_frozen ? "opacity-55" : ""}`}
              >
                <img
                  src={productImages[i % productImages.length]}
                  alt={item.name}
                  className="w-24 h-24 rounded-2xl object-cover shrink-0"
                  loading="lazy"
                  width={1024}
                  height={1024}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display font-bold text-foreground text-base leading-tight">
                      {item.name}
                    </h3>
                    <button
                      disabled={loadingId === item.id || item.is_frozen}
                      onClick={() => handleBuy(item)}
                      className="shrink-0 rounded-xl border border-foreground/80 bg-transparent text-foreground text-xs font-bold px-4 py-2 hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                    >
                      {loadingId === item.id
                        ? "..."
                        : item.is_frozen
                          ? "GELÉ"
                          : "ACHETER"}
                    </button>
                  </div>
                  {item.is_frozen && (
                    <p className="text-[11px] text-destructive font-bold mb-1">
                      Produit temporairement indisponible.
                    </p>
                  )}
                  <div className="text-muted-foreground text-xs space-y-0.5">
                    <p>Prix : CFA {formatCFA(item.price)}</p>
                    <p>Jours de revenu : {item.duration}</p>
                    <p>Revenu quotidien : CFA {formatCFA(item.daily_return)}</p>
                    <p>Revenu total : CFA {formatCFA(item.total_return)}</p>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};

export default Units;

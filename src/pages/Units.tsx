import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import pc1 from "@/assets/pc-vip1.jpg";
import pc2 from "@/assets/pc-vip2.jpg";
import pc3 from "@/assets/pc-vip3.jpg";
import pc4 from "@/assets/pc-vip4.jpg";
import pc5 from "@/assets/pc-vip5.jpg";
import pc6 from "@/assets/pc-vip6.jpg";

const productImages = [pc1, pc2, pc3, pc4, pc5, pc6];
const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Filter = "ALL" | "P" | "G";

const Units = () => {
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const { data: types, isLoading } = useQuery({
    queryKey: ["investment_types_v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_types")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    if (!types) return [];
    if (filter === "ALL") return types;
    return types.filter((t) => (t.category || "P") === filter);
  }, [types, filter]);

  const handleBuy = async (item: any) => {
    setLoadingId(item.id);
    const { data, error } = await supabase.rpc("buy_investment", { p_type_id: item.id });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const r = data as any;
      if (r?.success) {
        toast({ title: "Achat réussi ! 🎉", description: `${item.name} activé.` });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["my_investments_count"] });
      } else {
        toast({ title: r?.error || "Erreur", variant: "destructive" });
      }
    }
    setLoadingId(null);
  };

  const chip = (key: Filter, label: string) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-8 py-2 rounded-full text-sm font-bold border transition-all ${
        filter === key
          ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "bg-transparent text-foreground border-primary/40 hover:border-primary"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* Filtres */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          {chip("ALL", "Tous")}
          {chip("P", "P")}
          {chip("G", "G")}
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 pt-4 space-y-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}

        {filtered.map((item, i) => {
          const isG = (item.category || "P") === "G";
          const cycleLabel = isG ? `${item.total_cycles} Semaine` : `${item.total_cycles} Jour`;
          const yieldLabel = isG ? "Revenus Hebdomadaire" : "Quotidien de revenu";
          const rate =
            item.price > 0
              ? ((Number(item.total_return) / Number(item.price)) * 100).toFixed(1)
              : "0";
          const tag = item.tag as string | null;

          return (
            <div
              key={item.id}
              className={`rounded-2xl bg-card border border-border/60 overflow-hidden shadow-sm ${
                item.is_frozen ? "opacity-60" : ""
              }`}
            >
              <div className="flex gap-3 p-3">
                <div className="relative shrink-0">
                  <img
                    src={productImages[i % productImages.length]}
                    alt={item.name}
                    loading="lazy"
                    className="w-24 h-24 rounded-xl object-cover"
                    width={512}
                    height={512}
                  />
                  {tag && (
                    <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-tl-xl rounded-br-xl shadow">
                      {tag}
                    </span>
                  )}
                  {isG && (
                    <span className="absolute bottom-1 left-1 right-1 text-center bg-black/70 text-white text-[10px] font-mono py-0.5 rounded">
                      25 : 34 : 28
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1 text-sm">
                  <Row label="Prix" value={`${fmt(item.price)}`} unit="FCFA" bold />
                  <Row label={yieldLabel} value={`${fmt(item.daily_return)}`} unit="FCFA" bold />
                  <Row label="Revenu Total" value={`${fmt(item.total_return)}`} unit="FCFA" bold />
                  <Row label="Cycles" value={cycleLabel} bold />
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border bg-muted/40 text-xs">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-semibold text-foreground">{item.name}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Taux de réponse</span>
                  <span className="font-semibold text-foreground">{rate}%</span>
                </div>
              </div>

              <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Mise récupérée à J+25 · reste = intérêts
                </span>
                <button
                  disabled={loadingId === item.id || item.is_frozen}
                  onClick={() => handleBuy(item)}
                  className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loadingId === item.id ? "..." : item.is_frozen ? "GELÉ" : "ACHETER"}
                </button>
              </div>
            </div>
          );
        })}

        {!isLoading && !filtered.length && (
          <p className="text-center text-muted-foreground py-8">Aucun produit.</p>
        )}
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  unit,
  bold,
}: {
  label: string;
  value: string;
  unit?: string;
  bold?: boolean;
}) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className={`text-foreground ${bold ? "font-bold" : ""}`}>
      {value}
      {unit && <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>}
    </span>
  </div>
);

export default Units;

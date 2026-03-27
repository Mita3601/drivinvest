import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

// Local image mapping for cards without image_url
import poloImg from "@/assets/polo-royal.jpg";
import chemiseImg from "@/assets/chemise-elite.jpg";
import vestImg from "@/assets/vest-vortex.jpg";
import costumeImg from "@/assets/costume-phantom.jpg";
import manteauImg from "@/assets/manteau-prestige.jpg";
import collectionImg from "@/assets/collection-supreme.jpg";

const imageMap: Record<string, string> = {
  'Polo "Royal S1"': poloImg,
  'Chemise "Elite V3"': chemiseImg,
  'Veste "Vortex X2"': vestImg,
  'Costume "Phantom X1"': costumeImg,
  'Manteau "Prestige L4"': manteauImg,
  'Collection "Suprême"': collectionImg,
};

const formatCFA = (n: number) => n.toLocaleString("fr-FR") + " F";

type InvestmentTypeRow = Tables<"investment_types">;

const InvestmentCard = ({ item }: { item: InvestmentTypeRow }) => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleActivate = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("buy_investment", { p_type_id: item.id });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (result?.success) {
        toast({ title: "Achat réussi ! 🎉", description: `${item.name} activé. Revenus quotidiens : ${formatCFA(item.daily_return)}` });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["investments"] });
      } else {
        toast({ title: "Solde insuffisant", description: `Vous avez besoin de ${formatCFA(item.price)} pour activer cette unité.` });
      }
    }
    setLoading(false);
  };

  const imgSrc = item.image_url || imageMap[item.name] || poloImg;

  return (
    <div className="rounded-3xl overflow-hidden bg-card border-gold-gradient card-glow animate-slide-up">
      <div className="relative aspect-square overflow-hidden">
        <img src={imgSrc} alt={item.name} loading="lazy" className="w-full h-full object-cover" width={512} height={512} />
        {item.tag && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {item.tag}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground text-base">{item.name}</h3>
        <div className="flex justify-between text-xs">
          <div>
            <span className="text-muted-foreground">Revenu quotidien</span>
            <p className="text-destructive font-bold text-sm">{formatCFA(item.daily_return)}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Revenu total</span>
            <p className="text-destructive font-bold text-sm">{formatCFA(item.total_return)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-display font-extrabold text-lg text-foreground">{formatCFA(item.price)}</span>
          <button
            onClick={handleActivate}
            disabled={loading}
            className="bg-red-cta hover:bg-destructive text-foreground font-bold text-sm px-5 py-2 rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Activer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentCard;

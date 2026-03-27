import { type InvestmentType } from "@/data/investmentTypes";
import { toast } from "@/hooks/use-toast";

const formatCFA = (n: number) =>
  n.toLocaleString("fr-FR") + " F";

const InvestmentCard = ({ item }: { item: InvestmentType }) => {
  const handleActivate = () => {
    toast({
      title: "Solde insuffisant",
      description: `Vous avez besoin de ${formatCFA(item.price)} pour activer cette unité.`,
    });
  };

  return (
    <div className="rounded-3xl overflow-hidden bg-card border-gold-gradient card-glow animate-slide-up">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover"
          width={512}
          height={512}
        />
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
            <p className="text-destructive font-bold text-sm">{formatCFA(item.dailyReturn)}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Revenu total</span>
            <p className="text-destructive font-bold text-sm">{formatCFA(item.totalReturn)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-display font-extrabold text-lg text-foreground">
            {formatCFA(item.price)}
          </span>
          <button
            onClick={handleActivate}
            className="bg-red-cta hover:bg-destructive text-foreground font-bold text-sm px-5 py-2 rounded-full transition-colors"
          >
            Activer
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentCard;

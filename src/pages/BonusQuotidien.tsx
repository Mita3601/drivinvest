import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const BonusQuotidien = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(1);
  const [claimed, setClaimed] = useState(false);

  const claim = () => {
    if (claimed) {
      toast({ title: "Déjà pointé aujourd'hui", description: "Revenez demain après minuit." });
      return;
    }
    setClaimed(true);
    setDays((d) => d + 1);
    toast({ title: "+50 FCFA", description: "Bonus quotidien crédité." });
  };

  return (
    <div className="pb-24">
      <div className="px-4 pt-5">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col items-center mt-4 px-6">
        <div className="w-56 h-56 rounded-full bg-navy-card border-gold-gradient flex flex-col items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-foreground mb-3" fill="currentColor">
            <path d="M3 14 L12 6 L21 14 L17 14 L12 10 L7 14 Z M5 17 L9 17 L9 19 L5 19 Z M15 17 L19 17 L19 19 L15 19 Z" />
          </svg>
          <p className="font-display font-bold text-foreground text-3xl">CFA 50</p>
        </div>

        <div className="-mt-5 px-8 py-2 rounded-2xl bg-gradient-to-r from-rose-200 via-orange-200 to-amber-200">
          <span className="text-background font-display font-medium">Bonus cumulé</span>
        </div>

        <p className="text-muted-foreground text-base mt-6">
          Vous avez pointé {days} jour{days > 1 ? "s" : ""} consécutif{days > 1 ? "s" : ""}
        </p>

        <div className="flex items-center justify-center gap-10 mt-6">
          <div className="text-center">
            <p className="font-display font-bold text-foreground text-3xl">{days}</p>
            <p className="text-muted-foreground text-sm mt-1">Jours</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="font-display font-bold text-foreground text-3xl">CFA 50</p>
            <p className="text-muted-foreground text-sm mt-1">Bonus quotidien</p>
          </div>
        </div>

        <button
          onClick={claim}
          className="w-full mt-8 py-4 rounded-2xl bg-navy-card border-gold-gradient text-foreground font-display font-medium text-lg"
        >
          {claimed ? "Pointé" : "Pointer"}
        </button>

        <div className="w-full mt-6 rounded-2xl bg-secondary border border-border p-5 space-y-3">
          <h3 className="font-display font-bold text-foreground">Conseils utiles</h3>
          <p className="text-muted-foreground text-sm">1. Récompense pour la connexion quotidienne : 50 FCFA.</p>
          <p className="text-muted-foreground text-sm">2. Connectez-vous une fois par jour.</p>
          <p className="text-muted-foreground text-sm">3. Connectez-vous à nouveau après minuit chaque jour.</p>
        </div>
      </div>
    </div>
  );
};

export default BonusQuotidien;

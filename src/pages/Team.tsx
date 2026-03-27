import { Copy, Share2, Users, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const referralLink = "https://vogueasset.com/register?ref=USER01";

const levels = [
  { level: 1, percent: "10%", earned: 0, color: "text-success" },
  { level: 2, percent: "5%", earned: 0, color: "text-primary" },
  { level: 3, percent: "2%", earned: 0, color: "text-destructive" },
];

const Team = () => {
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Lien copié !", description: "Partagez-le pour gagner des commissions." });
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="px-4 pt-4">
        <h1 className="font-display font-bold text-xl text-foreground">Système de Parrainage</h1>
        <p className="text-muted-foreground text-sm">Gagnez des commissions sur 3 niveaux</p>
      </div>

      {/* Referral Link */}
      <div className="mx-4 rounded-3xl bg-secondary p-5 card-glow border-gold-gradient space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground text-sm">Votre lien unique</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Partagez et gagnez</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-navy-deep rounded-xl p-3">
          <span className="text-xs text-muted-foreground truncate flex-1">{referralLink}</span>
          <button onClick={copyLink} className="text-primary">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Levels */}
      <div className="flex gap-3 px-4">
        {levels.map((l) => (
          <div key={l.level} className="flex-1 rounded-2xl bg-secondary p-3 text-center border border-border">
            <span className="text-[10px] text-muted-foreground uppercase">Niv {l.level}</span>
            <p className={`font-display font-bold text-lg ${l.color}`}>{l.percent}</p>
            <span className="text-[10px] text-muted-foreground">{l.earned} F</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4">
        <div className="flex-1 rounded-2xl bg-secondary p-4">
          <Users className="w-5 h-5 text-primary mb-2" />
          <span className="font-display font-extrabold text-2xl text-foreground block">0</span>
          <span className="text-[10px] text-muted-foreground uppercase">Total Filleuls</span>
        </div>
        <div className="flex-1 rounded-2xl bg-secondary p-4">
          <Gift className="w-5 h-5 text-primary mb-2" />
          <span className="font-display font-extrabold text-2xl text-foreground block">0 F</span>
          <span className="text-[10px] text-muted-foreground uppercase">Total Commissions</span>
        </div>
      </div>
    </div>
  );
};

export default Team;

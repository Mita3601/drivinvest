import { Wallet, ArrowDownCircle, ArrowUpCircle, Headphones, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import bannerImg from "@/assets/banner-hero.jpg";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const quickActions = [
  { label: "Recharger", icon: ArrowDownCircle, color: "text-success" },
  { label: "Retirer", icon: ArrowUpCircle, color: "text-primary" },
  { label: "Support", icon: Headphones, color: "text-destructive" },
];

const Index = () => {
  const [showBalance, setShowBalance] = useState(true);
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();

  const balance = profile?.balance ?? 0;
  const totalDeposited = profile?.total_deposited ?? 0;
  const totalWithdrawn = profile?.total_withdrawn ?? 0;
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Utilisateur";

  return (
    <div className="space-y-6 pb-4">
      <div className="px-4 pt-4">
        <h1 className="font-display font-bold text-xl text-foreground">Bonjour, {displayName}</h1>
        <p className="text-muted-foreground text-sm">Prêt pour vos investissements ?</p>
      </div>

      <div className="mx-4 rounded-3xl bg-secondary p-5 card-glow border-gold-gradient">
        <div className="flex items-center justify-between mb-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Solde disponible</span>
          <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground">
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <span className="font-display font-extrabold text-3xl text-foreground">
              {showBalance ? formatCFA(balance) : "••••••"}
            </span>
          )}
          <span className="text-primary font-bold text-sm">FCFA</span>
        </div>
        <div className="flex gap-3 mt-4">
          <div className="flex-1 rounded-xl bg-navy-deep p-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[10px] text-muted-foreground uppercase">Total Dépôts</span>
            </div>
            {isLoading ? <Skeleton className="h-5 w-16" /> : <span className="font-display font-bold text-foreground">{formatCFA(totalDeposited)} F</span>}
          </div>
          <div className="flex-1 rounded-xl bg-navy-deep p-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              <span className="text-[10px] text-muted-foreground uppercase">Total Retraits</span>
            </div>
            {isLoading ? <Skeleton className="h-5 w-16" /> : <span className="font-display font-bold text-foreground">{formatCFA(totalWithdrawn)} F</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 px-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                <Icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase">{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-4 rounded-3xl overflow-hidden">
        <img src={bannerImg} alt="VOGUE ASSET" className="w-full h-36 object-cover" width={1200} height={512} />
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-foreground">Transactions Récentes</h2>
          <button className="text-primary text-xs font-medium">Voir tout →</button>
        </div>
        <div className="rounded-2xl bg-secondary p-6 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Aucune transaction</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

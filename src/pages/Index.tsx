import { ArrowDownCircle, ArrowUpCircle, Gift, HelpCircle, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import bannerImg from "@/assets/car-banner.jpg";
import bonusImg from "@/assets/car-vip6.jpg";
import missionsImg from "@/assets/car-vip5.jpg";
import newModelImg from "@/assets/car-vip4.jpg";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Index = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  const balance = profile?.balance ?? 0;
  const earnings = profile?.total_deposited ?? 0;

  const quickActions = [
    { label: "Dépôt", icon: ArrowDownCircle, path: "/recharge" },
    { label: "Retrait", icon: ArrowUpCircle, path: "/retrait" },
    { label: "Cadeau", icon: Gift, path: "/team" },
    { label: "Aide", icon: HelpCircle, path: "/support" },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Hero banner with logo */}
      <div className="relative -mt-px">
        <img src={bannerImg} alt="NIO Asset" className="w-full h-44 object-cover" width={1600} height={640} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* Mon compte block */}
      <div className="mx-4 rounded-3xl bg-secondary p-4 border-gold-gradient card-glow -mt-16 relative">
        <h2 className="text-center font-display font-bold text-foreground text-lg mb-4">Mon compte</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl bg-navy-deep border-gold-gradient p-4">
            {isLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <p className="font-display font-bold text-foreground text-xl leading-tight">CFA {formatCFA(balance)}</p>
            )}
            <span className="text-muted-foreground text-xs">Solde</span>
          </div>
          <div className="rounded-2xl bg-navy-deep border-gold-gradient p-4">
            {isLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <p className="font-display font-bold text-foreground text-xl leading-tight">CFA {formatCFA(earnings)}</p>
            )}
            <span className="text-muted-foreground text-xs">Revenus cumulés</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/bonus")} className="relative rounded-2xl overflow-hidden h-24 group">
            <img src={bonusImg} alt="Bonus quotidien" className="absolute inset-0 w-full h-full object-cover" loading="lazy" width={1024} height={1024} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <span className="absolute bottom-2 left-3 font-display font-bold text-foreground text-sm">Bonus quotidien ›</span>
          </button>
          <button onClick={() => navigate("/missions")} className="relative rounded-2xl overflow-hidden h-24 group">
            <img src={missionsImg} alt="Centre de missions" className="absolute inset-0 w-full h-full object-cover" loading="lazy" width={1024} height={1024} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <span className="absolute bottom-2 left-3 font-display font-bold text-foreground text-sm">Centre de missions ›</span>
          </button>
        </div>
      </div>

      {/* Notification bar */}
      <div className="mx-4 rounded-2xl bg-secondary border border-border px-4 py-3 flex items-center gap-3 overflow-hidden">
        <Bell className="w-4 h-4 text-primary shrink-0" />
        <p className="text-muted-foreground text-xs truncate">
          ****2540 a recharge 35,000 • ****1531 a retire 12,000 • ****1698 a active VIP3
        </p>
      </div>

      {/* Actions rapides */}
      <div className="mx-4 rounded-2xl bg-secondary border border-border py-4 grid grid-cols-4 gap-2">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-full bg-navy-deep flex items-center justify-center">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <span className="text-xs text-foreground">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* R&D stats */}
      <div className="px-4">
        <p className="text-center text-muted-foreground text-sm mb-3">Réalisations en R&D technologique et brevets</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: "7", label: "Pays" },
            { value: "11,000+", label: "Ingénieurs R&D" },
            { value: "12", label: "Domaines" },
            { value: "9300+", label: "Brevets" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display font-bold text-primary text-lg">{s.value}</p>
              <p className="text-muted-foreground text-[10px] leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured */}
      <div className="mx-4 relative rounded-3xl overflow-hidden h-40">
        <img src={newModelImg} alt="Nouveaux modèles" className="absolute inset-0 w-full h-full object-cover" loading="lazy" width={1024} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
          <h3 className="font-display font-extrabold text-foreground text-2xl">Nouveaux modèles<br/>NIO ES6</h3>
        </div>
      </div>
    </div>
  );
};

export default Index;

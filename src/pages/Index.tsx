import {
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  HelpCircle,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import bannerImg from "@/assets/pc-banner.jpg";
import bonusImg from "@/assets/pc-vip6.jpg";
import missionsImg from "@/assets/pc-vip5.jpg";
import newModelImg from "@/assets/pc-vip4.jpg";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Index = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  const balance = profile?.balance ?? 0;
  const earnings = profile?.total_deposited ?? 0;

  const quickActions = [
    { label: "Dépôt", icon: ArrowDownCircle, path: "/recharge" },
    { label: "Retrait", icon: ArrowUpCircle, path: "/retrait" },
    { label: "Cadeau", icon: Gift, path: "/promo" },
    { label: "Aide", icon: HelpCircle, path: "/support" },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Hero banner with logo */}
      <div className="relative -mt-px">
        <img
          src={bannerImg}
          alt="PixelVest"
          className="w-full h-44 object-cover"
          width={1600}
          height={640}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* Mon compte block */}
      <div className="mx-4 rounded-3xl bg-secondary p-4 border-gold-gradient card-glow -mt-16 relative">
        <h2 className="text-center font-display font-bold text-foreground text-lg mb-4">
          Mon compte
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl bg-navy-deep border-gold-gradient p-4">
            {isLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <p className="font-display font-bold text-foreground text-xl leading-tight">
                CFA {formatCFA(balance)}
              </p>
            )}
            <span className="text-muted-foreground text-xs">Solde</span>
          </div>
          <div className="rounded-2xl bg-navy-deep border-gold-gradient p-4">
            {isLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <p className="font-display font-bold text-foreground text-xl leading-tight">
                CFA {formatCFA(earnings)}
              </p>
            )}
            <span className="text-muted-foreground text-xs">
              Revenus cumulés
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/bonus")}
            className="relative rounded-2xl overflow-hidden h-24 group"
          >
            <img
              src={bonusImg}
              alt="Bonus quotidien"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <span className="absolute bottom-2 left-3 font-display font-bold text-foreground text-sm">
              Bonus quotidien ›
            </span>
          </button>
          <button
            onClick={() => navigate("/missions")}
            className="relative rounded-2xl overflow-hidden h-24 group"
          >
            <img
              src={missionsImg}
              alt="Centre de missions"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <span className="absolute bottom-2 left-3 font-display font-bold text-foreground text-sm">
              Centre de missions ›
            </span>
          </button>
        </div>
      </div>

      {/* Notification bar — défilement infini */}
      <div className="mx-4 rounded-2xl bg-secondary border border-border px-4 py-3 flex items-center gap-3 overflow-hidden">
        <Bell className="w-4 h-4 text-primary shrink-0" />
        <div className="relative flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="text-muted-foreground text-xs pr-12">
              ****2540 a rechargé 35,000 • ****1531 a retiré 12,000 • ****1698 a
              activé VIP3 • ****8821 a rechargé 50,000 • ****7732 a retiré 8,500
              • ****4410 a activé VIP4
            </span>
            <span
              className="text-muted-foreground text-xs pr-12"
              aria-hidden="true"
            >
              ****2540 a rechargé 35,000 • ****1531 a retiré 12,000 • ****1698 a
              activé VIP3 • ****8821 a rechargé 50,000 • ****7732 a retiré 8,500
              • ****4410 a activé VIP4
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/units")}
        className="mx-4 w-[calc(100%-2rem)] text-left rounded-3xl overflow-hidden relative group bg-gradient-to-br from-primary/30 via-navy-deep to-destructive/30 border-gold-gradient card-glow"
      >
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.6),transparent_60%)]" />
        <div className="relative p-4 flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-navy-deep border-gold-gradient flex items-center justify-center">
            <ChevronRight className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Catalogue produits
              </span>
            </div>
            <h3 className="font-display font-extrabold text-foreground text-base leading-tight">
              Découvrez les produits disponibles
            </h3>
            <p className="text-muted-foreground text-xs mt-1 leading-snug">
              Consultez le catalogue et choisissez le produit qui vous convient.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary shrink-0" />
        </div>
      </button>

      {/* Actions rapides */}
      <div className="mx-4 rounded-2xl bg-secondary border border-border py-4 grid grid-cols-4 gap-2">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-1.5"
            >
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
        <p className="text-center text-muted-foreground text-sm mb-3">
          Réalisations en R&D technologique et brevets
        </p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: "5", label: "Pays" },
            { value: "11,000+", label: "Ingénieurs R&D" },
            { value: "12", label: "Domaines" },
            { value: "9300+", label: "Brevets" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display font-bold text-primary text-lg">
                {s.value}
              </p>
              <p className="text-muted-foreground text-[10px] leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured */}
      <div className="mx-4 relative rounded-3xl overflow-hidden h-40">
        <img
          src={newModelImg}
          alt="Nouveaux modèles"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          width={1024}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
          <h3 className="font-display font-extrabold text-foreground text-2xl">
            Nouvelles machines
            <br />
            PixelVest
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Index;

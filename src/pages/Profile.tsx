import {
  ArrowDownCircle, ArrowUpCircle, History, Info, FileText,
  Headphones, Download, CreditCard, Lock, Gift, Package, Ticket,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import pcHero from "@/assets/pc-vip2.jpg";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: isAdmin } = useAdmin();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Utilisateur";
  const balance = profile?.balance ?? 0;
  const earnings = profile?.total_deposited ?? 0;

  const topActions = [
    { label: "Recharger", icon: ArrowDownCircle, path: "/recharge" },
    { label: "Retirer", icon: ArrowUpCircle, path: "/retrait" },
    { label: "Historique", icon: History, path: "/retrait-history" },
  ];

  const shortcuts = [
    { label: "Mes produits", icon: Package, path: "/my-products" },
    { label: "Code promo", icon: Ticket, path: "/promo" },
    { label: "À propos", icon: Info, path: "/about" },
    { label: "Réglementation", icon: FileText, path: "/rules" },
    { label: "Historique", icon: History, path: "/retrait-history" },
    { label: "Service client", icon: Headphones, path: "/support" },
    { label: "Télécharger l'app", icon: Download, path: "/download" },
    { label: "Lier une carte bancaire", icon: CreditCard, path: "/retrait" },
    { label: "Changer le mot de passe", icon: Lock, path: "/about" },
    { label: "GIFT", icon: Gift, path: "/bonus" },
  ];

  return (
    <div className="pb-24">
      {/* Hero with tech background */}
      <div className="relative h-64">
        <img src={pcHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-background" />
        <div className="relative z-10 px-5 pt-6 flex justify-between items-start">
          <div>
            <h1 className="font-display font-extrabold text-foreground text-4xl">Bonjour,</h1>
            {isLoading ? (
              <Skeleton className="h-6 w-40 mt-2" />
            ) : (
              <p className="text-muted-foreground text-xl mt-1">{displayName}</p>
            )}
            <span className="inline-block mt-3 px-3 py-1 border border-border rounded-md text-foreground text-sm font-display">LV0</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-300 via-orange-200 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-background" fill="currentColor">
              <path d="M3 14 L12 6 L21 14 L17 14 L12 10 L7 14 Z M5 17 L9 17 L9 19 L5 19 Z M15 17 L19 17 L19 19 L15 19 Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Top actions */}
      <div className="grid grid-cols-3 gap-2 px-4 -mt-6 relative z-10">
        {topActions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-2 py-3">
              <Icon className="w-9 h-9 text-foreground" strokeWidth={1.4} />
              <span className="text-sm text-foreground">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {[
          { label: "Solde", value: balance },
          { label: "Revenus cumulés", value: earnings },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-navy-deep border-gold-gradient p-5">
            {isLoading ? (
              <Skeleton className="h-7 w-24 mb-2" />
            ) : (
              <p className="font-display font-bold text-foreground text-2xl leading-tight">CFA {formatCFA(c.value)}</p>
            )}
            <p className="text-muted-foreground text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Shortcuts grid */}
      <div className="grid grid-cols-4 gap-y-6 gap-x-2 px-4 mt-6">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => navigate(s.path)}
              className="flex flex-col items-center gap-2 text-center"
            >
              <Icon className="w-8 h-8 text-foreground" strokeWidth={1.4} />
              <span className="text-[11px] text-foreground leading-tight">{s.label}</span>
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="px-4 mt-6">
          <button
            onClick={() => navigate("/admin")}
            className="w-full bg-primary/10 border border-primary/30 text-primary font-bold py-3 rounded-2xl"
          >
            Dashboard Admin
          </button>
        </div>
      )}

      <div className="px-4 mt-6">
        <button
          onClick={async () => { await signOut(); navigate("/auth"); }}
          className="w-full bg-destructive/10 border border-destructive/30 text-destructive font-bold py-3 rounded-2xl"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Profile;

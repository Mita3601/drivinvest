import {
  ChevronRight,
  Users,
  Package,
  Gift,
  UserPlus,
  Smartphone,
  Settings,
  Download,
  User as UserIcon,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: isAdmin } = useAdmin();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Utilisateur";

  // VIP tier from total invested / balance thresholds (simple derivation)
  const total = Number(profile?.total_deposited ?? 0);
  const currentVip =
    total >= 500000 ? 5 : total >= 100000 ? 4 : total >= 50000 ? 3 : total >= 20000 ? 2 : total >= 5000 ? 1 : 0;
  const nextVip = currentVip + 1;

  const menu = [
    { label: "Mon équipe", icon: Users, path: "/team" },
    { label: "Mon Produit", icon: Package, path: "/my-products" },
    { label: "Échangeur Récompense", icon: Gift, path: "/promo" },
    { label: "Invitateur Des Amis", icon: UserPlus, path: "/invite" },
    { label: "Argent Mobile", icon: Smartphone, path: "/link-account" },
    { label: "Paramètres", icon: Settings, path: "/about" },
    { label: "Téléchargement Application", icon: Download, path: "/download" },
  ];

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* Profile card */}
      <div className="mx-4 mt-5 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary to-primary/5 border border-primary/20 p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-background border-4 border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
            <UserIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <p className="font-display font-bold text-foreground text-lg truncate">{displayName}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="inline-flex items-center gap-1 bg-primary text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                VIP{currentVip}
              </div>
              <span className="text-primary text-sm">
                Suivant VIP: <span className="font-bold">VIP{nextVip}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-display font-extrabold text-sm shrink-0">
            VIP{nextVip}
          </div>
          <p className="text-primary text-sm">
            Louez n'importe quel produit et débloquez VIP{nextVip}
          </p>
        </div>
      </div>

      {/* Menu list */}
      <div className="mx-4 mt-4 space-y-2.5">
        {menu.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.label}
              onClick={() => navigate(m.path)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-4 hover:bg-secondary/60 transition-colors"
            >
              <Icon className="w-5 h-5 text-primary shrink-0" strokeWidth={2} />
              <span className="flex-1 text-left text-foreground text-[15px]">{m.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate("/admin")}
            className="w-full bg-primary/10 border border-primary/30 text-primary font-bold py-3 rounded-2xl"
          >
            Dashboard Admin
          </button>
        </div>
      )}

      <div className="px-4 mt-4">
        <button
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="w-full bg-destructive/10 border border-destructive/30 text-destructive font-bold py-3 rounded-2xl"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Profile;

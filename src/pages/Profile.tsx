import { Wallet, TrendingUp, ArrowDownCircle, Shield, Phone, Globe, Hash, Lock, Copy, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !", description: "Copié dans le presse-papier." });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pb-24 px-4 pt-8">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-28 h-28 rounded-3xl" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-28 rounded-2xl" />
          <Skeleton className="flex-1 h-28 rounded-2xl" />
          <Skeleton className="flex-1 h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Utilisateur";
  const balance = profile?.balance ?? 0;
  const deposited = profile?.total_deposited ?? 0;
  const withdrawn = profile?.total_withdrawn ?? 0;
  const refCode = profile?.referral_code || "—";

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col items-center pt-8 pb-2">
        <div className="w-28 h-28 rounded-3xl bg-success flex items-center justify-center mb-3 shadow-lg shadow-success/20">
          <span className="font-display font-extrabold text-5xl text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="flex items-center gap-1.5 bg-secondary border border-border text-success text-xs font-bold px-3 py-1.5 rounded-full mb-2">
          <Shield className="w-3.5 h-3.5" /> VÉRIFIÉ
        </span>
        <h1 className="font-display font-bold text-xl text-foreground">{displayName}</h1>
        <p className="text-muted-foreground text-xs mt-0.5">🗓 Membre depuis Récemment</p>
      </div>

      <div className="flex gap-3 px-4">
        {[
          { label: "SOLDE", value: formatCFA(balance), icon: Wallet, color: "text-primary", bgColor: "bg-primary/15" },
          { label: "DÉPOSÉ", value: formatCFA(deposited), icon: TrendingUp, color: "text-success", bgColor: "bg-success/15" },
          { label: "RETIRÉ", value: formatCFA(withdrawn), icon: ArrowDownCircle, color: "text-destructive", bgColor: "bg-destructive/15" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex-1 rounded-2xl bg-secondary border border-border p-4 flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">{stat.label}</span>
              <p className="font-display font-bold text-foreground text-base">
                {stat.value} <span className="text-xs text-muted-foreground">F</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-base text-foreground">Espace Promoteur</p>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">COMPTE STANDARD</p>
          </div>
          <button className="bg-destructive text-destructive-foreground text-xs font-bold px-4 py-2 rounded-xl">
            ACTIVER
          </button>
        </div>
        <p className="text-muted-foreground text-xs italic leading-relaxed">
          Devenez promoteur pour débloquer des commissions bonus et des outils avancés.
        </p>
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border divide-y divide-border overflow-hidden">
        {[
          { icon: Hash, label: "Code Parrainage", value: refCode, copyable: true, iconColor: "text-primary", iconBg: "bg-primary/15" },
          { icon: Globe, label: "Email", value: user?.email || "—", iconColor: "text-success", iconBg: "bg-success/15" },
          { icon: Shield, label: "Statut Compte", value: "Vérifié", isStatus: true, iconColor: "text-success", iconBg: "bg-success/15" },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 px-4 py-4">
              <div className={`w-10 h-10 rounded-full ${row.iconBg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${row.iconColor}`} />
              </div>
              <span className="text-sm text-foreground flex-1">{row.label}</span>
              <div className="flex items-center gap-2">
                {row.isStatus ? (
                  <span className="text-success text-sm font-bold border border-success/30 bg-success/10 px-2.5 py-0.5 rounded-md">{row.value}</span>
                ) : (
                  <span className="text-foreground text-sm font-semibold">{row.value}</span>
                )}
                {row.copyable && (
                  <button onClick={() => copyToClipboard(row.value)} className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-sm text-foreground">Réinvestissement Auto</p>
          <p className="text-muted-foreground text-xs">Réinvestit vos profits automatiquement</p>
        </div>
        <Switch />
      </div>

      <div className="mx-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive font-bold py-3 rounded-2xl"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Profile;

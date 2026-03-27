import { Wallet, TrendingUp, ArrowDownCircle, Shield, Phone, Globe, Hash, ToggleLeft } from "lucide-react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const Profile = () => {
  const user = {
    name: "Utilisateur",
    id: "#001",
    phone: "70000000",
    country: "Burkina Faso",
    verified: true,
    balance: 0,
    deposited: 0,
    withdrawn: 0,
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Avatar */}
      <div className="flex flex-col items-center pt-6">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-2">
          <span className="font-display font-extrabold text-3xl text-primary-foreground">
            {user.name.charAt(0)}
          </span>
        </div>
        {user.verified && (
          <span className="flex items-center gap-1 bg-success/20 text-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
            <Shield className="w-3 h-3" /> Vérifié
          </span>
        )}
        <h1 className="font-display font-bold text-xl text-foreground mt-2">{user.name}</h1>
        <p className="text-muted-foreground text-xs">Membre depuis récemment</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4">
        {[
          { label: "Solde", value: `${formatCFA(user.balance)} F`, icon: Wallet, color: "text-primary" },
          { label: "Déposé", value: `${formatCFA(user.deposited)} F`, icon: TrendingUp, color: "text-success" },
          { label: "Retiré", value: `${formatCFA(user.withdrawn)} F`, icon: ArrowDownCircle, color: "text-destructive" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex-1 rounded-2xl bg-secondary p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase">{stat.label}</span>
              <p className="font-display font-bold text-foreground text-sm">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mx-4 rounded-3xl bg-secondary divide-y divide-border">
        {[
          { icon: Hash, label: "ID Utilisateur", value: user.id },
          { icon: Globe, label: "Pays", value: user.country },
          { icon: Phone, label: "Téléphone", value: user.phone },
          { icon: Shield, label: "Statut Compte", value: user.verified ? "Vérifié" : "Non vérifié", isStatus: true },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-navy-deep flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground flex-1">{row.label}</span>
              {row.isStatus ? (
                <span className="text-success text-xs font-bold">{row.value}</span>
              ) : (
                <span className="text-muted-foreground text-sm">{row.value}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto Reinvest */}
      <div className="mx-4 rounded-3xl bg-secondary p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-sm text-foreground">Réinvestissement Auto</p>
          <p className="text-muted-foreground text-xs">Réinvestit vos profits automatiquement</p>
        </div>
        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
      </div>
    </div>
  );
};

export default Profile;

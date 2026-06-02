import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Users, ArrowDownCircle, ArrowUpCircle, ShoppingBag, ArrowLeft, Star, Network, ShieldAlert, Wallet, Ticket } from "lucide-react";

const tabs = [
  { path: "/admin", label: "Utilisateurs", icon: Users },
  { path: "/admin/deposits", label: "Dépôts", icon: ArrowDownCircle },
  { path: "/admin/withdrawals", label: "Retraits", icon: ArrowUpCircle },
  { path: "/admin/products", label: "Produits", icon: ShoppingBag },
  { path: "/admin/investments", label: "Investissements", icon: Wallet },
  { path: "/admin/promo-codes", label: "Codes promo", icon: Ticket },
  { path: "/admin/promoters", label: "Promoteurs", icon: Star },
  { path: "/admin/referrals", label: "Filleuls", icon: Network },
  { path: "/admin/antifraud", label: "Antifraude", icon: ShieldAlert },
];

const AdminLayout = () => {
  const { data: isAdmin, isLoading } = useAdmin();
  const { loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background max-w-4xl mx-auto">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-xl text-gradient-gold">Admin Panel</h1>
      </div>

      <div className="flex gap-1 px-4 pb-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <main className="px-4 pb-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

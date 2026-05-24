import { Home, Users, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const NioIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M3 14 L12 6 L21 14 L17 14 L12 10 L7 14 Z M5 17 L9 17 L9 19 L5 19 Z M15 17 L19 17 L19 19 L15 19 Z" />
  </svg>
);

const tabs = [
  { path: "/", label: "Accueil", icon: Home },
  { path: "/units", label: "Produit", icon: NioIcon },
  { path: "/team", label: "Equipes", icon: Users },
  { path: "/profile", label: "Mon compte", icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-deep border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

import { Bell } from "lucide-react";

const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-navy-deep border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="font-display font-bold text-primary-foreground text-sm">VA</span>
        </div>
        <span className="font-display font-bold text-lg text-gradient-gold">VOGUE ASSET</span>
      </div>
      <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
      </button>
    </header>
  );
};

export default AppHeader;

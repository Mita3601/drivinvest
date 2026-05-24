import { Bell } from "lucide-react";

const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-navy-deep border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-gold-dim flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground" fill="currentColor">
            <path d="M3 14 L12 6 L21 14 L17 14 L12 10 L7 14 Z M5 17 L9 17 L9 19 L5 19 Z M15 17 L19 17 L19 19 L15 19 Z" />
          </svg>
        </div>
        <span className="font-display font-bold text-lg text-gradient-gold">NIO ASSET</span>
      </div>
      <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
      </button>
    </header>
  );
};

export default AppHeader;

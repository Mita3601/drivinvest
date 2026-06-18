import { Bell } from "lucide-react";
import logo from "@/assets/pixelvest-logo.png";

const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-navy-deep border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden">
          <img src={logo} alt="PixelVest" className="w-full h-full object-contain" />
        </div>
        <span className="font-display font-bold text-lg text-gradient-gold">PixelVest</span>
      </div>
      <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
      </button>
    </header>
  );
};

export default AppHeader;

import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";

const NO_HEADER = ["/profile", "/retrait-history", "/bonus", "/missions"];

const AppLayout = () => {
  const { pathname } = useLocation();
  const hideHeader = NO_HEADER.includes(pathname);
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {!hideHeader && <AppHeader />}
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;

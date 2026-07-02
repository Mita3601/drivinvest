import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import Units from "./pages/Units";
import Team from "./pages/Team";
import ReferralsList from "./pages/ReferralsList";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import RechargePage from "./pages/RechargePage";
import RechargeReturn from "./pages/RechargeReturn";
import RetraitPage from "./pages/RetraitPage";
import LinkAccount from "./pages/LinkAccount";
import SupportPage from "./pages/SupportPage";
import AboutPage from "./pages/AboutPage";
import RulesPage from "./pages/RulesPage";
import DownloadPage from "./pages/DownloadPage";
import WithdrawalHistory from "./pages/WithdrawalHistory";
import BonusQuotidien from "./pages/BonusQuotidien";
import CentreMissions from "./pages/CentreMissions";
import MyProducts from "./pages/MyProducts";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPromoters from "./pages/admin/AdminPromoters";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminAntifraud from "./pages/admin/AdminAntifraud";
import AdminInvestments from "./pages/admin/AdminInvestments";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import PromoCode from "./pages/PromoCode";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const ProtectedLayout = () => (
  <ProtectedRoute>
    <AppLayout />
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <HashRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/units" element={<Units />} />
              <Route path="/team" element={<Team />} />
              <Route path="/team/referrals" element={<ReferralsList />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/recharge" element={<RechargePage />} />
              <Route path="/recharge/return" element={<RechargeReturn />} />
              <Route path="/retrait" element={<RetraitPage />} />
              <Route path="/link-account" element={<LinkAccount />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/retrait-history" element={<WithdrawalHistory />} />
              <Route path="/bonus" element={<BonusQuotidien />} />
              <Route path="/missions" element={<CentreMissions />} />
              <Route path="/my-products" element={<MyProducts />} />
              <Route path="/promo" element={<PromoCode />} />
            </Route>
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminUsers />} />
              <Route path="deposits" element={<AdminDeposits />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="investments" element={<AdminInvestments />} />
              <Route path="promo-codes" element={<AdminPromoCodes />} />
              <Route path="promoters" element={<AdminPromoters />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="antifraud" element={<AdminAntifraud />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

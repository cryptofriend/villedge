import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortoProvider } from "@/components/PortoProvider";
import { SolanaProvider } from "@/components/SolanaProvider";
import { PrivyProvider } from "@/components/PrivyProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { getVillageSlugFromDomain, isCustomVillageDomain } from "@/lib/domainMapping";
import Index from "./pages/Index";
import Village from "./pages/Village";
import EditVillage from "./pages/EditVillage";
import Embed from "./pages/Embed";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminAnalyticsPage from "./pages/AdminAnalytics";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TelegramCallback from "./pages/TelegramCallback";
import { UserProfilePopupProvider } from "@/components/profile/UserProfilePopup";

const queryClient = new QueryClient();

/**
 * When accessed via a custom village domain (e.g. proofofretreat.me),
 * the root "/" renders the Village component directly for that village.
 * All non-village routes (admin, profile, etc.) redirect to root.
 */
const isCustomDomain = isCustomVillageDomain(window.location.hostname);
const customVillageSlug = getVillageSlugFromDomain(window.location.hostname);

/** Wrapper that injects the village slug from the domain mapping */
const CustomDomainVillage = () => <Village overrideVillageSlug={customVillageSlug!} />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PrivyProvider>
        <PortoProvider>
          <SolanaProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  {isCustomDomain ? (
                    <Routes>
                      <Route path="/" element={<CustomDomainVillage />} />
                      <Route path="/about" element={<CustomDomainVillage />} />
                      <Route path="/map" element={<CustomDomainVillage />} />
                      <Route path="/residents" element={<CustomDomainVillage />} />
                      <Route path="/scenius" element={<CustomDomainVillage />} />
                      <Route path="/events" element={<CustomDomainVillage />} />
                      <Route path="/edit" element={<EditVillage overrideVillageSlug={customVillageSlug!} />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/telegram-callback" element={<TelegramCallback />} />
                      <Route path="/embed" element={<Embed />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  ) : (
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/embed" element={<Embed />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/telegram-callback" element={<TelegramCallback />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                      <Route path="/profile/:username" element={<Profile />} />
                      {/* Village routes with category deep links */}
                      <Route path="/:villageSlug" element={<Village />} />
                      <Route path="/:villageSlug/about" element={<Village />} />
                      <Route path="/:villageSlug/edit" element={<EditVillage />} />
                      <Route path="/:villageSlug/map" element={<Village />} />
                      <Route path="/:villageSlug/residents" element={<Village />} />
                      <Route path="/:villageSlug/scenius" element={<Village />} />
                      <Route path="/:villageSlug/bulletin" element={<Village />} />
                      <Route path="/:villageSlug/events" element={<Village />} />
                      <Route path="/:villageSlug/treasury" element={<Village />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  )}
                </BrowserRouter>
              </TooltipProvider>
          </SolanaProvider>
        </PortoProvider>
      </PrivyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

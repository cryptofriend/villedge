import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortoProvider } from "@/components/PortoProvider";
import { SolanaProvider } from "@/components/SolanaProvider";
import { PrivyProvider } from "@/components/PrivyProvider";
import { TonProvider } from "@/components/TonProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { getVillageSlugFromDomain, isCustomVillageDomain } from "@/lib/domainMapping";
import { UserProfilePopupProvider } from "@/components/profile/UserProfilePopup";
import { ContactDevButton } from "@/components/ContactDevButton";

// Eager: Index is the landing page; load instantly for fast LCP
import Index from "./pages/Index";

// Lazy: only loaded when the user navigates to these routes
const Village = lazy(() => import("./pages/Village"));
const EditVillage = lazy(() => import("./pages/EditVillage"));
const Embed = lazy(() => import("./pages/Embed"));
const Widget = lazy(() => import("./pages/Widget"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalytics"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TelegramCallback = lazy(() => import("./pages/TelegramCallback"));
const WorldCallback = lazy(() => import("./pages/WorldCallback"));
const About = lazy(() => import("./pages/About"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid refetch storms on tab focus / network reconnect
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Consider data fresh for 30s -> fewer duplicate requests across components
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * When accessed via a custom village domain (e.g. proofofretreat.me),
 * the root "/" renders the Village component directly for that village.
 * All non-village routes (admin, profile, etc.) redirect to root.
 */
const isCustomDomain = isCustomVillageDomain(window.location.hostname);
const customVillageSlug = getVillageSlugFromDomain(window.location.hostname);

/** Wrapper that injects the village slug from the domain mapping */
const CustomDomainVillage = () => <Village overrideVillageSlug={customVillageSlug!} />;

/**
 * /embed and /widget are public, embeddable views.
 * They do not need auth or any wallet provider — skip them to keep
 * those bundles tiny and avoid pulling in Privy / Solana / Wagmi / Ton.
 */
const isLightweightEmbedRoute = (() => {
  const p = window.location.pathname;
  return p.startsWith("/embed") || p.startsWith("/widget");
})();

const SuspenseFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background" />
);

const AppRoutes = () => (
  <BrowserRouter>
    <UserProfilePopupProvider>
      <Suspense fallback={<SuspenseFallback />}>
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
            <Route path="/auth/world-callback" element={<WorldCallback />} />
            <Route path="/embed" element={<Embed />} />
            <Route path="/widget" element={<Widget />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/embed" element={<Embed />} />
            <Route path="/about" element={<About />} />
            <Route path="/widget" element={<Widget />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/telegram-callback" element={<TelegramCallback />} />
            <Route path="/auth/world-callback" element={<WorldCallback />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
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
      </Suspense>
    </UserProfilePopupProvider>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {isLightweightEmbedRoute ? (
          // Embed/Widget: skip wallet providers entirely to keep bundle minimal
          <AppRoutes />
        ) : (
          <PrivyProvider>
            <PortoProvider>
              <SolanaProvider>
                <TonProvider>
                  <AppRoutes />
                </TonProvider>
              </SolanaProvider>
            </PortoProvider>
          </PrivyProvider>
        )}
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

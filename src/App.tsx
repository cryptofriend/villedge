import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PortoProvider } from "@/components/PortoProvider";
import { SolanaProvider } from "@/components/SolanaProvider";
import { TonProvider } from "@/components/TonProvider";
import { PrivyProvider } from "@/components/PrivyProvider";
import Index from "./pages/Index";
import Village from "./pages/Village";
import Embed from "./pages/Embed";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminAnalyticsPage from "./pages/AdminAnalytics";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TelegramCallback from "./pages/TelegramCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PrivyProvider>
      <PortoProvider>
        <SolanaProvider>
          <TonProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
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
                  <Route path="/:villageSlug/map" element={<Village />} />
                  <Route path="/:villageSlug/residents" element={<Village />} />
                  <Route path="/:villageSlug/scenius" element={<Village />} />
                  <Route path="/:villageSlug/bulletin" element={<Village />} />
                  <Route path="/:villageSlug/events" element={<Village />} />
                  <Route path="/:villageSlug/treasury" element={<Village />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </TonProvider>
        </SolanaProvider>
      </PortoProvider>
    </PrivyProvider>
  </QueryClientProvider>
);

export default App;

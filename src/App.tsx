import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Village from "./pages/Village";
import EditVillage from "./pages/EditVillage";
import Embed from "./pages/Embed";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminAnalyticsPage from "./pages/AdminAnalytics";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/embed" element={<Embed />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/profile/:username" element={<Profile />} />
            {/* Village routes with category deep links */}
            <Route path="/:villageSlug" element={<Village />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

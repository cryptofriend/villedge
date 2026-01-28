import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, Bot } from "lucide-react";
import { AdminAnalytics as AdminAnalyticsComponent } from "@/components/admin/AdminAnalytics";

const ADMIN_USER_IDS = [
  "9807c494-ba07-4438-9a89-07ac13334e78", // dev
  "b015441b-3bb4-4150-94e6-d8be048035bb", // booga
];

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || !ADMIN_USER_IDS.includes(user.id)) {
        navigate("/");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, navigate]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Platform analytics & insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value="analytics" className="mb-6">
          <TabsList>
            <TabsTrigger 
              value="bots" 
              onClick={() => navigate("/admin")}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              Bots
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Analytics Content */}
        <AdminAnalyticsComponent />
      </div>
    </div>
  );
}

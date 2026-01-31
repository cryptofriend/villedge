import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Bot, Bell, Save, Loader2, Settings, 
  MapPin, Globe, Activity, CheckCircle2, 
  Clock, Wallet, MessageSquare, Send, Calendar, Users, BarChart3
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AdminAIChat } from "@/components/admin/AdminAIChat";
import { BotNotificationSection } from "@/components/admin/BotNotificationSection";

const TelegramIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface VillageStats {
  id: string;
  name: string;
  wallet_address: string | null;
  solana_wallet_address: string | null;
  logo_url: string | null;
}

interface NotificationStats {
  totalNotified: number;
  last24h: number;
}

interface NotificationRoute {
  id: string;
  village_id: string;
  notification_type: string;
  chat_id: string;
  thread_id: number | null;
  is_enabled: boolean;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const navigate = useNavigate();
  
  // Settings state
  const [chatId, setChatId] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  
  // Stats state
  const [villages, setVillages] = useState<VillageStats[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({ totalNotified: 0, last24h: 0 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSpots, setTotalSpots] = useState(0);
  
  // Notification routes state
  const [notificationRoutes, setNotificationRoutes] = useState<NotificationRoute[]>([]);

  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        navigate("/");
      }
    }
  }, [user, loading, isAdmin, navigate]);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin || loading) return;
      
      try {
        // Fetch settings
        const { data: settingsData } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "telegram_chat_id")
          .maybeSingle();
        
        if (settingsData) {
          setChatId(settingsData.value || "");
        }

        // Fetch villages with wallets
        const { data: villagesData } = await supabase
          .from("villages")
          .select("id, name, wallet_address, solana_wallet_address, logo_url")
          .order("created_at", { ascending: false });
        
        if (villagesData) {
          setVillages(villagesData);
        }

        // Fetch notification stats
        const { count: totalNotified } = await supabase
          .from("notified_donations")
          .select("*", { count: "exact", head: true });

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: last24h } = await supabase
          .from("notified_donations")
          .select("*", { count: "exact", head: true })
          .gte("notified_at", oneDayAgo);

        setNotificationStats({
          totalNotified: totalNotified || 0,
          last24h: last24h || 0
        });

        // Fetch user count from profiles
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        setTotalUsers(usersCount || 0);

        // Fetch spots count
        const { count: spotsCount } = await supabase
          .from("spots")
          .select("*", { count: "exact", head: true });
        
        setTotalSpots(spotsCount || 0);

        // Fetch notification routes
        const { data: routesData } = await supabase
          .from("notification_routes")
          .select("*");
        
        if (routesData) {
          setNotificationRoutes(routesData as NotificationRoute[]);
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchData();
  }, [isAdmin, loading]);

  const handleSaveChatId = async () => {
    if (!chatId.trim()) {
      toast({
        title: "Validation Error",
        description: "Chat ID cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .update({ 
          value: chatId.trim(),
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq("key", "telegram_chat_id");
      
      if (error) throw error;
      
      toast({
        title: "Settings Saved",
        description: "Telegram Chat ID updated successfully"
      });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("notify-telegram", {
        body: {
          type: "test"
        }
      });

      if (error) throw error;

      toast({
        title: "Test Sent",
        description: "Check your Telegram chat for the message"
      });
    } catch (err: any) {
      console.error("Error sending test:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to send test message",
        variant: "destructive"
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const connectedVillages = villages.filter(v => v.wallet_address || v.solana_wallet_address);

  // Bot configurations
  const proofOfRetreatBot = {
    villageId: 'proof-of-retreat',
    villageName: 'Proof of Retreat',
    botUsername: '@proofofretreatbot',
    botTokenSecretName: 'TELEGRAM_BOT_TOKEN',
    isConnected: true,
    logoUrl: '/lovable-uploads/proof-of-retreat-logo.png',
    notificationTypes: [
      {
        type: 'donation' as const,
        label: 'Donation Alerts',
        description: 'Real-time alerts with ENS & transaction links',
        icon: <Wallet className="h-4 w-4 text-green-500" />,
        iconBg: 'bg-green-500/10',
        source: 'Treasury Tab',
        trigger: 'check-donations (cron 5min)',
        isActive: true,
        defaultChatId: '-1003580489932',
      },
      {
        type: 'bulletin' as const,
        label: 'Bulletin Posts',
        description: 'New community messages',
        icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
        iconBg: 'bg-blue-500/10',
        source: 'Bulletin Tab',
        trigger: 'useBulletin.addMessage()',
        isActive: true,
        defaultChatId: '-1003580489932',
        defaultThreadId: 734,
      },
      {
        type: 'daily_events' as const,
        label: 'Daily Events Digest',
        description: 'Morning summary at 00:01 AM VN',
        icon: <Calendar className="h-4 w-4 text-cyan-500" />,
        iconBg: 'bg-cyan-500/10',
        source: 'Events Table',
        trigger: 'notify-daily-events (00:01 VN)',
        isActive: true,
        defaultChatId: '-1003580489932',
        defaultThreadId: 71,
      },
      {
        type: 'weekly_events' as const,
        label: 'Weekly Events Digest',
        description: 'Sunday summary at 8 PM VN',
        icon: <Calendar className="h-4 w-4 text-purple-500" />,
        iconBg: 'bg-purple-500/10',
        source: 'Events Table',
        trigger: 'notify-weekly-events (Sun 8PM VN)',
        isActive: true,
        defaultChatId: '-1003580489932',
        defaultThreadId: 71,
      },
      {
        type: 'spot' as const,
        label: 'New Spots',
        description: 'Map location updates',
        icon: <MapPin className="h-4 w-4 text-orange-500" />,
        iconBg: 'bg-orange-500/10',
        source: 'Map Tab',
        trigger: 'Planned',
        isActive: false,
      },
      {
        type: 'resident' as const,
        label: 'New Residents',
        description: 'Join & stay notifications',
        icon: <Users className="h-4 w-4 text-purple-500" />,
        iconBg: 'bg-purple-500/10',
        source: 'Residents Tab',
        trigger: 'useStays.addStay()',
        isActive: false,
      },
    ]
  };

  const protovilleBot = {
    villageId: 'protoville',
    villageName: 'ProtoVille',
    botUsername: '@protovillebot',
    botTokenSecretName: 'PROTOVILLE_BOT_TOKEN',
    isConnected: true,
    logoUrl: villages.find(v => v.id === 'protoville')?.logo_url,
    notificationTypes: [
      {
        type: 'donation' as const,
        label: 'Donation Alerts',
        description: 'Real-time alerts with ENS & transaction links',
        icon: <Wallet className="h-4 w-4 text-green-500" />,
        iconBg: 'bg-green-500/10',
        source: 'Treasury Tab',
        trigger: 'check-donations (cron 5min)',
        isActive: false,
      },
      {
        type: 'bulletin' as const,
        label: 'Bulletin Posts',
        description: 'New community messages',
        icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
        iconBg: 'bg-blue-500/10',
        source: 'Bulletin Tab',
        trigger: 'useBulletin.addMessage()',
        isActive: false,
      },
      {
        type: 'daily_events' as const,
        label: 'Daily Events Digest',
        description: 'Morning summary at 00:01 AM VN',
        icon: <Calendar className="h-4 w-4 text-cyan-500" />,
        iconBg: 'bg-cyan-500/10',
        source: 'Events Table',
        trigger: 'notify-daily-events (00:01 VN)',
        isActive: false,
      },
      {
        type: 'weekly_events' as const,
        label: 'Weekly Events Digest',
        description: 'Sunday summary at 8 PM VN',
        icon: <Calendar className="h-4 w-4 text-purple-500" />,
        iconBg: 'bg-purple-500/10',
        source: 'Events Table',
        trigger: 'notify-weekly-events (Sun 8PM VN)',
        isActive: false,
      },
      {
        type: 'spot' as const,
        label: 'New Spots',
        description: 'Map location updates',
        icon: <MapPin className="h-4 w-4 text-orange-500" />,
        iconBg: 'bg-orange-500/10',
        source: 'Map Tab',
        trigger: 'Planned',
        isActive: false,
      },
      {
        type: 'resident' as const,
        label: 'New Residents',
        description: 'Join & stay notifications',
        icon: <Users className="h-4 w-4 text-purple-500" />,
        iconBg: 'bg-purple-500/10',
        source: 'Residents Tab',
        trigger: 'useStays.addStay()',
        isActive: false,
      },
    ]
  };

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
              <div className="p-2 bg-[#0088cc] rounded-lg">
                <TelegramIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Villedge Bot Admin</h1>
                <p className="text-sm text-muted-foreground">Telegram notification bot dashboard</p>
              </div>
            </div>
          </div>
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Online
          </Badge>
        </div>

        {/* Navigation Tabs */}
        <Tabs value="bots" className="mb-6">
          <TabsList>
            <TabsTrigger value="bots" className="gap-2">
              <Bot className="h-4 w-4" />
              Bots
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              onClick={() => navigate("/admin/analytics")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notificationStats.totalNotified}</p>
                  <p className="text-xs text-muted-foreground">Total Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notificationStats.last24h}</p>
                  <p className="text-xs text-muted-foreground">Last 24 Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{villages.length}</p>
                  <p className="text-xs text-muted-foreground">Total Villages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{connectedVillages.length}</p>
                  <p className="text-xs text-muted-foreground">With Wallets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Bot Config */}
          <div className="md:col-span-1 space-y-4">
            {/* Configuration Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Global Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chatId" className="text-xs">Fallback Chat ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="chatId"
                      placeholder="-100xxxxxxxxxx"
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                      disabled={loadingSettings || saving}
                      className="font-mono text-sm"
                    />
                    <Button 
                      onClick={handleSaveChatId} 
                      disabled={saving || loadingSettings}
                      size="icon"
                      variant="outline"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest || !chatId}
                >
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Test Message
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bot Token</span>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Set
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Notify Function</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">notify-telegram</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cron Schedule</span>
                  <span className="text-xs">Every 5 min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Users</span>
                  <span className="font-medium">{totalUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Spots</span>
                  <span className="font-medium">{totalSpots}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Connected Villages */}
          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Connected Villages
                  </CardTitle>
                  <Badge variant="secondary">{connectedVillages.length} with wallets</Badge>
                </div>
                <CardDescription>
                  Villages with treasury wallets configured for donation monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connectedVillages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No villages with wallets configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedVillages.map((village) => (
                      <div 
                        key={village.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/${village.id}`)}
                      >
                        {village.logo_url ? (
                          <img 
                            src={village.logo_url} 
                            alt={village.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{village.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {village.wallet_address && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                ETH
                              </Badge>
                            )}
                            {village.solana_wallet_address && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                SOL
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}

                {villages.filter(v => !v.wallet_address && !v.solana_wallet_address).length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Villages without wallets ({villages.filter(v => !v.wallet_address && !v.solana_wallet_address).length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {villages
                          .filter(v => !v.wallet_address && !v.solana_wallet_address)
                          .map((village) => (
                            <Badge 
                              key={village.id} 
                              variant="secondary"
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => navigate(`/${village.id}`)}
                            >
                              {village.name}
                            </Badge>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bot Notification Sections */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notification Bots
              </CardTitle>
              <Badge variant="secondary">Per-Village Configuration</Badge>
            </div>
            <CardDescription>
              Configure Telegram notification settings for each village bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BotNotificationSection 
              config={proofOfRetreatBot}
              notificationRoutes={notificationRoutes}
              setNotificationRoutes={setNotificationRoutes}
              globalChatId={chatId}
            />
            
            <BotNotificationSection 
              config={protovilleBot}
              notificationRoutes={notificationRoutes}
              setNotificationRoutes={setNotificationRoutes}
              globalChatId={chatId}
            />
          </CardContent>
        </Card>

        {/* AI Chat Assistant */}
        <div className="mt-6">
          <AdminAIChat />
        </div>
      </div>
    </div>
  );
}

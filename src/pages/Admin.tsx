import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bot, Bell, MessageSquare, Wallet, CheckCircle2, Save, Loader2, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BOOGA_USER_ID = "9807c494-ba07-4438-9a89-07ac13334e78";

const TelegramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Settings state
  const [chatId, setChatId] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || user.id !== BOOGA_USER_ID) {
        navigate("/");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, navigate]);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!isAuthorized) return;
      
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "telegram_chat_id")
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setChatId(data.value || "");
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchSettings();
  }, [isAuthorized]);

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

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const features = [
    {
      icon: Bell,
      title: "Donation Notifications",
      description: "Real-time alerts when someone donates to a village treasury",
      details: [
        "Donor name/address resolution (ENS, Basenames)",
        "Amount in token + USD value",
        "Chain identification",
        "Transaction explorer link",
        "Treasury balance update"
      ],
      status: "active"
    },
    {
      icon: MessageSquare,
      title: "New Spot Alerts",
      description: "Notifications when new spots are added to the map",
      details: [
        "Spot name and category",
        "Description preview",
        "Direct link to map"
      ],
      status: "active"
    },
    {
      icon: MessageSquare,
      title: "Event Notifications",
      description: "Alerts for new events added to villages",
      details: [
        "Event title and date/time",
        "Location information",
        "Description preview"
      ],
      status: "active"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Manage integrations and configurations</p>
          </div>
        </div>

        {/* Telegram Integration Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0088cc]/10 rounded-lg">
                  <TelegramIcon />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Telegram Bot Integration
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Automated notifications via Telegram bot
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Editable Chat ID */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chatId">Telegram Chat ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="chatId"
                        placeholder="Enter Telegram Chat ID"
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        disabled={loadingSettings || saving}
                        className="font-mono"
                      />
                      <Button 
                        onClick={handleSaveChatId} 
                        disabled={saving || loadingSettings}
                        size="icon"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The chat or group ID where notifications will be sent
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Connection Details
                </h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bot Token</span>
                    <span className="font-mono">••••••••••••••••</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Edge Function</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">notify-telegram</code>
                  </div>
                </div>
              </div>

              {/* Donation Check Cron */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Donation Monitoring
                </h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Edge Function</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">check-donations</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule</span>
                    <span>Every 5 minutes (cron)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deduplication</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">notified_donations</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <h2 className="text-lg font-semibold mb-4">Active Features</h2>
        <div className="grid gap-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{feature.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {feature.description}
                    </p>
                    <ul className="text-sm space-y-1">
                      {feature.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Technical Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Technical Architecture</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Secrets:</strong> TELEGRAM_BOT_TOKEN stored in Cloud secrets
            </p>
            <p>
              <strong>Settings:</strong> Chat ID stored in database (editable above)
            </p>
            <p>
              <strong>Identity Resolution:</strong> ENS/Basenames via resolve-ens-names function (web3.bio + ensdata.net fallback)
            </p>
            <p>
              <strong>Wallet Tracking:</strong> Zerion API for transaction monitoring and balance fetching
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

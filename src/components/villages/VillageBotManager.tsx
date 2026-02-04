import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, Save, Send, Edit2, X, 
  Calendar, Wallet, MessageSquare, Users, Activity, CheckCircle2,
  Info, ExternalLink, Copy, Search, Bot, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const TelegramIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

type NotificationType = 'donation' | 'bulletin' | 'resident' | 'daily_events' | 'weekly_events';

interface NotificationRoute {
  id: string;
  village_id: string;
  notification_type: string;
  chat_id: string;
  thread_id: number | null;
  is_enabled: boolean;
}

interface VillageBotManagerProps {
  villageId: string;
  villageName: string;
  logoUrl?: string;
  botTokenSecretName?: string | null;
}

const notificationTypes: {
  type: NotificationType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "donation",
    label: "Donations",
    description: "Alerts when donations are received",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    type: "bulletin",
    label: "Bulletin Posts",
    description: "New bulletin board posts",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    type: "resident",
    label: "New Residents",
    description: "When someone joins the village",
    icon: <Users className="h-4 w-4" />,
  },
  {
    type: "daily_events",
    label: "Daily Events",
    description: "Daily event summary at 00:01",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    type: "weekly_events",
    label: "Weekly Events",
    description: "Weekly digest every Sunday 8PM",
    icon: <Activity className="h-4 w-4" />,
  },
];

export function VillageBotManager({ villageId, villageName, logoUrl, botTokenSecretName }: VillageBotManagerProps) {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<NotificationRoute[]>([]);
  const [editingType, setEditingType] = useState<NotificationType | null>(null);
  const [editChatId, setEditChatId] = useState("");
  const [editThreadId, setEditThreadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedChats, setDetectedChats] = useState<{
    bot?: { username?: string };
    chats: Array<{ id: string; title?: string; type?: string }>;
    hint?: string;
  } | null>(null);

  const hasBotConfigured = !!botTokenSecretName;

  // Fetch notification routes for this village
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from("notification_routes")
          .select("*")
          .eq("village_id", villageId);

        if (error) throw error;
        setRoutes(data || []);
      } catch (err) {
        console.error("Error fetching routes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [villageId]);

  const getRoute = (type: NotificationType) => {
    return routes.find((r) => r.notification_type === type);
  };

  const activeCount = routes.filter((r) => r.is_enabled).length;

  const startEdit = (type: NotificationType) => {
    const route = getRoute(type);
    setEditChatId(route?.chat_id || "");
    setEditThreadId(route?.thread_id?.toString() || "");
    setEditingType(type);
  };

  const cancelEdit = () => {
    setEditingType(null);
    setEditChatId("");
    setEditThreadId("");
  };

  const handleSave = async () => {
    if (!editingType || !editChatId.trim()) {
      toast.error("Chat ID is required");
      return;
    }

    setSaving(true);
    try {
      const existingRoute = getRoute(editingType);
      const threadId = editThreadId.trim() ? parseInt(editThreadId.trim()) : null;

      if (existingRoute) {
        const { error } = await supabase
          .from("notification_routes")
          .update({
            chat_id: editChatId.trim(),
            thread_id: threadId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRoute.id);

        if (error) throw error;

        setRoutes((prev) =>
          prev.map((r) =>
            r.id === existingRoute.id
              ? { ...r, chat_id: editChatId.trim(), thread_id: threadId }
              : r
          )
        );
      } else {
        const { data, error } = await supabase
          .from("notification_routes")
          .insert({
            village_id: villageId,
            notification_type: editingType,
            chat_id: editChatId.trim(),
            thread_id: threadId,
            is_enabled: true,
          })
          .select()
          .single();

        if (error) throw error;
        setRoutes((prev) => [...prev, data as NotificationRoute]);
      }

      toast.success("Route saved");
      cancelEdit();
    } catch (err: any) {
      console.error("Error saving route:", err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (route: NotificationRoute) => {
    try {
      const { error } = await supabase
        .from("notification_routes")
        .update({ is_enabled: !route.is_enabled })
        .eq("id", route.id);

      if (error) throw error;

      setRoutes((prev) =>
        prev.map((r) => (r.id === route.id ? { ...r, is_enabled: !r.is_enabled } : r))
      );
    } catch (err: any) {
      console.error("Error toggling route:", err);
      toast.error(err.message);
    }
  };

  const handleTest = async (type: NotificationType, route: NotificationRoute) => {
    setTesting(type);
    try {
      if (type === "daily_events" || type === "weekly_events") {
        const { error } = await supabase.functions.invoke("notify-daily-events", {
          body: { mode: "week", routeType: type, villageId },
        });
        if (error) throw error;
        toast.success("Test notification sent");
      } else {
        const { error } = await supabase.functions.invoke("notify-telegram", {
          body: {
            type: "test",
            testChatId: route.chat_id,
            testThreadId: route.thread_id,
            villageId, // Pass villageId to use village's bot token
          },
        });
        if (error) throw error;
        toast.success("Test message sent");
      }
    } catch (err: any) {
      console.error("Error testing:", err);
      toast.error(err.message || "Failed to send test");
    } finally {
      setTesting(null);
    }
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-debug-chat-ids", {
        body: { limit: 50, villageId }, // Pass villageId to use village's bot
      });

      if (error) throw error;
      setDetectedChats(data as any);
      toast.success("Chat IDs detected");
    } catch (err: any) {
      console.error("Error detecting:", err);
      toast.error(err.message || "Failed to detect");
    } finally {
      setDetecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center">
            <TelegramIcon className="h-5 w-5 text-[#0088cc]" />
          </div>
          <div>
            <h3 className="font-medium">Telegram Bot</h3>
            <p className="text-sm text-muted-foreground">
              Manage notifications for {villageName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasBotConfigured ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Bot Configured
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              No Bot
            </Badge>
          )}
          <Badge variant={activeCount > 0 ? "default" : "secondary"}>
            {activeCount}/{notificationTypes.length} Active
          </Badge>
        </div>
      </div>

      {/* No Bot Warning */}
      {!hasBotConfigured && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm">
            <p className="font-medium text-red-700 mb-1">No bot configured for this village</p>
            <p className="text-xs text-muted-foreground">
              Please contact an admin to set up a Telegram bot token for {villageName}. 
              Once configured, you'll be able to manage notification routes here.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Instructions */}
      {activeCount === 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <p className="font-medium text-amber-700 mb-2">Get started with Telegram notifications</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
              <li>
                Create a bot via{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0088cc] hover:underline inline-flex items-center gap-0.5"
                >
                  @BotFather <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </li>
              <li>Add the bot token as a secret in your backend settings</li>
              <li>Add the bot to your Telegram group/channel as admin</li>
              <li>
                Use the Detect button below or{" "}
                <a
                  href="https://t.me/RawDataBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0088cc] hover:underline inline-flex items-center gap-0.5"
                >
                  @RawDataBot <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                to get Chat IDs
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* Detect Chat IDs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Detect Chat IDs</CardTitle>
              <CardDescription className="text-xs">
                Find groups/channels where your bot was recently active
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDetect}
              disabled={detecting}
            >
              {detecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Detect</span>
            </Button>
          </div>
        </CardHeader>
        {detectedChats && (
          <CardContent className="pt-0">
            <div className="space-y-2 text-xs">
              {detectedChats.bot?.username && (
                <p className="text-muted-foreground">
                  Bot: <code className="bg-muted px-1 rounded">@{detectedChats.bot.username}</code>
                </p>
              )}
              {detectedChats.hint && (
                <p className="text-muted-foreground">{detectedChats.hint}</p>
              )}
              {detectedChats.chats.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {detectedChats.chats.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <span className="truncate">{c.title || c.type || "Chat"}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(c.id);
                          toast.success("Chat ID copied");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        <code className="text-[10px]">{c.id}</code>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No chats detected. Make sure the bot is added to a group and someone sent a
                  message.
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notification Routes */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Notification Routes</h4>
        {notificationTypes.map(({ type, label, description, icon }) => {
          const route = getRoute(type);
          const isEditing = editingType === type;

          return (
            <Card key={type} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {route ? (
                      <>
                        <Switch
                          checked={route.is_enabled}
                          onCheckedChange={() => toggleEnabled(route)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => startEdit(type)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleTest(type, route)}
                          disabled={!route.is_enabled || testing === type}
                        >
                          {testing === type ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(type)}>
                        Configure
                      </Button>
                    )}
                  </div>
                </div>

                {/* Edit Mode */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Chat ID</Label>
                        <Input
                          value={editChatId}
                          onChange={(e) => setEditChatId(e.target.value)}
                          placeholder="-1001234567890"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Thread ID (optional)</Label>
                        <Input
                          value={editThreadId}
                          onChange={(e) => setEditThreadId(e.target.value)}
                          placeholder="123"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show current config */}
                {route && !isEditing && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Chat: <code className="bg-muted px-1 rounded">{route.chat_id}</code>
                      </span>
                      {route.thread_id && (
                        <span>
                          Thread: <code className="bg-muted px-1 rounded">{route.thread_id}</code>
                        </span>
                      )}
                      {route.is_enabled ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Analytics placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Bot Analytics
          </CardTitle>
          <CardDescription className="text-xs">
            Message delivery stats coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-semibold">—</p>
              <p className="text-xs text-muted-foreground">Messages Sent</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-semibold">—</p>
              <p className="text-xs text-muted-foreground">Delivery Rate</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-semibold">—</p>
              <p className="text-xs text-muted-foreground">Subscribers</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

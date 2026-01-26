import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronDown, ChevronRight, Loader2, Save, Send, Edit2, X, Plus, 
  Calendar, Wallet, MessageSquare, MapPin, Users, Activity, CheckCircle2, Clock,
  Info, ExternalLink, Copy
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TelegramIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

type NotificationType = 'donation' | 'bulletin' | 'spot' | 'resident' | 'daily_events' | 'weekly_events';

interface NotificationRoute {
  id: string;
  village_id: string;
  notification_type: string;
  chat_id: string;
  thread_id: number | null;
  is_enabled: boolean;
}

interface BotConfig {
  villageId: string;
  villageName: string;
  botUsername?: string;
  botTokenSecretName?: string; // e.g., "TELEGRAM_BOT_TOKEN" or "PROTOVILLE_BOT_TOKEN"
  logoUrl?: string;
  isConnected?: boolean;
  notificationTypes: {
    type: NotificationType;
    label: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    source: string;
    trigger: string;
    isActive?: boolean;
    defaultChatId?: string;
    defaultThreadId?: number;
  }[];
}

interface BotNotificationSectionProps {
  config: BotConfig;
  notificationRoutes: NotificationRoute[];
  setNotificationRoutes: React.Dispatch<React.SetStateAction<NotificationRoute[]>>;
  globalChatId: string;
  onUpdateSecretName?: (villageId: string, secretName: string) => void;
}

export function BotNotificationSection({ 
  config, 
  notificationRoutes, 
  setNotificationRoutes,
  globalChatId,
  onUpdateSecretName
}: BotNotificationSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingRoute, setEditingRoute] = useState<{type: NotificationType} | null>(null);
  const [editChatId, setEditChatId] = useState("");
  const [editThreadId, setEditThreadId] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);
  const [testingRoute, setTestingRoute] = useState<string | null>(null);
  const [localSecretName, setLocalSecretName] = useState(config.botTokenSecretName || 'TELEGRAM_BOT_TOKEN');

  const getRoute = (type: NotificationType): NotificationRoute | undefined => {
    return notificationRoutes.find(r => r.notification_type === type && r.village_id === config.villageId);
  };

  const startEditRoute = (type: NotificationType) => {
    const existingRoute = getRoute(type);
    const typeConfig = config.notificationTypes.find(t => t.type === type);
    setEditChatId(existingRoute?.chat_id || typeConfig?.defaultChatId || globalChatId || "");
    setEditThreadId(existingRoute?.thread_id?.toString() || typeConfig?.defaultThreadId?.toString() || "");
    setEditingRoute({ type });
  };

  const cancelEditRoute = () => {
    setEditingRoute(null);
    setEditChatId("");
    setEditThreadId("");
  };

  const handleSaveRoute = async () => {
    if (!editingRoute || !editChatId.trim()) {
      toast({ title: "Error", description: "Chat ID is required", variant: "destructive" });
      return;
    }

    setSavingRoute(true);
    try {
      const existingRoute = getRoute(editingRoute.type);
      const threadId = editThreadId.trim() ? parseInt(editThreadId.trim()) : null;

      if (existingRoute) {
        const { error } = await supabase
          .from("notification_routes")
          .update({ 
            chat_id: editChatId.trim(),
            thread_id: threadId,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingRoute.id);

        if (error) throw error;

        setNotificationRoutes(prev => 
          prev.map(r => r.id === existingRoute.id 
            ? { ...r, chat_id: editChatId.trim(), thread_id: threadId }
            : r
          )
        );
      } else {
        const { data, error } = await supabase
          .from("notification_routes")
          .insert({
            village_id: config.villageId,
            notification_type: editingRoute.type,
            chat_id: editChatId.trim(),
            thread_id: threadId,
            is_enabled: true
          })
          .select()
          .single();

        if (error) throw error;
        setNotificationRoutes(prev => [...prev, data as NotificationRoute]);
      }

      toast({ title: "Route Saved", description: `Notification route for ${editingRoute.type} updated` });
      cancelEditRoute();
    } catch (err: any) {
      console.error("Error saving route:", err);
      toast({ title: "Error", description: err.message || "Failed to save route", variant: "destructive" });
    } finally {
      setSavingRoute(false);
    }
  };

  const toggleRouteEnabled = async (route: NotificationRoute) => {
    try {
      const { error } = await supabase
        .from("notification_routes")
        .update({ is_enabled: !route.is_enabled })
        .eq("id", route.id);

      if (error) throw error;

      setNotificationRoutes(prev => 
        prev.map(r => r.id === route.id ? { ...r, is_enabled: !r.is_enabled } : r)
      );
    } catch (err: any) {
      console.error("Error toggling route:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTestRoute = async (type: NotificationType, route: NotificationRoute) => {
    const routeKey = `${type}-${config.villageId}`;
    setTestingRoute(routeKey);
    try {
      // Special handling for events
      if (type === 'daily_events' || type === 'weekly_events') {
        const { error } = await supabase.functions.invoke("notify-daily-events", {
          body: { mode: "week", routeType: type }
        });
        if (error) throw error;
        toast({ title: "Test Sent", description: `Weekly events preview notification triggered` });
      } else {
        const { error } = await supabase.functions.invoke("notify-telegram", {
          body: {
            type: "test",
            testChatId: route.chat_id,
            testThreadId: route.thread_id
          }
        });
        if (error) throw error;
        toast({ title: "Test Sent", description: `Test message sent to ${type} route` });
      }
    } catch (err: any) {
      console.error("Error testing route:", err);
      toast({ title: "Error", description: err.message || "Failed to send test message", variant: "destructive" });
    } finally {
      setTestingRoute(null);
    }
  };

  const handleCreateRoute = async (type: NotificationType, typeConfig: BotConfig['notificationTypes'][0]) => {
    try {
      const { data, error } = await supabase
        .from("notification_routes")
        .insert({
          village_id: config.villageId,
          notification_type: type,
          chat_id: typeConfig.defaultChatId || globalChatId || 'pending',
          thread_id: typeConfig.defaultThreadId || null,
          is_enabled: true
        })
        .select()
        .single();
      
      if (error) throw error;
      setNotificationRoutes(prev => [...prev, data as NotificationRoute]);
      toast({ title: "Enabled", description: `${typeConfig.label} enabled.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const activeCount = config.notificationTypes.filter(t => {
    const route = getRoute(t.type);
    return route?.is_enabled !== false && (route || t.isActive);
  }).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {config.logoUrl ? (
                <img 
                  src={config.logoUrl} 
                  alt={config.villageName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{config.villageName} Bot</p>
                  {config.botUsername && (
                    <a 
                      href={`https://t.me/${config.botUsername.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#0088cc] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TelegramIcon className="h-3 w-3" />
                      {config.botUsername}
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{config.villageId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                {activeCount}/{config.notificationTypes.length} Active
              </Badge>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t p-4 space-y-4">
            {/* Bot Setup Instructions */}
            {!config.isConnected && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  <p className="font-medium text-amber-700 mb-2">Bot not connected</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-xs">
                    <li>Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="h-2.5 w-2.5" /></a></li>
                    <li>Copy the bot token (looks like <code className="bg-muted px-1 rounded">123456:ABC-xyz...</code>)</li>
                    <li className="flex flex-col gap-1.5">
                      <span>Add the token as a secret in Cloud settings:</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Input
                          value={localSecretName}
                          onChange={(e) => setLocalSecretName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                          onBlur={() => onUpdateSecretName?.(config.villageId, localSecretName)}
                          placeholder="SECRET_NAME"
                          className="h-7 text-xs font-mono w-48 bg-background"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() => {
                            navigator.clipboard.writeText(localSecretName);
                            toast({ title: "Copied", description: "Secret name copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                    <li>Add the bot to your Telegram group/channel as admin</li>
                    <li>Get the Chat ID using <a href="https://t.me/RawDataBot" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline inline-flex items-center gap-0.5">@RawDataBot <ExternalLink className="h-2.5 w-2.5" /></a></li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
            
            {config.isConnected && config.botUsername && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Bot connected</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  Token: <code className="bg-muted px-1 rounded">{config.botTokenSecretName || 'TELEGRAM_BOT_TOKEN'}</code>
                </span>
              </div>
            )}
            
            <div className="space-y-3">
            {config.notificationTypes.map((typeConfig) => {
              const route = getRoute(typeConfig.type);
              const isEditing = editingRoute?.type === typeConfig.type;
              const routeKey = `${typeConfig.type}-${config.villageId}`;
              const isActive = route?.is_enabled !== false && (!!route || !!typeConfig.isActive);
              
              return (
                <div key={typeConfig.type} className="p-3 rounded-lg border bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${typeConfig.iconBg}`}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{typeConfig.label}</p>
                        <p className="text-xs text-muted-foreground">{typeConfig.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={isActive}
                        onCheckedChange={async () => {
                          if (route) {
                            toggleRouteEnabled(route);
                          } else {
                            handleCreateRoute(typeConfig.type, typeConfig);
                          }
                        }}
                      />
                      {isActive ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                          On
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground text-xs">
                          Off
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {typeConfig.trigger}
                      </span>
                    </div>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Chat ID"
                          value={editChatId}
                          onChange={(e) => setEditChatId(e.target.value)}
                          className="h-7 text-xs font-mono w-32"
                        />
                        <Input
                          placeholder="Thread"
                          value={editThreadId}
                          onChange={(e) => setEditThreadId(e.target.value)}
                          className="h-7 text-xs font-mono w-20"
                        />
                        <Button size="sm" className="h-7 px-2" onClick={handleSaveRoute} disabled={savingRoute}>
                          {savingRoute ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEditRoute}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {route?.chat_id || typeConfig.defaultChatId || "Not set"}
                          {(route?.thread_id || typeConfig.defaultThreadId) && 
                            ` / ${route?.thread_id || typeConfig.defaultThreadId}`}
                        </code>
                        {(route?.chat_id || typeConfig.defaultChatId) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2"
                            onClick={() => handleTestRoute(typeConfig.type, route || {
                              id: 'temp',
                              village_id: config.villageId,
                              notification_type: typeConfig.type,
                              chat_id: typeConfig.defaultChatId || '',
                              thread_id: typeConfig.defaultThreadId || null,
                              is_enabled: true
                            })}
                            disabled={testingRoute === routeKey}
                          >
                            {testingRoute === routeKey ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEditRoute(typeConfig.type)}>
                          {route ? <Edit2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

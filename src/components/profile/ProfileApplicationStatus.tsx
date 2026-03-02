import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Clock, CheckCircle2, XCircle, FileText, MapPin, Calendar, ExternalLink, Bell, BellOff, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
const TelegramIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface Application {
  id: string;
  village_id: string;
  village_name: string;
  village_logo?: string;
  village_bot_username?: string;
  start_date: string;
  end_date: string;
  status: string | null;
  created_at: string;
  has_notification: boolean;
}

interface ProfileApplicationStatusProps {
  userId: string;
}

export const ProfileApplicationStatus = ({ userId }: ProfileApplicationStatusProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const openEditDialog = (app: Application) => {
    setEditingApp(app);
    setEditStartDate(parseISO(app.start_date));
    setEditEndDate(parseISO(app.end_date));
  };

  const handleSaveEdit = async () => {
    if (!editingApp || !editStartDate || !editEndDate) return;
    if (editEndDate < editStartDate) {
      toast.error("End date must be after start date");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stays")
        .update({
          start_date: format(editStartDate, "yyyy-MM-dd"),
          end_date: format(editEndDate, "yyyy-MM-dd"),
        })
        .eq("id", editingApp.id);
      if (error) throw error;
      toast.success("Application dates updated!");
      setEditingApp(null);
      // Refresh
      setApplications((prev) =>
        prev.map((a) =>
          a.id === editingApp.id
            ? { ...a, start_date: format(editStartDate, "yyyy-MM-dd"), end_date: format(editEndDate, "yyyy-MM-dd") }
            : a
        )
      );
    } catch (err) {
      console.error("Error updating application:", err);
      toast.error("Failed to update application");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("stays").delete().eq("id", id);
      if (error) throw error;
      toast.success("Application withdrawn");
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Error deleting application:", err);
      toast.error("Failed to withdraw application");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const fetchApplications = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch stays with village info
        const { data: stays, error } = await supabase
          .from("stays")
          .select("id, village_id, start_date, end_date, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!stays || stays.length === 0) {
          setApplications([]);
          setLoading(false);
          return;
        }

        // Fetch village info including bot token secret name
        const villageIds = [...new Set(stays.map((s) => s.village_id))];
        const { data: villages } = await supabase
          .from("villages")
          .select("id, name, logo_url, bot_token_secret_name")
          .in("id", villageIds);

        // Fetch notification subscriptions for these stays
        const stayIds = stays.map((s) => s.id);
        const { data: notifications } = await supabase
          .from("stay_notifications")
          .select("stay_id")
          .in("stay_id", stayIds);

        const notifiedStays = new Set(notifications?.map((n) => n.stay_id) || []);

        // Derive bot username from secret name (e.g., "PROTOVILLE_BOT_TOKEN" -> "protoville_bot")
        const getBotUsername = (secretName: string | null): string | undefined => {
          if (!secretName) return undefined;
          // Common pattern: VILLAGENAME_BOT_TOKEN -> villagename_bot
          const match = secretName.match(/^(.+)_BOT_TOKEN$/i);
          if (match) {
            return `${match[1].toLowerCase()}_bot`;
          }
          return undefined;
        };

        const villageMap = new Map(
          villages?.map((v) => [v.id, { 
            name: v.name, 
            logo: v.logo_url,
            botUsername: getBotUsername(v.bot_token_secret_name)
          }]) || []
        );

        const apps: Application[] = stays.map((stay) => ({
          id: stay.id,
          village_id: stay.village_id,
          village_name: villageMap.get(stay.village_id)?.name || stay.village_id,
          village_logo: villageMap.get(stay.village_id)?.logo || undefined,
          village_bot_username: villageMap.get(stay.village_id)?.botUsername,
          start_date: stay.start_date,
          end_date: stay.end_date,
          status: stay.status,
          created_at: stay.created_at,
          has_notification: notifiedStays.has(stay.id),
        }));

        setApplications(apps);
      } catch (err) {
        console.error("Error fetching applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [userId]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "planning":
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return null; // Don't show section if no applications
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          My Applications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              {/* Village logo */}
              <div className="shrink-0">
                {app.village_logo ? (
                  <img
                    src={app.village_logo}
                    alt={app.village_name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm truncate">{app.village_name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(app.start_date), "MMM d")} - {format(new Date(app.end_date), "MMM d, yyyy")}
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-xs text-muted-foreground">
                    Applied {format(new Date(app.created_at), "MMM d, yyyy")}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openEditDialog(app)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          disabled={deletingId === app.id}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deletingId === app.id ? "..." : "Withdraw"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Withdraw application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove your application to {app.village_name}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(app.id)}>
                            Withdraw
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {/* Notification status/button */}
                    {app.village_bot_username && app.status === "planning" && (
                      app.has_notification ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 px-2">
                          <Bell className="h-3 w-3" />
                          Alerts on
                        </span>
                      ) : (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-[#0088cc] hover:text-[#0077b5] hover:bg-[#0088cc]/10"
                        >
                          <a 
                            href={`https://t.me/${app.village_bot_username}?start=stay_${app.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <TelegramIcon className="h-3 w-3 mr-1" />
                            Get Alerts
                          </a>
                        </Button>
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => navigate(`/${app.village_id}`)}
                    >
                      View Village
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit Application Dialog */}
      <Dialog open={!!editingApp} onOpenChange={(open) => !open && setEditingApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Application Dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !editStartDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editStartDate ? format(editStartDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={editStartDate} onSelect={setEditStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !editEndDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editEndDate ? format(editEndDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={editEndDate} onSelect={setEditEndDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingApp(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

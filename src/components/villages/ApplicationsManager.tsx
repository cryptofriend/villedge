import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { 
  Clock, CheckCircle2, XCircle, User, Calendar, ExternalLink, 
  ChevronDown, ChevronUp, Search, Filter, Pencil, CalendarIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { notifyApplicantOfStatusChange } from "@/hooks/useStayStatusNotification";

interface ApplicationAnswer {
  question_text: string;
  answer: string;
}

interface Application {
  id: string;
  nickname: string;
  user_id: string | null;
  username: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
  created_at: string;
  intention: string | null;
  social_profile: string | null;
  answers: ApplicationAnswer[];
}

interface ApplicationsManagerProps {
  villageId: string;
  villageName?: string;
}

export const ApplicationsManager = ({ villageId, villageName }: ApplicationsManagerProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [savingDates, setSavingDates] = useState(false);
  const navigate = useNavigate();

  const openEditDates = (app: Application) => {
    setEditingApp(app);
    setEditStartDate(parseISO(app.start_date));
    setEditEndDate(parseISO(app.end_date));
  };

  const handleSaveDates = async () => {
    if (!editingApp || !editStartDate || !editEndDate) return;
    if (editEndDate < editStartDate) {
      toast.error("End date must be after start date");
      return;
    }
    setSavingDates(true);
    try {
      const { error } = await supabase
        .from("stays")
        .update({
          start_date: format(editStartDate, "yyyy-MM-dd"),
          end_date: format(editEndDate, "yyyy-MM-dd"),
        })
        .eq("id", editingApp.id);
      if (error) throw error;
      toast.success("Dates updated!");
      setApplications((prev) =>
        prev.map((a) =>
          a.id === editingApp.id
            ? { ...a, start_date: format(editStartDate, "yyyy-MM-dd"), end_date: format(editEndDate, "yyyy-MM-dd") }
            : a
        )
      );
      setEditingApp(null);
    } catch (err) {
      console.error("Error updating dates:", err);
      toast.error("Failed to update dates");
    } finally {
      setSavingDates(false);
    }
  };

  const fetchApplications = async () => {
    try {
      // Fetch stays for this village
      const { data: stays, error: staysError } = await supabase
        .from("stays")
        .select("*")
        .eq("village_id", villageId)
        .order("created_at", { ascending: false });

      if (staysError) throw staysError;

      if (!stays || stays.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles
      const userIds = stays.filter((s) => s.user_id).map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p.username]) || []
      );

      // Fetch application questions for this village
      const { data: questions } = await supabase
        .from("village_application_questions")
        .select("id, question_text")
        .eq("village_id", villageId);

      const questionMap = new Map(
        questions?.map((q) => [q.id, q.question_text]) || []
      );

      // Fetch answers for all stays
      const stayIds = stays.map((s) => s.id);
      const { data: answers } = await supabase
        .from("stay_application_answers")
        .select("stay_id, question_id, answer")
        .in("stay_id", stayIds);

      // Group answers by stay
      const answersByStay = new Map<string, ApplicationAnswer[]>();
      answers?.forEach((a) => {
        const stayAnswers = answersByStay.get(a.stay_id) || [];
        stayAnswers.push({
          question_text: questionMap.get(a.question_id) || "Unknown question",
          answer: a.answer || "",
        });
        answersByStay.set(a.stay_id, stayAnswers);
      });

      const apps: Application[] = stays.map((stay) => ({
        id: stay.id,
        nickname: stay.nickname,
        user_id: stay.user_id,
        username: stay.user_id ? profileMap.get(stay.user_id) || null : null,
        start_date: stay.start_date,
        end_date: stay.end_date,
        status: stay.status,
        created_at: stay.created_at,
        intention: stay.intention,
        social_profile: stay.social_profile,
        answers: answersByStay.get(stay.id) || [],
      }));

      setApplications(apps);
    } catch (err) {
      console.error("Error fetching applications:", err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [villageId]);

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const { error } = await supabase
        .from("stays")
        .update({ status: newStatus })
        .eq("id", appId);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: newStatus } : app
        )
      );

      toast.success(`Application ${newStatus === "confirmed" ? "approved" : newStatus === "rejected" ? "rejected" : "set to pending"}`);

      // Send notification to applicant (don't block on this)
      if (newStatus === "confirmed" || newStatus === "rejected") {
        notifyApplicantOfStatusChange({
          stayId: appId,
          newStatus,
          villageId,
          villageName: villageName || "the village",
        }).then((result) => {
          if (result.success) {
            console.log("Applicant notified of status change");
          }
        });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update application status");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
            Pending
          </Badge>
        );
    }
  };

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.username && app.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && (!app.status || app.status === "planning")) ||
      app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const pendingCount = applications.filter((a) => !a.status || a.status === "planning").length;
  const confirmedCount = applications.filter((a) => a.status === "confirmed").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
            <div className="text-xs text-muted-foreground">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {applications.length === 0
              ? "No applications yet"
              : "No applications match your filters"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app) => (
            <Collapsible
              key={app.id}
              open={expandedIds.has(app.id)}
              onOpenChange={() => toggleExpanded(app.id)}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{app.nickname}</CardTitle>
                          {app.username && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${app.username}`);
                              }}
                            >
                              @{app.username}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(app.start_date), "MMM d")} - {format(new Date(app.end_date), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(app.status)}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedIds.has(app.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Application Answers */}
                    {app.answers.length > 0 && (
                      <div className="space-y-3 pt-3 border-t">
                        {app.answers.map((answer, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              {answer.question_text}
                            </div>
                            <div className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">
                              {answer.answer || <span className="text-muted-foreground italic">No answer</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legacy fields */}
                    {(app.intention || app.social_profile) && (
                      <div className="space-y-3 pt-3 border-t">
                        {app.intention && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Intention</div>
                            <div className="text-sm">{app.intention}</div>
                          </div>
                        )}
                        {app.social_profile && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Social Profile</div>
                            <div className="text-sm">{app.social_profile}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDates(app)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit Dates
                      </Button>
                      <Button
                        size="sm"
                        variant={app.status === "confirmed" ? "default" : "outline"}
                        className={app.status === "confirmed" ? "bg-green-600 hover:bg-green-700" : ""}
                        onClick={() => updateStatus(app.id, "confirmed")}
                        disabled={updatingId === app.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant={app.status === "rejected" ? "destructive" : "outline"}
                        onClick={() => updateStatus(app.id, "rejected")}
                        disabled={updatingId === app.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      {app.status && app.status !== "planning" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus(app.id, "planning")}
                          disabled={updatingId === app.id}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Set Pending
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Applied {format(new Date(app.created_at), "PPpp")}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, XCircle, FileText, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Application {
  id: string;
  village_id: string;
  village_name: string;
  village_logo?: string;
  start_date: string;
  end_date: string;
  status: string | null;
  created_at: string;
}

interface ProfileApplicationStatusProps {
  userId: string;
}

export const ProfileApplicationStatus = ({ userId }: ProfileApplicationStatusProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

        // Fetch village info
        const villageIds = [...new Set(stays.map((s) => s.village_id))];
        const { data: villages } = await supabase
          .from("villages")
          .select("id, name, logo_url")
          .in("id", villageIds);

        const villageMap = new Map(
          villages?.map((v) => [v.id, { name: v.name, logo: v.logo_url }]) || []
        );

        const apps: Application[] = stays.map((stay) => ({
          id: stay.id,
          village_id: stay.village_id,
          village_name: villageMap.get(stay.village_id)?.name || stay.village_id,
          village_logo: villageMap.get(stay.village_id)?.logo || undefined,
          start_date: stay.start_date,
          end_date: stay.end_date,
          status: stay.status,
          created_at: stay.created_at,
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

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    Applied {format(new Date(app.created_at), "MMM d, yyyy")}
                  </span>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

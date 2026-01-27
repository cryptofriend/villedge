import { useState, useEffect, useMemo } from "react";
import { MapPin, Check, HelpCircle } from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VillageStay {
  id: string;
  village_id: string;
  village_name: string;
  start_date: string;
  end_date: string;
  logo_url: string | null;
  status: string | null;
  user_id: string | null;
}

interface ProfileVillageTimelineProps {
  userId?: string;
}

// Assign rows based on date conflicts
function assignStayRows(stays: VillageStay[]): { stay: VillageStay; row: number }[] {
  const sorted = [...stays].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const rows: { end: Date }[] = [];
  const assigned: { stay: VillageStay; row: number }[] = [];

  sorted.forEach(stay => {
    const start = new Date(stay.start_date);
    const end = new Date(stay.end_date);

    let assignedRow = -1;
    for (let i = 0; i < rows.length; i++) {
      if (start > rows[i].end) {
        assignedRow = i;
        rows[i].end = end;
        break;
      }
    }

    if (assignedRow === -1) {
      assignedRow = rows.length;
      rows.push({ end });
    }

    assigned.push({ stay, row: assignedRow });
  });

  return assigned;
}

export const ProfileVillageTimeline = ({ userId }: ProfileVillageTimelineProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [villages, setVillages] = useState<VillageStay[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isOwnProfile = user?.id === userId;

  const fetchVillages = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: stays } = await supabase
        .from("stays")
        .select("id, village_id, start_date, end_date, status, user_id")
        .eq("user_id", userId)
        .order("start_date", { ascending: true });

      if (!stays || stays.length === 0) {
        setVillages([]);
        setLoading(false);
        return;
      }

      const villageIds = [...new Set(stays.map(s => s.village_id))];
      
      const { data: villageData } = await supabase
        .from("villages")
        .select("id, name, logo_url")
        .in("id", villageIds);

      const villageMap = new Map(villageData?.map(v => [v.id, v]) || []);

      const villageStays: VillageStay[] = stays.map(stay => {
        const village = villageMap.get(stay.village_id);
        return {
          id: stay.id,
          village_id: stay.village_id,
          village_name: village?.name || stay.village_id,
          start_date: stay.start_date,
          end_date: stay.end_date,
          logo_url: village?.logo_url || null,
          status: stay.status,
          user_id: stay.user_id,
        };
      });

      setVillages(villageStays);
    } catch (error) {
      console.error("Error fetching villages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillages();
  }, [userId]);

  const handleToggleStatus = async (stayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOwnProfile) return;

    try {
      const stay = villages.find(v => v.id === stayId);
      if (!stay) return;

      const newStatus = stay.status === "confirmed" ? "planning" : "confirmed";

      const { error } = await supabase
        .from("stays")
        .update({ status: newStatus })
        .eq("id", stayId);

      if (error) throw error;

      setVillages(prev => prev.map(v => 
        v.id === stayId ? { ...v, status: newStatus } : v
      ));

      toast.success(`Stay ${newStatus === "confirmed" ? "confirmed" : "set to planning"}!`);
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const staysWithRows = useMemo(() => assignStayRows(villages), [villages]);
  const maxRow = useMemo(() => Math.max(...staysWithRows.map(s => s.row), 0), [staysWithRows]);

  if (loading) {
    return (
      <section className="py-6 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4" />
          Village Participation
        </h2>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </section>
    );
  }

  if (villages.length === 0) {
    return (
      <section className="py-6 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4" />
          Village Participation
        </h2>
        <p className="text-sm text-muted-foreground">
          No village participation yet
        </p>
      </section>
    );
  }

  return (
    <section className="py-6 border-b border-border">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4" />
        Village Participation
        {isOwnProfile && (
          <span className="text-xs text-muted-foreground font-normal ml-auto">Click to toggle status</span>
        )}
      </h2>

      <ScrollArea className="w-full">
        <div className="flex flex-col gap-1 pb-2">
          {Array.from({ length: maxRow + 1 }, (_, rowIndex) => {
            const rowStays = staysWithRows.filter(s => s.row === rowIndex);
            
            return (
              <div key={rowIndex} className="flex gap-2">
                {rowStays.map(({ stay }) => {
                  const isPlanning = stay.status === "planning";
                  const startDate = new Date(stay.start_date);
                  const endDate = new Date(stay.end_date);
                  const duration = differenceInDays(endDate, startDate) + 1;

                  return (
                    <Tooltip key={stay.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => isOwnProfile ? handleToggleStatus(stay.id, e) : navigate(`/${stay.village_id}`)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:ring-2 hover:ring-primary/50 shrink-0",
                            isPlanning 
                              ? "bg-muted/80 border border-dashed border-muted-foreground/30" 
                              : "bg-primary/10 border border-primary/20"
                          )}
                        >
                          {stay.logo_url ? (
                            <img 
                              src={stay.logo_url} 
                              alt={stay.village_name}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] font-medium text-primary">
                                {stay.village_name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col items-start min-w-0">
                            <span className={cn(
                              "text-xs font-medium truncate max-w-[120px]",
                              isPlanning ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {stay.village_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(startDate, "MMM d")} – {format(endDate, "MMM d")}
                            </span>
                          </div>
                          {isPlanning && (
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          {!isPlanning && (
                            <Check className="h-3 w-3 text-primary" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-semibold">{stay.village_name}</p>
                          <p className="text-muted-foreground text-sm">
                            {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">{duration} days</p>
                          <p className={cn(
                            "text-xs font-medium",
                            isPlanning ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {isPlanning ? "Planning" : "Confirmed"}
                          </p>
                          {isOwnProfile && (
                            <p className="text-xs text-primary font-medium pt-1 border-t border-border mt-1">
                              {isPlanning ? "Click to confirm" : "Click to set as planning"}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

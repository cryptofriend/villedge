import { useState, useEffect, useMemo } from "react";
import { MapPin, Check, HelpCircle } from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export const ProfileVillageTimeline = ({ userId }: ProfileVillageTimelineProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [villages, setVillages] = useState<VillageStay[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isOwnProfile = user?.id === userId;

  // Calculate timeline range based on stays
  const timelineData = useMemo(() => {
    if (villages.length === 0) {
      // Default: show 6 months centered on today
      const start = startOfMonth(addMonths(today, -1));
      const end = endOfMonth(addMonths(today, 4));
      return { start, end, months: generateMonths(start, end) };
    }

    // Find the earliest start and latest end
    const allDates = villages.flatMap(v => [new Date(v.start_date), new Date(v.end_date)]);
    allDates.push(today);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfMonth(addMonths(minDate, -1));
    const end = endOfMonth(addMonths(maxDate, 1));
    
    return { start, end, months: generateMonths(start, end) };
  }, [villages, today]);

  function generateMonths(start: Date, end: Date) {
    const months: Date[] = [];
    let current = startOfMonth(start);
    while (isBefore(current, end) || current.getTime() === end.getTime()) {
      months.push(current);
      current = addMonths(current, 1);
    }
    return months;
  }

  // Fetch user's village stays (all statuses)
  const fetchVillages = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Get all stays for this user (all statuses)
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

      // Get unique village IDs
      const villageIds = [...new Set(stays.map(s => s.village_id))];
      
      // Fetch village details
      const { data: villageData } = await supabase
        .from("villages")
        .select("id, name, logo_url")
        .in("id", villageIds);

      const villageMap = new Map(villageData?.map(v => [v.id, v]) || []);

      // Build village stays
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

  // Toggle stay status
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

      // Update local state
      setVillages(prev => prev.map(v => 
        v.id === stayId ? { ...v, status: newStatus } : v
      ));

      toast.success(`Stay ${newStatus === "confirmed" ? "confirmed" : "set to planning"}!`);
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  // Calculate bar position and width
  const getBarStyle = (stay: VillageStay) => {
    const totalDays = differenceInDays(timelineData.end, timelineData.start);
    const startDate = new Date(stay.start_date);
    const endDate = new Date(stay.end_date);
    
    const startOffset = Math.max(0, differenceInDays(startDate, timelineData.start));
    const endOffset = Math.min(totalDays, differenceInDays(endDate, timelineData.start));
    
    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  // Calculate today marker position
  const getTodayPosition = () => {
    const totalDays = differenceInDays(timelineData.end, timelineData.start);
    const todayOffset = differenceInDays(today, timelineData.start);
    return `${(todayOffset / totalDays) * 100}%`;
  };

  if (loading) {
    return (
      <section className="py-4 border-b border-border">
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground">Loading timeline...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 border-b border-border">
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Village Participation</span>
          {isOwnProfile && villages.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">Click to toggle status</span>
          )}
        </div>
        
        {villages.length > 0 ? (
          <div className="relative">
            {/* Month headers */}
            <div className="flex border-b border-border pb-2 mb-3">
              {timelineData.months.map((month, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 text-xs text-muted-foreground font-medium text-center"
                >
                  {format(month, "MMM")}
                </div>
              ))}
            </div>

            {/* Today marker */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-primary z-10"
              style={{ left: getTodayPosition() }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                Today
              </div>
            </div>

            {/* Village bars */}
            <div className="space-y-2 pt-3">
              {villages.map((stay) => {
                const barStyle = getBarStyle(stay);
                const isPlanning = stay.status === "planning";
                
                return (
                  <div key={stay.id} className="relative h-9">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => isOwnProfile ? handleToggleStatus(stay.id, e) : navigate(`/${stay.village_id}`)}
                          className={`absolute h-full flex items-center gap-2 px-3 rounded-full transition-all hover:ring-2 hover:ring-primary/50 ${
                            isPlanning 
                              ? "bg-muted/80 border border-dashed border-muted-foreground/30" 
                              : "bg-primary/15 border border-primary/30"
                          }`}
                          style={barStyle}
                        >
                          {stay.logo_url ? (
                            <img 
                              src={stay.logo_url} 
                              alt={stay.village_name}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-medium text-primary">
                                {stay.village_name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className={`text-xs font-medium truncate ${isPlanning ? "text-muted-foreground" : "text-foreground"}`}>
                            {stay.village_name}
                          </span>
                          {isPlanning && (
                            <span className="text-[10px] text-muted-foreground">?</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-semibold">{stay.village_name}</p>
                          <p className="text-muted-foreground text-sm">
                            {format(new Date(stay.start_date), "MMM d")} - {format(new Date(stay.end_date), "MMM d, yyyy")}
                          </p>
                          <p className={`text-xs font-medium ${isPlanning ? "text-amber-600" : "text-emerald-600"}`}>
                            {isPlanning ? "Planning" : "Confirmed"}
                          </p>
                          {isOwnProfile && (
                            <p className="text-xs text-primary font-medium pt-1 border-t border-border mt-1 flex items-center gap-1">
                              {isPlanning ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Click to confirm
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="h-3 w-3" />
                                  Click to set as planning
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic py-4 text-center">
            No village participation yet
          </div>
        )}
      </div>
    </section>
  );
};

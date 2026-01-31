import { useState, useEffect, useMemo } from "react";
import { MapPin, Check, HelpCircle, Flag, Users } from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, isBefore, isWithinInterval, areIntervalsOverlapping } from "date-fns";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useMutualConnections } from "@/hooks/useMutualConnections";

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

interface ConnectionAtVillage {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  village_id: string;
  start_date: string;
  end_date: string;
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

function generateMonths(start: Date, end: Date) {
  const months: Date[] = [];
  let current = startOfMonth(start);
  while (isBefore(current, end) || current.getTime() === end.getTime()) {
    months.push(current);
    current = addMonths(current, 1);
  }
  return months;
}

export const ProfileVillageTimeline = ({ userId }: ProfileVillageTimelineProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [villages, setVillages] = useState<VillageStay[]>([]);
  const [connectionsAtVillages, setConnectionsAtVillages] = useState<ConnectionAtVillage[]>([]);
  const [loading, setLoading] = useState(true);
  const { connections: mutualConnections } = useMutualConnections(userId);

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

  // Fetch connections' stays at the same villages
  useEffect(() => {
    const fetchConnectionsAtVillages = async () => {
      if (!userId || villages.length === 0 || mutualConnections.length === 0) {
        setConnectionsAtVillages([]);
        return;
      }

      const villageIds = [...new Set(villages.map(v => v.village_id))];
      const connectionIds = mutualConnections.map(c => c.user_id);

      // Get stays of connections at the same villages
      const { data: connectionStays } = await supabase
        .from("stays")
        .select("user_id, village_id, start_date, end_date")
        .in("village_id", villageIds)
        .in("user_id", connectionIds);

      if (!connectionStays) {
        setConnectionsAtVillages([]);
        return;
      }

      // Filter for overlapping dates with user's stays
      const overlappingConnections: ConnectionAtVillage[] = [];

      connectionStays.forEach(connStay => {
        const userStaysAtVillage = villages.filter(v => v.village_id === connStay.village_id);
        
        const hasOverlap = userStaysAtVillage.some(userStay => {
          try {
            return areIntervalsOverlapping(
              { start: new Date(userStay.start_date), end: new Date(userStay.end_date) },
              { start: new Date(connStay.start_date), end: new Date(connStay.end_date) },
              { inclusive: true }
            );
          } catch {
            return false;
          }
        });

        if (hasOverlap) {
          const connection = mutualConnections.find(c => c.user_id === connStay.user_id);
          if (connection) {
            overlappingConnections.push({
              user_id: connection.user_id,
              username: connection.username,
              avatar_url: connection.avatar_url,
              village_id: connStay.village_id,
              start_date: connStay.start_date,
              end_date: connStay.end_date,
            });
          }
        }
      });

      setConnectionsAtVillages(overlappingConnections);
    };

    fetchConnectionsAtVillages();
  }, [userId, villages, mutualConnections]);

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

  // Calculate timeline range
  const timelineData = useMemo(() => {
    if (villages.length === 0) {
      const start = startOfMonth(addMonths(today, -1));
      const end = endOfMonth(addMonths(today, 4));
      return { start, end, months: generateMonths(start, end) };
    }

    const allDates = villages.flatMap(v => [new Date(v.start_date), new Date(v.end_date)]);
    allDates.push(today);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfMonth(addMonths(minDate, -1));
    const end = endOfMonth(addMonths(maxDate, 1));
    
    return { start, end, months: generateMonths(start, end) };
  }, [villages, today]);

  const staysWithRows = useMemo(() => assignStayRows(villages), [villages]);
  const maxRow = useMemo(() => Math.max(...staysWithRows.map(s => s.row), 0), [staysWithRows]);

  // Calculate bar position and width
  const getBarStyle = (stay: VillageStay) => {
    const totalDays = differenceInDays(timelineData.end, timelineData.start);
    const startDate = new Date(stay.start_date);
    const endDate = new Date(stay.end_date);
    
    const startOffset = Math.max(0, differenceInDays(startDate, timelineData.start));
    const endOffset = Math.min(totalDays, differenceInDays(endDate, timelineData.start));
    
    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 3)}%` };
  };

  // Calculate today marker position
  const getTodayPosition = () => {
    const totalDays = differenceInDays(timelineData.end, timelineData.start);
    const todayOffset = differenceInDays(today, timelineData.start);
    return `${(todayOffset / totalDays) * 100}%`;
  };

  if (loading) {
    return (
      <section className="py-6 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4" />
          My Villages
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
          My Villages
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
        My Villages
        {isOwnProfile && (
          <span className="text-xs text-muted-foreground font-normal ml-auto">Click to toggle status</span>
        )}
      </h2>

      <ScrollArea className="w-full">
        <div className="min-w-[500px] pb-2">
          {/* Month headers */}
          <div className="flex border-b border-border pb-2 mb-2">
            {timelineData.months.map((month, idx) => (
              <div 
                key={idx} 
                className="flex-1 text-[10px] text-muted-foreground font-medium text-center"
              >
                {format(month, "MMM")}
              </div>
            ))}
          </div>

          {/* Gantt rows container */}
          <div className="relative">
            {/* Today marker */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-primary/60 z-20"
              style={{ left: getTodayPosition() }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap font-medium">
                Today
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-1">
              {Array.from({ length: maxRow + 1 }, (_, rowIndex) => {
                const rowStays = staysWithRows.filter(s => s.row === rowIndex);
                
                return (
                  <div key={rowIndex} className="relative h-8">
                    {rowStays.map(({ stay }) => {
                      const barStyle = getBarStyle(stay);
                      const isPlanning = stay.status === "planning";
                      const startDate = new Date(stay.start_date);
                      const endDate = new Date(stay.end_date);
                      const duration = differenceInDays(endDate, startDate) + 1;
                      const isCurrentlyAttending = today >= startDate && today <= endDate;

                      // Get connections at this specific village with overlapping dates
                      const connectionsHere = connectionsAtVillages.filter(
                        conn => conn.village_id === stay.village_id && 
                        (() => {
                          try {
                            return areIntervalsOverlapping(
                              { start: startDate, end: endDate },
                              { start: new Date(conn.start_date), end: new Date(conn.end_date) },
                              { inclusive: true }
                            );
                          } catch {
                            return false;
                          }
                        })()
                      );
                      // Deduplicate by user_id
                      const uniqueConnections = connectionsHere.filter(
                        (conn, idx, arr) => arr.findIndex(c => c.user_id === conn.user_id) === idx
                      );

                      return (
                        <Tooltip key={stay.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => isOwnProfile ? handleToggleStatus(stay.id, e) : navigate(`/${stay.village_id}`)}
                              className={cn(
                                "absolute h-full flex items-center gap-1.5 px-2 rounded-full transition-all hover:ring-2 hover:ring-primary/50 overflow-hidden",
                                isPlanning 
                                  ? "bg-muted/80 border border-dashed border-muted-foreground/30" 
                                  : "bg-primary/15 border border-primary/30"
                              )}
                              style={barStyle}
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
                              <span className={cn(
                                "text-xs font-medium truncate",
                                isPlanning ? "text-muted-foreground" : "text-foreground"
                              )}>
                                {stay.village_name}
                              </span>
                              {uniqueConnections.length > 0 && (
                                <div className="flex items-center -space-x-1.5 flex-shrink-0">
                                  {uniqueConnections.slice(0, 3).map((conn) => (
                                    <Avatar key={conn.user_id} className="h-4 w-4 border border-background">
                                      <AvatarImage src={conn.avatar_url || undefined} />
                                      <AvatarFallback className="text-[6px] bg-primary/20 text-primary">
                                        {(conn.username || 'U').slice(0, 1).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {uniqueConnections.length > 3 && (
                                    <span className="text-[8px] text-muted-foreground ml-1">+{uniqueConnections.length - 3}</span>
                                  )}
                                </div>
                              )}
                              {isCurrentlyAttending && (
                                <Flag className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                              )}
                              {!isCurrentlyAttending && isPlanning && (
                                <HelpCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                              {!isCurrentlyAttending && !isPlanning && (
                                <Check className="h-3 w-3 text-primary flex-shrink-0" />
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
                              {uniqueConnections.length > 0 && (
                                <div className="pt-1 border-t border-border mt-1">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {uniqueConnections.length} connection{uniqueConnections.length > 1 ? 's' : ''} attending:
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {uniqueConnections.slice(0, 5).map(conn => (
                                      <span key={conn.user_id} className="text-xs text-primary">
                                        @{conn.username || 'user'}
                                      </span>
                                    ))}
                                    {uniqueConnections.length > 5 && (
                                      <span className="text-xs text-muted-foreground">+{uniqueConnections.length - 5} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
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
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

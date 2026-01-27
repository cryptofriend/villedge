import { useState, useEffect, useMemo } from "react";
import { CalendarDays, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ProfileEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  luma_url: string;
  village_id: string;
  village_name?: string;
  village_logo?: string | null;
}

interface ProfileEventsCalendarProps {
  userId: string;
}

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

// Group events by date and assign rows based on conflicts
function assignEventRows(events: ProfileEvent[]): Map<string, { event: ProfileEvent; row: number }[]> {
  const byDate = new Map<string, ProfileEvent[]>();
  
  events.forEach(event => {
    const eventTime = toZonedTime(parseISO(event.start_time), VIETNAM_TZ);
    const dateKey = format(eventTime, "yyyy-MM-dd");
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(event);
  });

  const result = new Map<string, { event: ProfileEvent; row: number }[]>();

  byDate.forEach((dayEvents, dateKey) => {
    dayEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    const rows: { end: Date }[] = [];
    const assigned: { event: ProfileEvent; row: number }[] = [];

    dayEvents.forEach(event => {
      const start = toZonedTime(parseISO(event.start_time), VIETNAM_TZ);
      const end = event.end_time 
        ? toZonedTime(parseISO(event.end_time), VIETNAM_TZ)
        : new Date(start.getTime() + 60 * 60 * 1000);

      let assignedRow = -1;
      for (let i = 0; i < rows.length; i++) {
        if (start >= rows[i].end) {
          assignedRow = i;
          rows[i].end = end;
          break;
        }
      }

      if (assignedRow === -1) {
        assignedRow = rows.length;
        rows.push({ end });
      }

      assigned.push({ event, row: assignedRow });
    });

    result.set(dateKey, assigned);
  });

  return result;
}

export const ProfileEventsCalendar = ({ userId }: ProfileEventsCalendarProps) => {
  const [events, setEvents] = useState<ProfileEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: stays } = await supabase
          .from("stays")
          .select("village_id")
          .eq("user_id", userId);

        if (!stays || stays.length === 0) {
          setLoading(false);
          return;
        }

        const villageIds = [...new Set(stays.map(s => s.village_id))];

        const { data: eventsData } = await supabase
          .from("events")
          .select("id, title, start_time, end_time, location, luma_url, village_id")
          .in("village_id", villageIds)
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(50);

        const { data: villages } = await supabase
          .from("villages")
          .select("id, name, logo_url")
          .in("id", villageIds);

        const villageMap = new Map(villages?.map(v => [v.id, { name: v.name, logo: v.logo_url }]) || []);

        const enrichedEvents = (eventsData || []).map(e => ({
          ...e,
          village_name: villageMap.get(e.village_id)?.name,
          village_logo: villageMap.get(e.village_id)?.logo,
        }));

        setEvents(enrichedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userId]);

  const eventsByDate = useMemo(() => assignEventRows(events), [events]);
  const sortedDates = useMemo(() => 
    Array.from(eventsByDate.keys()).sort(), 
    [eventsByDate]
  );

  if (loading) {
    return (
      <section className="py-6 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4" />
          Events
        </h2>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-6 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4" />
          Events
        </h2>
        <p className="text-sm text-muted-foreground">
          No upcoming events from your villages
        </p>
      </section>
    );
  }

  return (
    <section className="py-6 border-b border-border">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
        <CalendarDays className="h-4 w-4" />
        Events
      </h2>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-2">
          {sortedDates.map(dateKey => {
            const dayEvents = eventsByDate.get(dateKey) || [];
            const maxRow = Math.max(...dayEvents.map(e => e.row), 0);
            const date = parseISO(dateKey);

            return (
              <div key={dateKey} className="shrink-0">
                {/* Date header */}
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {format(date, "EEE, MMM d")}
                </div>
                
                {/* Events grid - one row per conflict level */}
                <div className="flex flex-col gap-1" style={{ minWidth: "200px" }}>
                  {Array.from({ length: maxRow + 1 }, (_, rowIndex) => {
                    const rowEvents = dayEvents.filter(e => e.row === rowIndex);
                    
                    return (
                      <div key={rowIndex} className="flex gap-1">
                        {rowEvents.map(({ event }) => {
                          const startTime = toZonedTime(parseISO(event.start_time), VIETNAM_TZ);
                          
                          return (
                            <a
                              key={event.id}
                              href={event.luma_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "group flex items-center gap-2 px-2.5 py-1.5 rounded-md",
                                "bg-primary/10 hover:bg-primary/20 transition-colors",
                                "border border-primary/20"
                              )}
                            >
                              {/* Village logo */}
                              {event.village_logo ? (
                                <img 
                                  src={event.village_logo} 
                                  alt={event.village_name}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                />
                              ) : event.village_name ? (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[8px] font-medium text-primary">
                                    {event.village_name.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              ) : null}
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {format(startTime, "h:mm a")}
                                  </span>
                                  {event.village_name && (
                                    <span className="text-[10px] text-primary font-medium">
                                      · {event.village_name}
                                    </span>
                                  )}
                                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-xs font-medium text-foreground truncate max-w-[160px]">
                                  {event.title}
                                </p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

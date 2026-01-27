import { useState, useEffect } from "react";
import { CalendarDays, ExternalLink, MapPin, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";

interface ProfileEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  luma_url: string;
  village_name?: string;
}

interface ProfileEventsCalendarProps {
  userId: string;
}

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

export const ProfileEventsCalendar = ({ userId }: ProfileEventsCalendarProps) => {
  const [events, setEvents] = useState<ProfileEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Get villages the user is staying at
        const { data: stays } = await supabase
          .from("stays")
          .select("village_id")
          .eq("user_id", userId);

        if (!stays || stays.length === 0) {
          setLoading(false);
          return;
        }

        const villageIds = [...new Set(stays.map(s => s.village_id))];

        // Get events from those villages
        const { data: eventsData } = await supabase
          .from("events")
          .select("id, title, start_time, end_time, location, luma_url, village_id")
          .in("village_id", villageIds)
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(50);

        // Get village names
        const { data: villages } = await supabase
          .from("villages")
          .select("id, name")
          .in("id", villageIds);

        const villageMap = new Map(villages?.map(v => [v.id, v.name]) || []);

        const enrichedEvents = (eventsData || []).map(e => ({
          ...e,
          village_name: villageMap.get(e.village_id),
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

  // Get dates that have events
  const eventDates = events.map(e => {
    const eventTime = toZonedTime(parseISO(e.start_time), VIETNAM_TZ);
    return eventTime;
  });

  // Events on selected date
  const selectedDateEvents = selectedDate
    ? events.filter(e => {
        const eventTime = toZonedTime(parseISO(e.start_time), VIETNAM_TZ);
        return isSameDay(eventTime, selectedDate);
      })
    : [];

  return (
    <section className="py-6 border-b border-border">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
        <CalendarDays className="h-4 w-4" />
        Events
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No upcoming events from your villages
        </p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar */}
          <div className="shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasEvent: eventDates,
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/20 text-primary font-semibold",
              }}
            />
          </div>

          {/* Events list for selected date */}
          <div className="flex-1 min-w-0">
            {selectedDate && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  {format(selectedDate, "EEEE, MMMM d")}
                </h3>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No events on this date
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDateEvents.map((event) => {
                      const startTime = toZonedTime(parseISO(event.start_time), VIETNAM_TZ);
                      const endTime = event.end_time
                        ? toZonedTime(parseISO(event.end_time), VIETNAM_TZ)
                        : null;

                      const timeDisplay = endTime
                        ? `${format(startTime, "h:mm a")} – ${format(endTime, "h:mm a")}`
                        : format(startTime, "h:mm a");

                      return (
                        <a
                          key={event.id}
                          href={event.luma_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm text-foreground line-clamp-2">
                                {event.title}
                              </h4>
                              <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                                <span>{timeDisplay}</span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{event.location}</span>
                                  </span>
                                )}
                                {event.village_name && (
                                  <span className="text-primary">{event.village_name}</span>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

import { useState, useEffect } from "react";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, isAfter } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays, Plus, ExternalLink, MapPin, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

interface EventsListProps {
  villageId: string;
}

export const EventsList = ({ villageId }: EventsListProps) => {
  const { events, isLoading, addEvent } = useEvents(villageId);
  const [lumaUrl, setLumaUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lumaUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a Luma event URL",
        variant: "destructive",
      });
      return;
    }

    if (!lumaUrl.includes("lu.ma") && !lumaUrl.includes("luma.com")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Luma URL (lu.ma/... or luma.com/...)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addEvent.mutateAsync({ lumaUrl: lumaUrl.trim() });
      setLumaUrl("");
      toast({
        title: "Event added!",
        description: "The event has been added to the calendar",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message?.includes("duplicate") 
          ? "This event has already been added" 
          : "Failed to add event. Please check the URL.",
        variant: "destructive",
      });
    } finally {
    setIsSubmitting(false);
    }
  };

  // Live clock state for local time display
  const [currentTime, setCurrentTime] = useState(() => toZonedTime(new Date(), VIETNAM_TZ));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(toZonedTime(new Date(), VIETNAM_TZ));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Filter events based on actual end time (or start time if no end)
  const nowInVN = toZonedTime(new Date(), VIETNAM_TZ);
  
  const upcomingEvents = events.filter(e => {
    // Use end_time if available, otherwise use start_time
    const eventEndTimeInVN = e.end_time 
      ? toZonedTime(parseISO(e.end_time), VIETNAM_TZ)
      : toZonedTime(parseISO(e.start_time), VIETNAM_TZ);
    // Event is upcoming if it hasn't ended yet
    return isAfter(eventEndTimeInVN, nowInVN);
  });
  
  const pastEvents = events.filter(e => {
    const eventEndTimeInVN = e.end_time 
      ? toZonedTime(parseISO(e.end_time), VIETNAM_TZ)
      : toZonedTime(parseISO(e.start_time), VIETNAM_TZ);
    // Event is past if it has ended
    return !isAfter(eventEndTimeInVN, nowInVN);
  });

  const groupEventsByDate = (eventsList: typeof events) => {
    const grouped = new Map<string, typeof events>();
    
    eventsList.forEach(event => {
      const eventTimeInVN = toZonedTime(parseISO(event.start_time), VIETNAM_TZ);
      const dateKey = format(eventTimeInVN, "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    return grouped;
  };

  const upcomingGrouped = groupEventsByDate(upcomingEvents);
  const pastGrouped = groupEventsByDate(pastEvents);

  return (
    <div className="flex flex-col h-full">
      {/* Add event form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Paste Luma event URL"
            value={lumaUrl}
            onChange={(e) => setLumaUrl(e.target.value)}
            className="text-sm flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isSubmitting || !lumaUrl.trim()}
            className="shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Local time display */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>Local time: <span className="font-medium text-foreground">{format(currentTime, "h:mm a")}</span></span>
        <span className="text-xs opacity-60">(Vietnam)</span>
      </div>

      {/* Events list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 flex flex-col items-center gap-2">
              <CalendarDays className="h-8 w-8 opacity-50" />
              <p>No events yet. Add a Luma link!</p>
            </div>
          ) : (
            <>
              {/* Upcoming events */}
              {upcomingGrouped.size > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Upcoming
                  </h3>
                  {Array.from(upcomingGrouped.entries()).map(([dateKey, dayEvents]) => (
                    <div key={dateKey} className="space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        {format(parseISO(dateKey), "EEEE, MMMM d")}
                      </div>
                      {dayEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Past events */}
              {pastGrouped.size > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Past Events
                  </h3>
                  {Array.from(pastGrouped.entries())
                    .reverse()
                    .slice(0, 5)
                    .map(([dateKey, dayEvents]) => (
                      <div key={dateKey} className="space-y-2 opacity-60">
                        <div className="text-sm font-medium text-foreground">
                          {format(parseISO(dateKey), "EEEE, MMMM d")}
                        </div>
                        {dayEvents.map((event) => (
                          <EventCard key={event.id} event={event} isPast />
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface EventCardProps {
  event: {
    id: string;
    luma_url: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    image_url: string | null;
  };
  isPast?: boolean;
}

const EventCard = ({ event, isPast }: EventCardProps) => {
  const startTimeInVN = toZonedTime(parseISO(event.start_time), VIETNAM_TZ);
  const endTimeInVN = event.end_time ? toZonedTime(parseISO(event.end_time), VIETNAM_TZ) : null;
  
  const timeDisplay = endTimeInVN 
    ? `${format(startTimeInVN, "h:mm a")} – ${format(endTimeInVN, "h:mm a")}`
    : format(startTimeInVN, "h:mm a");
  
  return (
    <a
      href={event.luma_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors",
        isPast && "hover:opacity-80"
      )}
    >
      <div className="flex gap-3">
        {event.image_url && (
          <img
            src={event.image_url}
            alt=""
            className="w-16 h-16 rounded-md object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground line-clamp-2">
              {event.title}
            </h4>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          </div>
          
          <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span>{timeDisplay}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate" title={event.location}>{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

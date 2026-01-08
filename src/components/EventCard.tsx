import { format } from "date-fns";
import { DbEvent } from "@/hooks/useEvents";
import { Calendar, MapPin, ExternalLink, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  event: DbEvent;
  onDelete?: (id: string) => void;
}

export const EventCard = ({ event, onDelete }: EventCardProps) => {
  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const formatEventTime = () => {
    const start = format(startDate, "MMM d, yyyy h:mm a");
    if (endDate) {
      // Check if same day
      if (format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
        return `${format(startDate, "MMM d, yyyy")} · ${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
      }
      return `${start} - ${format(endDate, "MMM d, h:mm a")}`;
    }
    return start;
  };

  return (
    <div className="group relative rounded-xl bg-card border border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300">
      {event.image_url && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2">
            {event.name}
          </h3>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{formatEventTime()}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}

          {event.host_name && (
            <div className="flex items-center gap-2">
              {event.host_avatar ? (
                <img
                  src={event.host_avatar}
                  alt={event.host_name}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 flex-shrink-0" />
              )}
              <span>Hosted by {event.host_name}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {event.luma_url && (
          <a
            href={event.luma_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on Luma
          </a>
        )}
      </div>
    </div>
  );
};

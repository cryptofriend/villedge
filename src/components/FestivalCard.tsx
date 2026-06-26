import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ExternalLink, Music } from "lucide-react";
import type { Festival } from "@/hooks/useFestivals";

interface Props {
  festival: Festival | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start) return "";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
};

export const FestivalCard = ({ festival, open, onOpenChange }: Props) => {
  if (!festival) return null;
  const dates = formatDateRange(festival.start_date, festival.end_date);
  const location = [festival.location_name, festival.city, festival.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {festival.logo_url && (
              <img
                src={festival.logo_url}
                alt={festival.name}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="min-w-0">
              <DialogTitle className="text-xl text-left">
                {festival.name}
              </DialogTitle>
              {dates && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {dates}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {location && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>{location}</span>
            </div>
          )}

          {festival.genres && festival.genres.length > 0 && (
            <div className="flex items-start gap-2">
              <Music className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {festival.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {festival.description && (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {festival.description}
            </p>
          )}

          {festival.lineup_summary && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Lineup
              </h4>
              <p className="text-sm">{festival.lineup_summary}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {festival.website_url && (
              <Button asChild size="sm">
                <a
                  href={festival.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Official site
                </a>
              </Button>
            )}
            {festival.source_url && festival.source_url !== festival.website_url && (
              <Button asChild size="sm" variant="outline">
                <a href={festival.source_url} target="_blank" rel="noreferrer">
                  Source
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

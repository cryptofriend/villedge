import { Stay } from "@/hooks/useStays";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Twitter, Instagram, Github, Linkedin, Calendar, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getBestAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface ResidentProfileCardProps {
  stays: Stay[];
  nickname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getSocialIcon = (url: string) => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return <Twitter className="h-4 w-4" />;
  }
  if (lowerUrl.includes('instagram.com')) {
    return <Instagram className="h-4 w-4" />;
  }
  if (lowerUrl.includes('github.com')) {
    return <Github className="h-4 w-4" />;
  }
  if (lowerUrl.includes('linkedin.com')) {
    return <Linkedin className="h-4 w-4" />;
  }
  return <ExternalLink className="h-4 w-4" />;
};

export const ResidentProfileCard = ({ stays, nickname, open, onOpenChange }: ResidentProfileCardProps) => {
  if (stays.length === 0) return null;

  const firstStay = stays[0];
  const avatarUrl = getBestAvatar(nickname, firstStay?.social_profile || null, 80);

  // Get all unique villas
  const villas = [...new Set(stays.map(s => s.villa))];
  
  // Get date range across all stays
  const allDates = stays.flatMap(s => [parseISO(s.start_date), parseISO(s.end_date)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{nickname}'s Profile</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarUrl} alt={nickname} />
            <AvatarFallback className="text-xl">
              {nickname.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name & Status */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{nickname}</h2>
            <div className="flex items-center justify-center gap-2">
              {stays.map((stay, idx) => (
                <Badge
                  key={stay.id}
                  variant={stay.status === "confirmed" ? "default" : "secondary"}
                  className={cn(
                    stay.status === "planning" && "border-dashed border-2"
                  )}
                >
                  {stay.status === "planning" ? "Planning" : "Confirmed"}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stay Info */}
          <div className="w-full space-y-3 text-left bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(minDate, "MMM d")} – {format(maxDate, "MMM d, yyyy")}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{villas.join(", ")}</span>
            </div>

            {firstStay.intention && (
              <div className="text-sm">
                <span className="font-medium">Intention: </span>
                <span className="text-muted-foreground">{firstStay.intention}</span>
              </div>
            )}

            {firstStay.offerings && (
              <div className="text-sm">
                <span className="font-medium">Offers: </span>
                <span className="text-muted-foreground">{firstStay.offerings}</span>
              </div>
            )}

            {firstStay.asks && (
              <div className="text-sm">
                <span className="font-medium">Asks: </span>
                <span className="text-muted-foreground">{firstStay.asks}</span>
              </div>
            )}

            {firstStay.project_description && (
              <div className="text-sm">
                <span className="font-medium">Project: </span>
                <span className="text-muted-foreground">{firstStay.project_description}</span>
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="flex gap-2">
            {firstStay.social_profile && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={firstStay.social_profile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  {getSocialIcon(firstStay.social_profile)}
                  Social
                </a>
              </Button>
            )}
            {firstStay.project_url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={firstStay.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Project
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

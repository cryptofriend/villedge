import { useMemo } from "react";
import { format, parseISO, differenceInDays, isWithinInterval } from "date-fns";
import { Stay } from "@/hooks/useStays";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Twitter, Instagram, Github, Linkedin, ExternalLink, Briefcase, Search, Loader2 } from "lucide-react";
import { getBestAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface StayResidentCardsProps {
  stays: Stay[];
  loading: boolean;
  applyUrl?: string | null;
  isHost?: boolean;
}

// Detect social network from URL
const getSocialNetwork = (url: string | null): { type: 'twitter' | 'instagram' | 'github' | 'linkedin' | 'other' | null; icon: typeof Twitter | null } => {
  if (!url) return { type: null, icon: null };
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return { type: 'twitter', icon: Twitter };
  }
  if (lowerUrl.includes('instagram.com')) {
    return { type: 'instagram', icon: Instagram };
  }
  if (lowerUrl.includes('github.com')) {
    return { type: 'github', icon: Github };
  }
  if (lowerUrl.includes('linkedin.com')) {
    return { type: 'linkedin', icon: Linkedin };
  }
  return { type: 'other', icon: ExternalLink };
};

export const StayResidentCards = ({ stays, loading, applyUrl, isHost }: StayResidentCardsProps) => {
  const { user } = useAuth();

  // Group stays by nickname and get the latest/most relevant stay
  const residents = useMemo(() => {
    const grouped = new Map<string, { label: string; stays: Stay[] }>();
    stays.forEach((stay) => {
      const key = stay.user_id ?? stay.id;
      const existing = grouped.get(key);
      if (existing) {
        existing.stays.push(stay);
      } else {
        grouped.set(key, { label: stay.nickname, stays: [stay] });
      }
    });
    
    // Return array of [nickname, stays[]] sorted by start_date
    return Array.from(grouped.entries())
      .map(([residentKey, group]) => ({
        residentKey,
        nickname: group.label,
        stays: group.stays,
        primaryStay: group.stays[0],
        // Use backend-computed is_visible flag
        isVisible: group.stays[0]?.is_visible ?? false,
        userId: group.stays[0]?.user_id,
      }))
      .sort((a, b) => {
        const aDate = parseISO(a.primaryStay.start_date);
        const bDate = parseISO(b.primaryStay.start_date);
        return aDate.getTime() - bDate.getTime();
      });
  }, [stays]);

  // All residents are now default-public, no blur
  const shouldBlurResident = (_resident: { isVisible?: boolean; userId?: string | null }): boolean => {
    return false;
  };

  // Check if someone is "here now"
  const isHereNow = (stay: Stay) => {
    const today = new Date();
    const start = parseISO(stay.start_date);
    const end = parseISO(stay.end_date);
    return isWithinInterval(today, { start, end });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading residents...
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Calendar className="h-12 w-12 mb-3 text-muted-foreground/50" />
        <p>No residents yet</p>
        <p className="text-sm">Be the first to join this village!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
        {residents.map(({ residentKey, nickname, primaryStay, isVisible, userId }) => {
          // Use backend-computed visibility
          const shouldBlur = shouldBlurResident({ isVisible, userId });
          const avatarUrl = getBestAvatar(nickname, primaryStay.social_profile || null, 80);
          const social = getSocialNetwork(primaryStay.social_profile || null);
          const startDate = parseISO(primaryStay.start_date);
          const endDate = parseISO(primaryStay.end_date);
          const duration = differenceInDays(endDate, startDate) + 1;
          const hereNow = isHereNow(primaryStay);
          
          return (
            <div
              key={residentKey}
              className={cn(
                "rounded-xl border border-border bg-card overflow-hidden flex flex-col",
                shouldBlur && "blur-sm select-none pointer-events-none opacity-60"
              )}
            >
              {/* Card Header - Avatar & Badge */}
              <div className="relative pt-4 pb-2 flex flex-col items-center">
                {/* Here Now Badge */}
                {hereNow && (
                  <Badge 
                    className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-2"
                  >
                    Here now
                  </Badge>
                )}
                
                {/* Avatar */}
                <Avatar className="h-16 w-16 ring-2 ring-primary/10">
                  <AvatarImage src={avatarUrl} alt={nickname} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Name */}
                <h3 className="font-semibold text-foreground mt-2 text-center px-2 truncate max-w-full">
                  {nickname}
                  {user && userId === user.id && <span className="text-muted-foreground font-normal"> (you)</span>}
                </h3>
                
                {/* Villa */}
                <p className="text-xs text-muted-foreground">
                  {primaryStay.villa}
                </p>
              </div>
              
              {/* Date Range */}
              <div className="px-4 py-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(startDate, "MMM d")} - {format(endDate, "MMM d")} ({duration} days)
                </span>
              </div>
              
              {/* Intention */}
              {primaryStay.intention && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-center">
                    <p className="text-sm text-primary font-medium line-clamp-2">
                      {primaryStay.intention}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Offerings & Asks */}
              {(primaryStay.offerings || primaryStay.asks) && (
                <div className="px-4 pb-3 space-y-2 text-xs">
                  {primaryStay.offerings && (
                    <div className="flex items-start gap-1.5">
                      <Briefcase className="h-3 w-3 text-sage-600 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground line-clamp-2">{primaryStay.offerings}</span>
                    </div>
                  )}
                  {primaryStay.asks && (
                    <div className="flex items-start gap-1.5">
                      <Search className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground line-clamp-2">{primaryStay.asks}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Social Link */}
              {primaryStay.social_profile && social.icon && (
                <div className="mt-auto px-4 pb-3 flex justify-center">
                  <a
                    href={primaryStay.social_profile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    title={`View ${nickname}'s profile`}
                  >
                    <social.icon className="h-4 w-4 text-muted-foreground" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

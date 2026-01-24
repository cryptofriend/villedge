import { Resident } from "@/hooks/useResidents";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Twitter, Github, Globe, Loader2, MessageCircle, Briefcase, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResidentsListProps {
  residents: Resident[];
  loading: boolean;
}

export const ResidentsList = ({ residents, loading }: ResidentsListProps) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (residents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-2">No residents yet</p>
        <p className="text-xs text-muted-foreground">
          Be the first to join this village!
        </p>
      </div>
    );
  }

  // Mobile card-centric view
  if (isMobile) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-sm text-muted-foreground">
            {residents.length} resident{residents.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {residents.map((resident) => (
          <div
            key={resident.id}
            className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
          >
            {/* Card Header with Avatar */}
            <div className="p-4 pb-3 flex items-center gap-4 border-b border-border/50">
              <Avatar className="h-16 w-16 ring-2 ring-primary/10">
                <AvatarImage src={resident.avatar_url || undefined} alt={resident.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {resident.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground truncate">
                  {resident.name}
                </h3>
                {resident.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {resident.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {/* Skills */}
              {resident.skills && resident.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {resident.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs px-2.5 py-0.5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Looking for / Offering */}
              {(resident.looking_for || resident.offering) && (
                <div className="space-y-2">
                  {resident.looking_for && (
                    <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3">
                      <Search className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-primary block mb-0.5">Looking for</span>
                        <span className="text-sm text-foreground">{resident.looking_for}</span>
                      </div>
                    </div>
                  )}
                  {resident.offering && (
                    <div className="flex items-start gap-2 rounded-xl bg-sage-100 p-3">
                      <Briefcase className="h-4 w-4 text-sage-700 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-sage-700 block mb-0.5">Offering</span>
                        <span className="text-sm text-foreground">{resident.offering}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Footer - Social Links */}
            {(resident.twitter_url || resident.github_url || resident.website_url) && (
              <div className="px-4 pb-4 pt-1 flex gap-2">
                {resident.twitter_url && (
                  <a
                    href={resident.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Twitter</span>
                  </a>
                )}
                {resident.github_url && (
                  <a
                    href={resident.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">GitHub</span>
                  </a>
                )}
                {resident.website_url && (
                  <a
                    href={resident.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop view (unchanged)
  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="grid gap-4 p-1">
        {residents.map((resident) => (
          <div
            key={resident.id}
            className="rounded-xl bg-card border border-border p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={resident.avatar_url || undefined} alt={resident.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {resident.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{resident.name}</h4>
                {resident.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {resident.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Skills */}
            {resident.skills && resident.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resident.skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {resident.skills.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{resident.skills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Looking for / Offering */}
            {(resident.looking_for || resident.offering) && (
              <div className="grid gap-2 text-xs">
                {resident.looking_for && (
                  <div className="rounded-lg bg-primary/5 p-2">
                    <span className="text-primary font-medium">Looking for: </span>
                    <span className="text-muted-foreground">{resident.looking_for}</span>
                  </div>
                )}
                {resident.offering && (
                  <div className="rounded-lg bg-sage-100 p-2">
                    <span className="text-sage-700 font-medium">Offering: </span>
                    <span className="text-muted-foreground">{resident.offering}</span>
                  </div>
                )}
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-2">
              {resident.twitter_url && (
                <a
                  href={resident.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              {resident.github_url && (
                <a
                  href={resident.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Github className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              {resident.website_url && (
                <a
                  href={resident.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

import { SceniusProject } from "@/hooks/useSceniusProjects";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, ExternalLink, Loader2, User } from "lucide-react";
import { useStays } from "@/hooks/useStays";

interface SceniusListProps {
  projects: SceniusProject[];
  loading: boolean;
  villageId?: string;
}

const statusColors = {
  idea: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  paused: "bg-gray-100 text-gray-700 border-gray-200",
};

export const SceniusList = ({ projects, loading, villageId }: SceniusListProps) => {
  const { stays, loading: staysLoading } = useStays(villageId);
  
  // Get residents who have projects
  const residentProjects = stays.filter(stay => stay.project_description);

  const isLoading = loading || staysLoading;
  const hasContent = projects.length > 0 || residentProjects.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
        <p className="text-xs text-muted-foreground">
          Start building something together!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-3 p-1">
        {/* Resident Projects - simple line items */}
        {residentProjects.map((stay) => (
          <div
            key={stay.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{stay.nickname}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-sm text-muted-foreground truncate">
                  {stay.project_description}
                </span>
              </div>
            </div>
            {stay.project_url && (
              <a
                href={stay.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-xs text-primary"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">View</span>
              </a>
            )}
          </div>
        ))}

        {/* Scenius Projects - full cards */}
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-xl bg-card border border-border overflow-hidden"
          >
            {project.image_url && (
              <img
                src={project.image_url}
                alt={project.name}
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-foreground">{project.name}</h4>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs capitalize ${statusColors[project.status]}`}
                >
                  {project.status}
                </Badge>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {project.description}
                </p>
              )}

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2">
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs text-muted-foreground"
                  >
                    <Github className="h-3.5 w-3.5" />
                    GitHub
                  </a>
                )}
                {project.project_url && (
                  <a
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Project
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

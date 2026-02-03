import { useState } from "react";
import { SceniusProject, ResidentProject } from "@/hooks/useSceniusProjects";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, ExternalLink, Loader2, ChevronDown, ChevronRight, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getBestAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface SceniusListProps {
  projects: SceniusProject[];
  residentProjects?: ResidentProject[];
  loading: boolean;
  villageId?: string;
}

const statusColors = {
  idea: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  paused: "bg-gray-100 text-gray-700 border-gray-200",
};

// Group resident projects by user
interface GroupedResidentProjects {
  userId: string;
  nickname: string;
  socialProfile: string | null;
  projects: ResidentProject[];
}

const groupProjectsByUser = (projects: ResidentProject[]): GroupedResidentProjects[] => {
  const grouped = new Map<string, GroupedResidentProjects>();
  
  for (const project of projects) {
    const existing = grouped.get(project.user_id);
    if (existing) {
      existing.projects.push(project);
    } else {
      grouped.set(project.user_id, {
        userId: project.user_id,
        nickname: project.nickname,
        socialProfile: project.social_profile,
        projects: [project],
      });
    }
  }
  
  return Array.from(grouped.values());
};

// Single project row component
const ProjectRow = ({ project }: { project: ResidentProject }) => (
  <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors min-w-0 w-full overflow-hidden">
    <div className="flex-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 min-w-0">
        {project.favicon_url && (
          <img 
            src={project.favicon_url} 
            alt="" 
            className="w-4 h-4 flex-shrink-0"
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
        )}
        <span className="text-sm font-medium text-foreground truncate min-w-0">
          {project.title || new URL(project.url).hostname}
        </span>
      </div>
      {project.description && (
        <p className="text-xs text-muted-foreground truncate mt-0.5 pl-6 w-full">
          {project.description}
        </p>
      )}
    </div>
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="h-3 w-3" />
    </a>
  </div>
);

// User group with collapsible projects
const UserProjectGroup = ({ group }: { group: GroupedResidentProjects }) => {
  const [isOpen, setIsOpen] = useState(true);
  const avatarUrl = getBestAvatar(group.nickname, group.socialProfile, 40);
  const hasMultipleProjects = group.projects.length > 1;
  
  if (!hasMultipleProjects) {
    // Single project - show inline without collapsible
    const project = group.projects[0];
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/80 transition-colors min-w-0 overflow-hidden">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={avatarUrl} alt={group.nickname} />
          <AvatarFallback className="text-xs">
            {group.nickname.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-foreground text-sm truncate max-w-[80px] sm:max-w-none">{group.nickname}</span>
            <span className="text-muted-foreground hidden sm:inline">—</span>
            <span className="text-xs sm:text-sm text-foreground truncate flex-1 min-w-0">
              {project.title || new URL(project.url).hostname}
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-full">
              {project.description}
            </p>
          )}
        </div>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }
  
  // Multiple projects - show collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg bg-muted/50 border border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 p-3 hover:bg-muted/80 transition-colors text-left min-w-0">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={avatarUrl} alt={group.nickname} />
              <AvatarFallback className="text-xs">
                {group.nickname.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground text-sm truncate">{group.nickname}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {group.projects.length}
                </Badge>
              </div>
            </div>
            <div className="shrink-0 text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2 pb-2 space-y-1.5 border-t border-border pt-2">
            {group.projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const SceniusList = ({ projects, residentProjects = [], loading, villageId }: SceniusListProps) => {
  const groupedResidentProjects = groupProjectsByUser(residentProjects);
  const hasContent = projects.length > 0 || groupedResidentProjects.length > 0;

  if (loading) {
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
    <ScrollArea className="h-full w-full">
      <div className="space-y-2 p-1 pr-2 overflow-hidden">
        {/* Resident Projects grouped by user */}
        {groupedResidentProjects.map((group) => (
          <UserProjectGroup key={group.userId} group={group} />
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
                className="w-full h-24 sm:h-32 object-cover"
              />
            )}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-foreground text-sm sm:text-base">{project.name}</h4>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs capitalize ${statusColors[project.status]}`}
                >
                  {project.status}
                </Badge>
              </div>

              {project.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                  {project.description}
                </p>
              )}

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {project.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{project.tags.length - 4}
                    </Badge>
                  )}
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2 flex-wrap">
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs text-muted-foreground"
                  >
                    <Github className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">GitHub</span>
                  </a>
                )}
                {project.project_url && (
                  <a
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs text-primary"
                  >
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">View Project</span>
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

import { useState } from "react";
import { ExternalLink, Plus, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProjects } from "@/hooks/useUserProjects";
import { toast } from "sonner";

interface ProfileSceniusSectionProps {
  projectDescription?: string | null;
  projectUrl?: string | null;
  isOwnProfile: boolean;
  userId: string;
  onUpdate?: (updates: { project_description?: string; project_url?: string }) => void;
}

export const ProfileSceniusSection = ({
  isOwnProfile,
  userId,
}: ProfileSceniusSectionProps) => {
  const { projects, isLoading, addProject, deleteProject } = useUserProjects(userId);
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddProject = async () => {
    if (!newUrl.trim()) return;

    let url = newUrl.trim();
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSaving(true);
    const { error } = await addProject(url);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to add project");
    } else {
      setNewUrl("");
      setIsAdding(false);
      toast.success("Project added!");
    }
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await deleteProject(id);
    if (error) {
      toast.error("Failed to remove project");
    }
  };

  if (isLoading) {
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-4">
          <a 
            href="https://en.wiktionary.org/wiki/scenius" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary underline underline-offset-2"
          >
            collective genius
          </a>
        </p>
        <div className="animate-pulse h-16 bg-muted/30 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">
        <a 
          href="https://en.wiktionary.org/wiki/scenius" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary underline underline-offset-2"
        >
          collective genius
        </a>
      </p>

      {/* Projects list */}
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group relative bg-muted/30 rounded-lg border border-border overflow-hidden"
          >
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
            >
              {/* Thumbnail or Favicon */}
              {project.thumbnail_url ? (
                <img
                  src={project.thumbnail_url}
                  alt={project.title || "Project thumbnail"}
                  className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-muted"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : project.favicon_url ? (
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <img
                    src={project.favicon_url}
                    alt=""
                    className="w-6 h-6"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://www.google.com/s2/favicons?domain=${new URL(project.url).hostname}&sz=64`;
                    }}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {project.title || new URL(project.url).hostname.replace('www.', '')}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {project.description}
                  </p>
                )}
                <span className="text-[10px] text-muted-foreground/70 mt-1 block truncate">
                  {project.url.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}
                </span>
              </div>
            </a>

            {/* Delete button */}
            {isOwnProfile && (
              <button
                onClick={() => handleDeleteProject(project.id)}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                title="Remove project"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add project input */}
        {isOwnProfile && (
          isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://myproject.com"
                className="h-9 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddProject();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewUrl("");
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddProject}
                disabled={isSaving}
                className="h-9"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewUrl("");
                }}
                className="h-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full p-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add project
            </button>
          )
        )}

        {/* Empty state for non-owner */}
        {!isOwnProfile && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">No projects shared yet</p>
        )}
      </div>
    </div>
  );
};

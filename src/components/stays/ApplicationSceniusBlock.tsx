import { useState } from "react";
import { ExternalLink, Plus, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserProject } from "@/hooks/useUserProjects";
import { toast } from "sonner";

interface ApplicationSceniusBlockProps {
  projects: UserProject[];
  onAddProject: (url: string) => Promise<{ data?: any; error: any }>;
  onDeleteProject: (id: string) => Promise<{ error: any }>;
}

export const ApplicationSceniusBlock = ({
  projects,
  onAddProject,
  onDeleteProject,
}: ApplicationSceniusBlockProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;

    let url = newUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSaving(true);
    const { error } = await onAddProject(url);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to add project");
    } else {
      setNewUrl("");
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        Scenius – What are you building?
        <span className="text-destructive">*</span>
      </Label>
      <p className="text-xs text-muted-foreground">
        Share at least one project or link to what you're working on
      </p>

      {/* Existing projects */}
      {projects.length > 0 && (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border text-sm"
            >
              {project.favicon_url ? (
                <img
                  src={project.favicon_url}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate flex-1 text-foreground">
                {project.title || new URL(project.url).hostname.replace("www.", "")}
              </span>
              {project.description && (
                <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                  {project.description.slice(0, 30)}
                  {project.description.length > 30 ? "…" : ""}
                </Badge>
              )}
              <button
                type="button"
                onClick={async () => {
                  await onDeleteProject(project.id);
                }}
                className="h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add project inline */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://myproject.com"
            className="h-8 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewUrl("");
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={isSaving}
            className="h-8"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewUrl("");
            }}
            className="h-8 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full p-2 border border-dashed border-border rounded-md text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3 w-3" />
          Add project link
        </button>
      )}
    </div>
  );
};

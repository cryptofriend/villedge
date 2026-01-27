import { useState } from "react";
import { ExternalLink, Plus, Edit2, Save, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileSceniusSectionProps {
  projectDescription: string | null;
  projectUrl: string | null;
  isOwnProfile: boolean;
  userId: string;
  onUpdate: (updates: { project_description?: string; project_url?: string }) => void;
}

export const ProfileSceniusSection = ({
  projectDescription,
  projectUrl,
  isOwnProfile,
  userId,
  onUpdate,
}: ProfileSceniusSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDescription, setEditDescription] = useState(projectDescription || "");
  const [editUrl, setEditUrl] = useState(projectUrl || "");

  const hasProject = projectDescription || projectUrl;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        project_description: editDescription.trim() || null,
        project_url: editUrl.trim() || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) throw error;

      onUpdate({
        project_description: updates.project_description || undefined,
        project_url: updates.project_url || undefined,
      });
      setIsEditing(false);
      toast.success("Scenius updated!");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditDescription(projectDescription || "");
    setEditUrl(projectUrl || "");
  };

  return (
    <section className="py-6 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Scenius
        </h2>
        {isOwnProfile && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 text-xs"
          >
            {hasProject ? <Edit2 className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
            {hasProject ? "Edit" : "Add"}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              What are you working on?
            </label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Building a decentralized marketplace for..."
              className="text-sm resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Project Link (optional)
            </label>
            <Input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://myproject.com"
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : hasProject ? (
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          {projectDescription && (
            <p className="text-foreground text-sm leading-relaxed">
              {projectDescription}
            </p>
          )}
          {projectUrl && (
            <a
              href={projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {projectUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}
            </a>
          )}
        </div>
      ) : isOwnProfile ? (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full p-4 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4 mx-auto mb-1" />
          Share what you're building
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">No scenius shared yet</p>
      )}
    </section>
  );
};

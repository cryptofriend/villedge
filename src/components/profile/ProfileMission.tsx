import { useState } from "react";
import { Target, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfileMissionProps {
  mission: string | null | undefined;
  isOwnProfile: boolean;
  onUpdate: (mission: string) => void;
}

export const ProfileMission = ({ mission, isOwnProfile, onUpdate }: ProfileMissionProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(mission || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ bio: editValue.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      onUpdate(editValue.trim());
      setIsEditing(false);
      toast.success("Mission updated");
    } catch (error) {
      console.error("Error updating mission:", error);
      toast.error("Failed to update mission");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(mission || "");
    setIsEditing(false);
  };

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Current Mission</h2>
        </div>
        {isOwnProfile && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value.slice(0, 200))}
            placeholder="What are you building or improving in the network right now?"
            rows={3}
            className="text-lg resize-none"
            maxLength={200}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{editValue.length}/200</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
            {mission ? (
              <p className="text-xl font-display text-foreground leading-relaxed">
                "{mission}"
              </p>
            ) : (
              <p className="text-lg text-muted-foreground italic">
                {isOwnProfile 
                  ? "What are you building or improving in the network right now?" 
                  : "No mission set yet"}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

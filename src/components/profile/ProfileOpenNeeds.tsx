import { useState } from "react";
import { Handshake, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OpenNeed } from "@/pages/Profile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfileOpenNeedsProps {
  needs: OpenNeed[];
  isOwnProfile: boolean;
  onUpdate: (needs: OpenNeed[]) => void;
}

export const ProfileOpenNeeds = ({ needs, isOwnProfile, onUpdate }: ProfileOpenNeedsProps) => {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newReward, setNewReward] = useState("");

  const handleAdd = () => {
    if (!newDescription.trim()) return;

    const newNeed: OpenNeed = {
      id: `need-${Date.now()}`,
      description: newDescription.trim(),
      reward: newReward.trim() || undefined,
      status: "open",
    };

    onUpdate([newNeed, ...needs]);
    setNewDescription("");
    setNewReward("");
    setIsAdding(false);
    
    // Save to profile asks
    saveToProfile([newNeed, ...needs]);
  };

  const handleClose = (needId: string) => {
    const updated = needs.map((n) =>
      n.id === needId ? { ...n, status: "closed" as const } : n
    );
    onUpdate(updated);
    saveToProfile(updated);
  };

  const handleRemove = (needId: string) => {
    const updated = needs.filter((n) => n.id !== needId);
    onUpdate(updated);
    saveToProfile(updated);
  };

  const saveToProfile = async (updatedNeeds: OpenNeed[]) => {
    if (!user) return;

    try {
      const asksText = updatedNeeds
        .filter((n) => n.status === "open")
        .map((n) => n.description)
        .join("; ");

      await supabase
        .from("profiles")
        .update({ asks: asksText || null })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error saving asks:", error);
    }
  };

  const openNeeds = needs.filter((n) => n.status === "open");
  const closedNeeds = needs.filter((n) => n.status === "closed");

  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Open Needs</h2>
          <Badge variant="secondary" className="text-xs">
            {openNeeds.length} open
          </Badge>
        </div>
        {isOwnProfile && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Need
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
          <Textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What skill or help do you need?"
            rows={2}
            autoFocus
          />
          <Input
            value={newReward}
            onChange={(e) => setNewReward(e.target.value)}
            placeholder="Reward (optional): e.g., Reputation, tokens, co-authorship"
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!newDescription.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Open Needs */}
      <div className="space-y-3">
        {openNeeds.map((need) => (
          <div
            key={need.id}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-foreground">{need.description}</p>
                {need.reward && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium text-accent">Reward:</span> {need.reward}
                  </p>
                )}
              </div>
              {isOwnProfile && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleClose(need.id)}
                    className="p-1.5 hover:bg-emerald-500/10 rounded transition-colors"
                    title="Mark as closed"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </button>
                  <button
                    onClick={() => handleRemove(need.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Closed Needs */}
      {closedNeeds.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            {closedNeeds.length} closed
          </summary>
          <div className="mt-2 space-y-2">
            {closedNeeds.map((need) => (
              <div
                key={need.id}
                className="p-3 rounded-lg bg-muted/20 border border-border/50"
              >
                <p className="text-sm text-muted-foreground line-through">
                  {need.description}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {needs.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4">
          {isOwnProfile 
            ? "Share what help you're looking for to enable collaboration" 
            : "No open collaboration requests"}
        </p>
      )}
    </section>
  );
};

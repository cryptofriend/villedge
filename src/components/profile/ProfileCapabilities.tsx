import { useState } from "react";
import { Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfileCapabilitiesProps {
  capabilities: string[];
  isOwnProfile: boolean;
  onUpdate: (capabilities: string[]) => void;
}

const SUGGESTED_CAPABILITIES = [
  "Community Design",
  "Event Hosting",
  "UX Research",
  "Onchain Architecture",
  "Content Creation",
  "Smart Contracts",
  "Governance",
  "Facilitation",
  "Visual Design",
  "Product Strategy",
  "Developer Relations",
  "Research",
];

export const ProfileCapabilities = ({ capabilities, isOwnProfile, onUpdate }: ProfileCapabilitiesProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [customCapability, setCustomCapability] = useState("");

  const handleToggle = (capability: string) => {
    const newCapabilities = capabilities.includes(capability)
      ? capabilities.filter((c) => c !== capability)
      : [...capabilities, capability];
    
    onUpdate(newCapabilities);
  };

  const handleAddCustom = () => {
    if (!customCapability.trim()) return;
    if (capabilities.includes(customCapability.trim())) {
      toast.error("Already added");
      return;
    }
    onUpdate([...capabilities, customCapability.trim()]);
    setCustomCapability("");
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ offerings: capabilities.join(", ") })
        .eq("user_id", user.id);

      if (error) throw error;

      setIsEditing(false);
      toast.success("Capabilities saved");
    } catch (error) {
      console.error("Error saving capabilities:", error);
      toast.error("Failed to save");
    }
  };

  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Capabilities I Bring</h2>
        </div>
        {isOwnProfile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isEditing ? "Save" : "Edit"}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Suggested Capabilities */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_CAPABILITIES.map((cap) => (
              <button
                key={cap}
                onClick={() => handleToggle(cap)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  capabilities.includes(cap)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {capabilities.includes(cap) && <span className="mr-1">✓</span>}
                {cap}
              </button>
            ))}
          </div>

          {/* Custom Capabilities */}
          <div className="flex items-center gap-2">
            <Input
              value={customCapability}
              onChange={(e) => setCustomCapability(e.target.value)}
              placeholder="Add custom capability..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            />
            <Button size="sm" onClick={handleAddCustom} disabled={!customCapability.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Custom */}
          {capabilities.filter((c) => !SUGGESTED_CAPABILITIES.includes(c)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {capabilities
                .filter((c) => !SUGGESTED_CAPABILITIES.includes(c))
                .map((cap) => (
                  <Badge
                    key={cap}
                    variant="secondary"
                    className="pr-1.5 gap-1"
                  >
                    {cap}
                    <button
                      onClick={() => handleToggle(cap)}
                      className="ml-1 p-0.5 hover:bg-destructive/20 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {capabilities.length > 0 ? (
            capabilities.map((cap) => (
              <Badge
                key={cap}
                variant="secondary"
                className="px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20"
              >
                {cap}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isOwnProfile ? "Add capabilities to help others find you" : "No capabilities listed"}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

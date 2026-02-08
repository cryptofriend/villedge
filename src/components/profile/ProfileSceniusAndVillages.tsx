import { useState } from "react";
import { Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileSceniusSection } from "./ProfileSceniusSection";
import { ProfileVillageTimeline } from "./ProfileVillageTimeline";

type ActiveTab = "scenius" | "villages";

interface ProfileSceniusAndVillagesProps {
  userId: string;
  isOwnProfile: boolean;
  projectDescription?: string | null;
  projectUrl?: string | null;
  onUpdate?: (updates: { project_description?: string; project_url?: string }) => void;
}

export const ProfileSceniusAndVillages = ({
  userId,
  isOwnProfile,
  projectDescription,
  projectUrl,
  onUpdate,
}: ProfileSceniusAndVillagesProps) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("scenius");

  return (
    <section className="py-6 border-b border-border">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("scenius")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            activeTab === "scenius"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Scenius
        </button>
        <button
          onClick={() => setActiveTab("villages")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            activeTab === "villages"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          My Villages
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[120px]">
        {activeTab === "scenius" ? (
          <ProfileSceniusSection
            isOwnProfile={isOwnProfile}
            userId={userId}
            projectDescription={projectDescription}
            projectUrl={projectUrl}
            onUpdate={onUpdate}
          />
        ) : (
          <ProfileVillageTimeline userId={userId} />
        )}
      </div>
    </section>
  );
};

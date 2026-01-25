import { useState } from "react";
import { Users, CalendarDays, Calendar } from "lucide-react";
import { useStays } from "@/hooks/useStays";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddStayForm } from "./AddStayForm";
import { StayGanttTimeline } from "./StayGanttTimeline";
import { StayResidentCards } from "./StayResidentCards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StayCalendarProps {
  villageId: string;
  applyUrl?: string | null;
}

export const StayCalendar = ({ villageId, applyUrl }: StayCalendarProps) => {
  const { stays, loading, addStay } = useStays(villageId);
  const isMobile = useIsMobile();
  
  // Default to cards view on mobile, timeline on desktop
  const [viewMode, setViewMode] = useState<"cards" | "timeline">(isMobile ? "cards" : "timeline");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Residents
          </h3>
          <p className="text-xs text-muted-foreground">
            {stays.length} {stays.length === 1 ? "resident" : "residents"} registered
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("cards")}
              className={cn(
                "h-8 px-3 text-xs gap-1.5 rounded-md",
                viewMode === "cards" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Residents</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("timeline")}
              className={cn(
                "h-8 px-3 text-xs gap-1.5 rounded-md",
                viewMode === "timeline" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </Button>
          </div>
          
          <AddStayForm villageId={villageId} onAddStay={addStay} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        {viewMode === "cards" ? (
          <StayResidentCards stays={stays} loading={loading} applyUrl={applyUrl} />
        ) : (
          <StayGanttTimeline stays={stays} loading={loading} />
        )}
      </div>
    </div>
  );
};

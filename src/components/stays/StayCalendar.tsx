import { Users } from "lucide-react";
import { useStays } from "@/hooks/useStays";
import { AddStayForm } from "./AddStayForm";
import { StayGanttTimeline } from "./StayGanttTimeline";

interface StayCalendarProps {
  villageId: string;
}

export const StayCalendar = ({ villageId }: StayCalendarProps) => {
  const { stays, loading, addStay } = useStays(villageId);

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
        <AddStayForm villageId={villageId} onAddStay={addStay} />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden p-4">
        <StayGanttTimeline stays={stays} loading={loading} />
      </div>
    </div>
  );
};

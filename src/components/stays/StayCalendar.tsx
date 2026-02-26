import { useState } from "react";
import { Users, CalendarDays } from "lucide-react";
import { useStays, Stay } from "@/hooks/useStays";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AddStayForm } from "./AddStayForm";
import { StayGanttTimeline } from "./StayGanttTimeline";
import { StayResidentCards } from "./StayResidentCards";
import { EditStayDialog } from "./EditStayDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink } from "lucide-react";

interface StayCalendarProps {
  villageId: string;
  applyUrl?: string | null;
  botUsername?: string;
}

export const StayCalendar = ({ villageId, applyUrl, botUsername }: StayCalendarProps) => {
  const { stays, loading, addStay, updateStayByOwner, deleteStayAsHost, updateStayAsHost } = useStays(villageId);
  const { user } = useAuth();
  const { isHost } = usePermissions();
  const isMobile = useIsMobile();
  
  const isVillageHost = isHost(villageId);
  
  // Default to cards view on mobile, timeline on desktop
  const [viewMode, setViewMode] = useState<"cards" | "timeline">(isMobile ? "cards" : "timeline");
  const [editingStay, setEditingStay] = useState<Stay | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingStay, setDeletingStay] = useState<Stay | null>(null);

  const handleEditStay = (stay: Stay) => {
    setEditingStay(stay);
    setEditDialogOpen(true);
  };

  const handleDeleteStay = (stay: Stay) => {
    setDeletingStay(stay);
  };

  const confirmDeleteStay = async () => {
    if (!deletingStay) return;
    await deleteStayAsHost(deletingStay.id);
    setDeletingStay(null);
  };

  const handleSaveStay = async (stayId: string, updates: { start_date: string; end_date: string; status: "planning" | "confirmed" }) => {
    // If user is host, use host update function
    if (isVillageHost) {
      return await updateStayAsHost(stayId, updates);
    }
    return await updateStayByOwner(stayId, updates, user?.id || null);
  };

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
          
          {applyUrl && villageId !== "protoville" && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Apply</span>
              </a>
            </Button>
          )}
          
          <AddStayForm villageId={villageId} onAddStay={addStay} botUsername={botUsername} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden p-4">
        {viewMode === "cards" ? (
          <StayResidentCards stays={stays} loading={loading} applyUrl={applyUrl} isHost={isVillageHost} />
        ) : (
          <StayGanttTimeline 
            stays={stays} 
            loading={loading} 
            onEditStay={handleEditStay}
            onDeleteStay={handleDeleteStay}
            isHost={isVillageHost}
            villageId={villageId}
          />
        )}
      </div>

      {/* Edit Stay Dialog */}
      <EditStayDialog
        stay={editingStay}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveStay}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingStay} onOpenChange={(open) => !open && setDeletingStay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingStay?.nickname}'s stay submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStay} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

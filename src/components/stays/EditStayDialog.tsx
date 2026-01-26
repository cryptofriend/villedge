import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Check, HelpCircle } from "lucide-react";
import { Stay } from "@/hooks/useStays";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditStayDialogProps {
  stay: Stay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stayId: string, updates: { start_date: string; end_date: string; status: "planning" | "confirmed" }) => Promise<boolean>;
}

export const EditStayDialog = ({ stay, open, onOpenChange, onSave }: EditStayDialogProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    stay ? parseISO(stay.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    stay ? parseISO(stay.end_date) : undefined
  );
  const [status, setStatus] = useState<"planning" | "confirmed">(
    stay?.status || "planning"
  );
  const [saving, setSaving] = useState(false);

  // Reset state when stay changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && stay) {
      setStartDate(parseISO(stay.start_date));
      setEndDate(parseISO(stay.end_date));
      setStatus(stay.status || "planning");
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!stay || !startDate || !endDate) {
      toast.error("Please select both dates");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setSaving(true);
    const success = await onSave(stay.id, {
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      status,
    });
    setSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  if (!stay) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Stay</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={status === "planning" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus("planning")}
                className="flex-1 gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Planning
              </Button>
              <Button
                type="button"
                variant={status === "confirmed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus("confirmed")}
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" />
                Confirmed
              </Button>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

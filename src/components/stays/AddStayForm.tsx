import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Plane, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StayInput } from "@/hooks/useStays";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AddStayFormProps {
  villageId: string;
  onAddStay: (stay: StayInput) => Promise<any>;
}

export const AddStayForm = ({ villageId, onAddStay }: AddStayFormProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [status, setStatus] = useState<"planning" | "confirmed">("planning");

  const resetForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStatus("planning");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      toast.error("Please select arrival and departure dates");
      return;
    }

    if (endDate < startDate) {
      toast.error("Departure date must be after arrival date");
      return;
    }

    if (!user) {
      toast.error("You must be signed in to add a stay");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use profile data for the stay
      const nickname = profile?.display_name || user.email?.split('@')[0] || "Anonymous";
      
      const stay: StayInput = {
        village_id: villageId,
        nickname: nickname.slice(0, 30),
        villa: "Default",
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        intention: profile?.bio || undefined,
        social_profile: profile?.social_url || undefined,
        offerings: profile?.offerings || undefined,
        asks: profile?.asks || undefined,
        project_description: profile?.project_description || undefined,
        project_url: profile?.project_url || undefined,
        status,
        user_id: user.id,
      };

      const result = await onAddStay(stay);
      if (result) {
        resetForm();
        setOpen(false);
        toast.success("Stay added! You're joining the village.");
        // Refresh page to reflect changes
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="sage" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Your Stay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Your Stay</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Arrival
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    {startDate ? format(startDate, "MMM d") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Departure
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    {endDate ? format(endDate, "MMM d") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-sm">Status</Label>
            <RadioGroup
              value={status}
              onValueChange={(value) => setStatus(value as "planning" | "confirmed")}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="planning"
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  status === "planning"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="planning" id="planning" className="sr-only" />
                <Plane className={cn("h-4 w-4", status === "planning" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", status === "planning" ? "text-foreground" : "text-muted-foreground")}>
                  Planning
                </span>
              </Label>
              
              <Label
                htmlFor="confirmed"
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  status === "confirmed"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="confirmed" id="confirmed" className="sr-only" />
                <CheckCircle className={cn("h-4 w-4", status === "confirmed" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", status === "confirmed" ? "text-foreground" : "text-muted-foreground")}>
                  Confirmed
                </span>
              </Label>
            </RadioGroup>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your profile info will be shown on your stay card
          </p>

          <Button type="submit" variant="sage" className="w-full" disabled={isSubmitting || !startDate || !endDate}>
            {isSubmitting ? "Adding..." : "Add Stay"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, CalendarIcon, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddVillageFormProps {
  onVillageAdded?: () => void;
}

export const AddVillageForm = ({ onVillageAdded }: AddVillageFormProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const resolveLocation = async (locationText: string) => {
    if (!locationText.trim()) return;
    
    setIsResolvingLocation(true);
    try {
      const { data, error } = await supabase.functions.invoke("resolve-google-maps", {
        body: { query: locationText },
      });

      if (error) throw error;

      if (data?.coordinates) {
        setCoordinates([data.coordinates.lng, data.coordinates.lat]);
        if (data.formattedAddress) {
          setLocation(data.formattedAddress);
        }
        toast.success("Location found!");
      } else {
        toast.error("Couldn't find that location");
      }
    } catch (err) {
      console.error("Error resolving location:", err);
      toast.error("Failed to resolve location");
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !location.trim() || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!coordinates) {
      toast.error("Please search for a valid location");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      const id = generateSlug(name);
      const dates = `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;

      const { error } = await supabase.from("villages").insert({
        id,
        name: name.trim(),
        location: location.trim(),
        center: coordinates,
        dates,
        description: `A village community in ${location}`,
      });

      if (error) throw error;

      toast.success("Village created!");
      setOpen(false);
      resetForm();
      onVillageAdded?.();
    } catch (err: any) {
      console.error("Error creating village:", err);
      if (err.code === "23505") {
        toast.error("A village with this name already exists");
      } else {
        toast.error("Failed to create village");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setLocation("");
    setStartDate(undefined);
    setEndDate(undefined);
    setCoordinates(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full shadow-md">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create a Village</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Village Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Proof of Retreat"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Search city or place..."
                  className="pl-9"
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => resolveLocation(location)}
                disabled={isResolvingLocation || !location.trim()}
              >
                {isResolvingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
            {coordinates && (
              <p className="text-xs text-muted-foreground">
                📍 Coordinates: {coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <Label>Timeline</Label>
            <div className="flex items-center gap-2">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">→</span>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => (startDate ? date < startDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Village"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

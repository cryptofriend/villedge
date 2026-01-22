import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, MapPin, CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface AddVillageFormProps {
  onVillageAdded?: () => void;
}

export const AddVillageForm = ({ onVillageAdded }: AddVillageFormProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const resolveGoogleMapsUrl = async (url: string) => {
    if (!url.trim()) return;
    
    setIsResolving(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('resolve-google-maps', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.success && data.data) {
        const place = data.data;
        if (place.coordinates) {
          setCoordinates(place.coordinates);
        }
        if (place.name) {
          setLocationName(place.name);
        }
        toast.success("Location extracted successfully!");
      } else {
        toast.error(data.error || "Could not extract location from URL");
      }
    } catch (err) {
      console.error("Error resolving URL:", err);
      toast.error("Failed to resolve Google Maps URL");
    } finally {
      setIsResolving(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setGoogleMapsUrl(url);
    
    // Auto-resolve when a Google Maps URL is pasted
    if (url.includes('google.com/maps') || url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      resolveGoogleMapsUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to create a village");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a village name");
      return;
    }

    if (!coordinates) {
      toast.error("Please paste a valid Google Maps link");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setIsSubmitting(true);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dates = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

    const { error } = await supabase.from('villages').insert({
      id: slug,
      name: name.trim(),
      location: locationName || "Location",
      center: coordinates,
      dates,
      description: `Welcome to ${name.trim()}`,
      created_by: user.id,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error("A village with this name already exists");
      } else {
        toast.error("Failed to create village");
        console.error(error);
      }
      return;
    }

    toast.success(`${name} created successfully!`);
    
    // Reset form
    setName("");
    setGoogleMapsUrl("");
    setLocationName("");
    setCoordinates(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setOpen(false);
    
    onVillageAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Village</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Village Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Proof of Retreat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">Location (Google Maps Link) *</Label>
            <div className="relative">
              <Input
                id="googleMapsUrl"
                placeholder="Paste Google Maps link..."
                value={googleMapsUrl}
                onChange={handleUrlChange}
                disabled={isResolving}
              />
              {isResolving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {coordinates ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {locationName || `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Paste a Google Maps link to set the village location
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
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
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
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
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="sage" className="flex-1" disabled={isSubmitting || isResolving}>
              {isSubmitting ? "Creating..." : "Create Village"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

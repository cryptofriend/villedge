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
import { Plus, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SpotInput } from "@/hooks/useSpots";
import { supabase } from "@/integrations/supabase/client";

interface PlaceData {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  coordinates?: [number, number];
  description?: string;
  imageUrl?: string;
  resolvedUrl?: string;
}

interface AddSpotFormProps {
  onAddSpot: (spot: SpotInput) => Promise<unknown>;
  pendingCoordinates?: [number, number] | null;
  onSetCoordinates?: (coords: [number, number] | null) => void;
}

export const AddSpotForm = ({
  onAddSpot,
  pendingCoordinates,
  onSetCoordinates,
}: AddSpotFormProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);

  const resolveGoogleMapsUrl = async (url: string) => {
    if (!url.trim()) return;
    
    setIsResolving(true);
    setPlaceData(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('resolve-google-maps', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.success && data.data) {
        const place = data.data as PlaceData;
        setPlaceData(place);
        
        if (place.coordinates) {
          onSetCoordinates?.(place.coordinates);
        }
        
        if (place.name && !name) {
          setName(place.name);
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

    if (!name.trim()) {
      toast.error("Please enter a spot name");
      return;
    }

    if (!pendingCoordinates) {
      toast.error("Please paste a valid Google Maps link");
      return;
    }

    setIsSubmitting(true);

    const newSpot: SpotInput = {
      name: name.trim(),
      coordinates: pendingCoordinates,
      google_maps_url: placeData?.resolvedUrl || googleMapsUrl.trim() || undefined,
    };

    const result = await onAddSpot(newSpot);
    setIsSubmitting(false);

    if (result) {
      toast.success(`${name} added to the map!`);

      // Reset form
      setName("");
      setGoogleMapsUrl("");
      setPlaceData(null);
      onSetCoordinates?.(null);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="sage" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Spot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add New Spot
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">Google Maps Link *</Label>
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
            {pendingCoordinates ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location: {pendingCoordinates[1].toFixed(4)}, {pendingCoordinates[0].toFixed(4)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Paste a Google Maps link (including shortened links)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Spot Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Sunrise Yoga Spot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="sage"
              className="flex-1"
              disabled={isSubmitting || isResolving}
            >
              {isSubmitting ? "Adding..." : "Add Spot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

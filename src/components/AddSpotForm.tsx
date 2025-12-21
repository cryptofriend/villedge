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
import { Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SpotInput } from "@/hooks/useSpots";

// Parse coordinates and place name from various Google Maps URL formats
const parseGoogleMapsUrl = (url: string): { coords: [number, number]; name?: string } | null => {
  try {
    let coords: [number, number] | null = null;
    let placeName: string | undefined;

    // Extract place name from /place/Name/ format
    const placeMatch = url.match(/\/place\/([^\/]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    // Format: @lat,lng
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords = [lng, lat]; // Mapbox uses [lng, lat]
      }
    }

    // Format: !3d{lat}!4d{lng}
    if (!coords) {
      const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (dMatch) {
        const lat = parseFloat(dMatch[1]);
        const lng = parseFloat(dMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          coords = [lng, lat];
        }
      }
    }

    // Format: q=lat,lng or query=lat,lng
    if (!coords) {
      const qMatch = url.match(/[?&](?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) {
        const lat = parseFloat(qMatch[1]);
        const lng = parseFloat(qMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          coords = [lng, lat];
        }
      }
    }

    // Format: ll=lat,lng
    if (!coords) {
      const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (llMatch) {
        const lat = parseFloat(llMatch[1]);
        const lng = parseFloat(llMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          coords = [lng, lat];
        }
      }
    }

    if (coords) {
      return { coords, name: placeName };
    }

    return null;
  } catch {
    return null;
  }
};

interface AddSpotFormProps {
  onAddSpot: (spot: SpotInput) => Promise<unknown>;
  pendingCoordinates?: [number, number] | null;
  onSetCoordinates?: (coords: [number, number]) => void;
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
      google_maps_url: googleMapsUrl.trim() || undefined,
    };

    const result = await onAddSpot(newSpot);
    setIsSubmitting(false);

    if (result) {
      toast.success(`${name} added to the map!`);

      // Reset form
      setName("");
      setGoogleMapsUrl("");
      onSetCoordinates?.(undefined as any);
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
            <Input
              id="googleMapsUrl"
              placeholder="Paste Google Maps link..."
              value={googleMapsUrl}
              onChange={(e) => {
                setGoogleMapsUrl(e.target.value);
                // Auto-extract coordinates and name on paste
                const result = parseGoogleMapsUrl(e.target.value.trim());
                if (result) {
                  onSetCoordinates?.(result.coords);
                  if (result.name && !name) {
                    setName(result.name);
                  }
                }
              }}
            />
            {pendingCoordinates ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location: {pendingCoordinates[1].toFixed(4)}, {pendingCoordinates[0].toFixed(4)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Paste a Google Maps link to extract the location
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Spot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

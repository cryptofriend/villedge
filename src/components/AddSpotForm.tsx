import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, MapPin } from "lucide-react";
import { categoryLabels } from "@/data/spots";
import { toast } from "sonner";
import { SpotInput } from "@/hooks/useSpots";

type SpotCategory = "accommodation" | "food" | "activity" | "work";

// Parse coordinates from various Google Maps URL formats
const parseGoogleMapsUrl = (url: string): [number, number] | null => {
  try {
    // Format: @lat,lng or !3d{lat}!4d{lng}
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat]; // Mapbox uses [lng, lat]
      }
    }

    // Format: !3d{lat}!4d{lng}
    const dMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dMatch) {
      const lat = parseFloat(dMatch[1]);
      const lng = parseFloat(dMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat];
      }
    }

    // Format: q=lat,lng or query=lat,lng
    const qMatch = url.match(/[?&](?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat];
      }
    }

    // Format: ll=lat,lng
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat];
      }
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
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SpotCategory>("activity");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a spot name");
      return;
    }

    if (!pendingCoordinates) {
      toast.error("Please select a location on the map");
      return;
    }

    setIsSubmitting(true);

    const newSpot: SpotInput = {
      name: name.trim(),
      description: description.trim() || "A great spot in Popup Village",
      image_url: imageUrl.trim() || undefined,
      category,
      coordinates: pendingCoordinates,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const result = await onAddSpot(newSpot);
    setIsSubmitting(false);

    if (result) {
      toast.success(`${name} added to the map!`);

      // Reset form
      setName("");
      setDescription("");
      setCategory("activity");
      setTags("");
      setImageUrl("");
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
            <Label htmlFor="name">Spot Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Sunrise Yoga Spot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as SpotCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(categoryLabels) as [SpotCategory, string][]
                ).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What makes this spot special?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., Beach, Sunset, Yoga"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">Google Maps Link *</Label>
            <Input
              id="googleMapsUrl"
              placeholder="Paste Google Maps link..."
              value={googleMapsUrl}
              onChange={(e) => {
                setGoogleMapsUrl(e.target.value);
                // Auto-extract coordinates on paste
                const coords = parseGoogleMapsUrl(e.target.value.trim());
                if (coords) {
                  onSetCoordinates?.(coords);
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

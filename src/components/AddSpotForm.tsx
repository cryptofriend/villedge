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
import { ImageUpload } from "@/components/ImageUpload";
import { Spot, categoryColors, categoryLabels } from "@/data/spots";

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
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<Spot["category"]>("activity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);

  const categories: Spot["category"][] = ["accommodation", "food", "activity", "work", "atm", "shopping"];

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
      toast.error("Failed to resolve map URL");
    } finally {
      setIsResolving(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setGoogleMapsUrl(url);
    
    // Auto-resolve when a Google Maps or Kakao Maps URL is pasted
    if (url.includes('google.com/maps') || url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps') || url.includes('map.kakao.com') || url.includes('map.kakao.co') || url.includes('place.map.kakao.com')) {
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
      toast.error("Please paste a valid map link");
      return;
    }

    setIsSubmitting(true);

    const newSpot: SpotInput = {
      name: name.trim(),
      coordinates: pendingCoordinates,
      category,
      google_maps_url: placeData?.resolvedUrl || googleMapsUrl.trim() || undefined,
      image_url: imageUrl.trim() || placeData?.imageUrl || undefined,
      description: placeData?.description || undefined,
    };

    const result = await onAddSpot(newSpot);
    setIsSubmitting(false);

    if (result) {
      toast.success(`${name} added to the map!`);

      // Reset form
      setName("");
      setGoogleMapsUrl("");
      setImageUrl("");
      setCategory("activity");
      setPlaceData(null);
      onSetCoordinates?.(null);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="sage" 
          size="icon" 
          className="h-12 w-12 rounded-full shadow-lg"
          title="Add Spot"
        >
          <Plus className="h-5 w-5" />
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
            <Label htmlFor="googleMapsUrl">Map Link *</Label>
            <div className="relative">
              <Input
                id="googleMapsUrl"
                placeholder="Paste Google Maps or Kakao Maps link..."
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
                Paste a Google Maps or Kakao Maps link
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

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    category === cat
                      ? "text-primary-foreground ring-2 ring-offset-2 ring-primary"
                      : "text-primary-foreground opacity-60 hover:opacity-80"
                  }`}
                  style={{ backgroundColor: categoryColors[cat] }}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image (optional)</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="https://..."
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

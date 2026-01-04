import { useState } from "react";
import { Spot, categoryColors, categoryLabels } from "@/data/spots";
import { SpotUpdate } from "@/hooks/useSpots";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";

interface EditSpotDialogProps {
  spot: Spot & { google_maps_url?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (spotId: string, updates: SpotUpdate) => Promise<any>;
}

const categories: Spot["category"][] = ["accommodation", "food", "activity", "work", "atm", "shopping"];

export const EditSpotDialog = ({ spot, open, onOpenChange, onUpdate }: EditSpotDialogProps) => {
  const [name, setName] = useState(spot.name);
  const [description, setDescription] = useState(spot.description);
  const [category, setCategory] = useState<Spot["category"]>(spot.category);
  const [tags, setTags] = useState(spot.tags?.join(", ") || "");
  const [imageUrl, setImageUrl] = useState(spot.image || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(spot.google_maps_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    
    const updates: SpotUpdate = {
      name: name.trim(),
      description: description.trim(),
      category,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      image_url: imageUrl.trim() || undefined,
      google_maps_url: googleMapsUrl.trim() || undefined,
    };

    const result = await onUpdate(spot.id, updates);
    
    setIsSubmitting(false);
    
    if (result) {
      toast.success("Spot updated!");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Spot</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spot name"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this spot..."
              rows={3}
              maxLength={500}
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
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Coffee, Beach, WiFi"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
            <Input
              id="googleMapsUrl"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              type="url"
            />
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="sage"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

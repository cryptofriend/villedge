import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { Village } from "@/hooks/useVillages";
import { supabase } from "@/integrations/supabase/client";

interface EditVillageDialogProps {
  village: Village;
  onVillageUpdated?: () => void;
}

export const EditVillageDialog = ({ village, onVillageUpdated }: EditVillageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState(village.name);
  const [description, setDescription] = useState(village.description);
  const [logoUrl, setLogoUrl] = useState(village.logo_url || "");
  const [telegramUrl, setTelegramUrl] = useState(village.telegram_url || "");
  const [twitterUrl, setTwitterUrl] = useState(village.twitter_url || "");
  const [instagramUrl, setInstagramUrl] = useState(village.instagram_url || "");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(village.name);
      setDescription(village.description);
      setLogoUrl(village.logo_url || "");
      setTelegramUrl(village.telegram_url || "");
      setTwitterUrl(village.twitter_url || "");
      setInstagramUrl(village.instagram_url || "");
    }
  }, [open, village]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a village name");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("villages")
        .update({
          name: name.trim(),
          description: description.trim(),
          logo_url: logoUrl || null,
          telegram_url: telegramUrl || null,
          twitter_url: twitterUrl || null,
          instagram_url: instagramUrl || null,
        })
        .eq("id", village.id);

      if (error) throw error;

      toast.success("Village updated successfully!");
      setOpen(false);
      onVillageUpdated?.();
    } catch (err) {
      console.error("Error updating village:", err);
      toast.error("Failed to update village");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Edit village"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Village</DialogTitle>
          <DialogDescription>
            Update village details and social links
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Village Logo</Label>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Upload or enter logo URL"
              aspectRatio={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Village Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Proof of Retreat"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this village about?"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">Social Links</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram</Label>
                <Input
                  id="telegram"
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                  placeholder="https://t.me/yourchannel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input
                  id="twitter"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/yourhandle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

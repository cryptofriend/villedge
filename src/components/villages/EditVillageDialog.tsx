import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit3, Loader2, Settings, Users, MapPin, Image } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { Village } from "@/hooks/useVillages";
import { supabase } from "@/integrations/supabase/client";
import { CoHostManager } from "./CoHostManager";

interface EditVillageDialogProps {
  village: Village;
  onVillageUpdated?: () => void;
}

export const EditVillageDialog = ({ village, onVillageUpdated }: EditVillageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  
  const [name, setName] = useState(village.name);
  const [description, setDescription] = useState(village.description);
  const [logoUrl, setLogoUrl] = useState(village.logo_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState((village as any).thumbnail_url || "");
  const [walletAddress, setWalletAddress] = useState(village.wallet_address || "");
  const [solanaWalletAddress, setSolanaWalletAddress] = useState(village.solana_wallet_address || "");
  const [websiteUrl, setWebsiteUrl] = useState(village.website_url || "");
  const [telegramUrl, setTelegramUrl] = useState(village.telegram_url || "");
  const [twitterUrl, setTwitterUrl] = useState(village.twitter_url || "");
  const [instagramUrl, setInstagramUrl] = useState(village.instagram_url || "");
  const [applyUrl, setApplyUrl] = useState((village as any).apply_url || "");
  
  // Location fields
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [location, setLocation] = useState(village.location);
  const [center, setCenter] = useState<[number, number]>(village.center);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(village.name);
      setDescription(village.description);
      setLogoUrl(village.logo_url || "");
      setThumbnailUrl((village as any).thumbnail_url || "");
      setWalletAddress(village.wallet_address || "");
      setSolanaWalletAddress(village.solana_wallet_address || "");
      setWebsiteUrl(village.website_url || "");
      setTelegramUrl(village.telegram_url || "");
      setTwitterUrl(village.twitter_url || "");
      setInstagramUrl(village.instagram_url || "");
      setApplyUrl((village as any).apply_url || "");
      setGoogleMapsUrl("");
      setLocation(village.location);
      setCenter(village.center);
    }
  }, [open, village]);

  const handleThumbnailUpload = async (file: File) => {
    setIsUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${village.id}-thumbnail-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('village-thumbnails')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('village-thumbnails')
        .getPublicUrl(fileName);

      setThumbnailUrl(publicUrl);
      toast.success("Thumbnail uploaded!");
    } catch (err) {
      console.error("Error uploading thumbnail:", err);
      toast.error("Failed to upload thumbnail");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleResolveLocation = async () => {
    if (!googleMapsUrl.trim()) {
      toast.error("Please enter a Google Maps URL");
      return;
    }

    setIsResolvingLocation(true);

    try {
      const { data, error } = await supabase.functions.invoke('resolve-google-maps', {
        body: { url: googleMapsUrl.trim() },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to resolve location');
      }

      const placeData = data.data;
      
      if (placeData.coordinates) {
        setCenter(placeData.coordinates as [number, number]);
      }
      
      if (placeData.name) {
        setLocation(placeData.name);
      }

      toast.success("Location updated! Don't forget to save.");
    } catch (err) {
      console.error("Error resolving location:", err);
      toast.error(err instanceof Error ? err.message : "Failed to resolve location");
    } finally {
      setIsResolvingLocation(false);
    }
  };

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
          thumbnail_url: thumbnailUrl || null,
          wallet_address: walletAddress.trim() || null,
          solana_wallet_address: solanaWalletAddress.trim() || null,
          website_url: websiteUrl.trim() || null,
          telegram_url: telegramUrl || null,
          twitter_url: twitterUrl || null,
          instagram_url: instagramUrl || null,
          apply_url: applyUrl.trim() || null,
          location: location.trim(),
          center: center,
        } as any)
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
            Update village details and manage hosts
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="hosts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Hosts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Location Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="location">Current Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Location name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {center[1].toFixed(4)}, {center[0].toFixed(4)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="google-maps">Update from Google Maps</Label>
                    <div className="flex gap-2">
                      <Input
                        id="google-maps"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        placeholder="Paste Google Maps URL..."
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={handleResolveLocation}
                        disabled={isResolvingLocation || !googleMapsUrl.trim()}
                      >
                        {isResolvingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Update"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste a Google Maps link to update location and coordinates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Treasury Wallets</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="wallet">Ethereum Wallet</Label>
                    <Input
                      id="wallet"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x... or yourname.eth"
                    />
                    <p className="text-xs text-muted-foreground">
                      ENS names and hex addresses are supported.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="solana-wallet">Solana Wallet</Label>
                    <Input
                      id="solana-wallet"
                      value={solanaWalletAddress}
                      onChange={(e) => setSolanaWalletAddress(e.target.value)}
                      placeholder="Solana address (e.g., 6J4n...)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for Solana treasury tracking and donations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Links</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="apply">Apply URL</Label>
                    <Input
                      id="apply"
                      value={applyUrl}
                      onChange={(e) => setApplyUrl(e.target.value)}
                      placeholder="https://forms.google.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Link for the "Apply" button in Residents tab.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourvillage.com"
                    />
                  </div>
                  
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
          </TabsContent>

          <TabsContent value="branding" className="mt-4 space-y-6">
            <div className="space-y-3">
              <Label>Village Logo</Label>
              <p className="text-xs text-muted-foreground">
                Square image shown on the map and header. Works best at 256×256 or larger.
              </p>
              <ImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                placeholder="Upload or enter logo URL"
                aspectRatio={1}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Link Preview Thumbnail</Label>
              <p className="text-xs text-muted-foreground">
                Image shown when sharing village links on Telegram, Twitter, etc. Recommended: 1200×630px.
              </p>
              {thumbnailUrl && (
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img 
                    src={thumbnailUrl} 
                    alt="Thumbnail preview" 
                    className="w-full h-auto max-h-40 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setThumbnailUrl("")}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                  }}
                  disabled={isUploadingThumbnail}
                  className="flex-1"
                />
                {isUploadingThumbnail && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || isUploadingThumbnail}>
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
          </TabsContent>
          
          <TabsContent value="hosts" className="mt-4">
            <CoHostManager 
              villageId={village.id} 
              villageOwnerId={(village as any).created_by}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

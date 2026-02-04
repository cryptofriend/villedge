import { useState, useEffect } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Settings, Users, MapPin, Image, ClipboardList, Bot, FileText } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { useVillages, Village } from "@/hooks/useVillages";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CoHostManager } from "@/components/villages/CoHostManager";
import { ApplicationFormManager } from "@/components/villages/ApplicationFormManager";
import { ApplicationsManager } from "@/components/villages/ApplicationsManager";
import { VillageBotManager } from "@/components/villages/VillageBotManager";

const EditVillage = () => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const navigate = useNavigate();
  const { villages, loading: villagesLoading, refetch: refetchVillages } = useVillages();
  const { isHost, loading: permissionsLoading } = usePermissions();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  // Find the village
  const village = villages.find((v) => v.id === villageSlug);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [solanaWalletAddress, setSolanaWalletAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [location, setLocation] = useState("");
  const [center, setCenter] = useState<[number, number]>([0, 0]);

  // Initialize form when village loads
  useEffect(() => {
    if (village) {
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
      setLocation(village.location);
      setCenter(village.center);
    }
  }, [village]);

  const loading = villagesLoading || permissionsLoading || adminLoading || authLoading;

  // Show loading state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={`/${villageSlug}`} replace />;
  }

  // Check if village exists
  if (!village) {
    return <Navigate to="/" replace />;
  }

  // Check permissions: must be host or admin
  const hasAccess = isHost(village.id) || isAdmin;
  if (!hasAccess) {
    return <Navigate to={`/${villageSlug}`} replace />;
  }

  const handleThumbnailUpload = async (file: File) => {
    setIsUploadingThumbnail(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${village.id}-thumbnail-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("village-thumbnails")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("village-thumbnails").getPublicUrl(fileName);

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
      const { data, error } = await supabase.functions.invoke("resolve-google-maps", {
        body: { url: googleMapsUrl.trim() },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to resolve location");
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
      await refetchVillages();
      navigate(`/${villageSlug}`);
    } catch (err) {
      console.error("Error updating village:", err);
      toast.error("Failed to update village");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl py-6 px-4 sm:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate(`/${villageSlug}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {village.logo_url && (
              <img
                src={village.logo_url}
                alt={village.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="font-display text-xl font-semibold">Edit Village</h1>
              <p className="text-sm text-muted-foreground">{village.name}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Village Settings</CardTitle>
            <CardDescription>
              Update village details, branding, and manage hosts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                </TabsTrigger>
                <TabsTrigger value="branding" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Branding</span>
                </TabsTrigger>
                <TabsTrigger value="application" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Form</span>
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Applications</span>
                </TabsTrigger>
                <TabsTrigger value="bot" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">TG Bot</span>
                </TabsTrigger>
                <TabsTrigger value="hosts" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Hosts</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>
                    <div className="space-y-4">
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

                  {/* Treasury Wallets */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-sm mb-4">Treasury Wallets</h4>
                    <div className="space-y-4">
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

                  {/* Links */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-sm mb-4">Links</h4>
                    <div className="space-y-4">
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

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/${villageSlug}`)}
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

              <TabsContent value="branding" className="space-y-6">
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

                <div className="space-y-3 border-t pt-6">
                  <Label>Link Preview Thumbnail</Label>
                  <p className="text-xs text-muted-foreground">
                    Image shown when sharing village links on Telegram, Twitter, etc. Recommended:
                    1200×630px.
                  </p>
                  {thumbnailUrl && (
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-auto max-h-48 object-cover"
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

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/${villageSlug}`)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isUploadingThumbnail}
                  >
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

              <TabsContent value="application">
                <ApplicationFormManager villageId={village.id} />
              </TabsContent>

              <TabsContent value="applications">
                <ApplicationsManager villageId={village.id} />
              </TabsContent>

              <TabsContent value="bot">
                <VillageBotManager 
                  villageId={village.id} 
                  villageName={village.name}
                  logoUrl={village.logo_url || undefined}
                  botTokenSecretName={(village as any).bot_token_secret_name}
                />
              </TabsContent>

              <TabsContent value="hosts">
                <CoHostManager villageId={village.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default EditVillage;

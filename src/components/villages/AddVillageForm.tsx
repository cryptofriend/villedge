import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, MapPin, Loader2, Globe, Link2, Calendar, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { VillageType } from "@/hooks/useVillages";
import { cn } from "@/lib/utils";

interface WebsiteMetadata {
  title?: string;
  description?: string;
  favicon_url?: string;
  thumbnail_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  telegram_url?: string;
  start_date?: string;
  end_date?: string;
  dates_text?: string;
}

interface AddVillageFormProps {
  onVillageAdded?: () => void;
}

export const AddVillageForm = ({ onVillageAdded }: AddVillageFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [websiteMetadata, setWebsiteMetadata] = useState<WebsiteMetadata | null>(null);

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
        toast.success("Location found!");
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

  const handleGoogleMapsUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setGoogleMapsUrl(url);
    
    // Auto-resolve when a Google Maps URL is pasted
    if (url.includes('google.com/maps') || url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps') || url.includes('map.kakao.com') || url.includes('map.kakao.co')) {
      resolveGoogleMapsUrl(url);
    }
  };

  const scrapeWebsiteMetadata = async (url: string) => {
    if (!url.trim()) return;
    
    setIsScrapingWebsite(true);
    setWebsiteMetadata(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-project-metadata', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.success && data.data) {
        const metadata = data.data as WebsiteMetadata;
        setWebsiteMetadata(metadata);
        toast.success("Website info extracted!");
      } else {
        toast.error(data.error || "Could not extract website info");
      }
    } catch (err) {
      console.error("Error scraping website:", err);
      toast.error("Failed to fetch website info");
    } finally {
      setIsScrapingWebsite(false);
    }
  };

  const handleWebsiteUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setWebsiteUrl(url);
  };

  const handleWebsiteUrlBlur = () => {
    if (websiteUrl.trim() && !isScrapingWebsite) {
      scrapeWebsiteMetadata(websiteUrl);
    }
  };

  // Derive village name from metadata
  const getVillageName = (): string => {
    if (!websiteMetadata?.title) return "";
    // Clean up title (remove common suffixes)
    return websiteMetadata.title
      .replace(/\s*[-|–—]\s*(Home|Official|Website|Site).*$/i, '')
      .replace(/\s*\|\s*.*$/, '')
      .trim();
  };

  // Derive village type based on dates
  const getVillageType = (): VillageType => {
    if (websiteMetadata?.start_date && websiteMetadata?.end_date) {
      return "popup";
    }
    return "permanent";
  };

  // Format dates for display
  const getFormattedDates = (): string => {
    if (websiteMetadata?.start_date && websiteMetadata?.end_date) {
      try {
        const start = parseISO(websiteMetadata.start_date);
        const end = parseISO(websiteMetadata.end_date);
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      } catch {
        return websiteMetadata.dates_text || "Dates found";
      }
    }
    return "Permanent";
  };

  const canSubmit = coordinates && websiteMetadata?.title;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to create a village", {
        action: {
          label: "Sign In",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }

    if (!coordinates) {
      toast.error("Please paste a valid Google Maps link");
      return;
    }

    if (!websiteMetadata?.title) {
      toast.error("Please paste a village website to extract info");
      return;
    }

    setIsSubmitting(true);

    const villageName = getVillageName();
    const villageType = getVillageType();
    const slug = villageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dates = getFormattedDates();

    // Format website URL
    let formattedWebsiteUrl = websiteUrl.trim();
    if (formattedWebsiteUrl && !formattedWebsiteUrl.startsWith('http')) {
      formattedWebsiteUrl = `https://${formattedWebsiteUrl}`;
    }

    const { error } = await supabase.from('villages').insert({
      id: slug,
      name: villageName,
      location: locationName || "Location",
      center: coordinates,
      dates,
      description: websiteMetadata?.description || `Welcome to ${villageName}`,
      created_by: user.id,
      village_type: villageType,
      website_url: formattedWebsiteUrl || null,
      logo_url: websiteMetadata?.favicon_url || null,
      thumbnail_url: websiteMetadata?.thumbnail_url || null,
      twitter_url: websiteMetadata?.twitter_url || null,
      instagram_url: websiteMetadata?.instagram_url || null,
      telegram_url: websiteMetadata?.telegram_url || null,
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

    toast.success(`${villageName} created successfully!`);
    
    // Reset form
    setGoogleMapsUrl("");
    setWebsiteUrl("");
    setLocationName("");
    setCoordinates(null);
    setWebsiteMetadata(null);
    setOpen(false);
    
    onVillageAdded?.();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !user) {
      toast.error("Please sign in to create a village", {
        action: {
          label: "Sign In",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }
    setOpen(newOpen);
  };

  const hasSocials = websiteMetadata?.twitter_url || websiteMetadata?.instagram_url || websiteMetadata?.telegram_url;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Village</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Website URL field */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Village Website
            </Label>
            <div className="relative">
              <Input
                id="websiteUrl"
                placeholder="Paste website link..."
                value={websiteUrl}
                onChange={handleWebsiteUrlChange}
                onBlur={handleWebsiteUrlBlur}
                disabled={isScrapingWebsite}
                className="pr-10"
              />
              {isScrapingWebsite && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {websiteMetadata && !isScrapingWebsite && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
            
            {/* Extracted info preview */}
            {websiteMetadata && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {websiteMetadata.favicon_url && (
                    <img 
                      src={websiteMetadata.favicon_url} 
                      alt="" 
                      className="h-5 w-5 rounded-sm"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <span className="font-medium truncate">
                    {getVillageName() || "Village name"}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                    getVillageType() === "popup" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Calendar className="h-3 w-3" />
                    {getFormattedDates()}
                  </span>
                  
                  {hasSocials && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      Socials found
                    </span>
                  )}
                </div>
                
                {websiteMetadata.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {websiteMetadata.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Google Maps URL field */}
          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Location
            </Label>
            <div className="relative">
              <Input
                id="googleMapsUrl"
                placeholder="Paste Google Maps or Kakao Maps link..."
                value={googleMapsUrl}
                onChange={handleGoogleMapsUrlChange}
                disabled={isResolving}
                className="pr-10"
              />
              {isResolving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {coordinates && !isResolving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
            {coordinates && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {locationName || `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`}
              </p>
            )}
          </div>

          {/* Validation message */}
          {!canSubmit && (websiteUrl || googleMapsUrl) && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {!coordinates && !websiteMetadata?.title 
                  ? "Paste both links to auto-fill village details"
                  : !coordinates 
                    ? "Paste a Google Maps link for location"
                    : "Paste a website to extract village info"}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="sage" 
              className="flex-1" 
              disabled={isSubmitting || isResolving || isScrapingWebsite || !canSubmit}
            >
              {isSubmitting ? "Creating..." : "Create Village"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

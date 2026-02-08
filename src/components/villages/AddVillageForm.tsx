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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, MapPin, CalendarIcon, Loader2, Calendar as CalendarFull, Building2, Globe, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { VillageType } from "@/hooks/useVillages";

interface WebsiteMetadata {
  title?: string;
  description?: string;
  favicon_url?: string;
  thumbnail_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  telegram_url?: string;
}

interface AddVillageFormProps {
  onVillageAdded?: () => void;
}

export const AddVillageForm = ({ onVillageAdded }: AddVillageFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [villageType, setVillageType] = useState<VillageType>("popup");
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
        
        // Auto-fill name if empty
        if (metadata.title && !name) {
          // Clean up title (remove common suffixes)
          const cleanTitle = metadata.title
            .replace(/\s*[-|–—]\s*(Home|Official|Website|Site).*$/i, '')
            .replace(/\s*\|\s*.*$/, '')
            .trim();
          setName(cleanTitle);
        }
        
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

    if (!name.trim()) {
      toast.error("Please enter a village name");
      return;
    }

    if (!coordinates) {
      toast.error("Please paste a valid Google Maps link");
      return;
    }

    // Only validate dates for popup villages
    if (villageType === "popup") {
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates");
        return;
      }

      if (endDate < startDate) {
        toast.error("End date must be after start date");
        return;
      }
    }

    setIsSubmitting(true);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dates = villageType === "popup" && startDate && endDate
      ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
      : "Permanent";

    // Format website URL
    let formattedWebsiteUrl = websiteUrl.trim();
    if (formattedWebsiteUrl && !formattedWebsiteUrl.startsWith('http')) {
      formattedWebsiteUrl = `https://${formattedWebsiteUrl}`;
    }

    const { error } = await supabase.from('villages').insert({
      id: slug,
      name: name.trim(),
      location: locationName || "Location",
      center: coordinates,
      dates,
      description: websiteMetadata?.description || `Welcome to ${name.trim()}`,
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

    toast.success(`${name} created successfully!`);
    
    // Reset form
    setName("");
    setGoogleMapsUrl("");
    setWebsiteUrl("");
    setLocationName("");
    setCoordinates(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setVillageType("popup");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          {/* Village Type Toggle */}
          <div className="space-y-2">
            <Label>Village Type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={villageType === "popup" ? "default" : "outline"}
                size="sm"
                onClick={() => setVillageType("popup")}
                className="flex-1 gap-2"
              >
                <CalendarFull className="h-4 w-4" />
                Popup
              </Button>
              <Button
                type="button"
                variant={villageType === "permanent" ? "default" : "outline"}
                size="sm"
                onClick={() => setVillageType("permanent")}
                className="flex-1 gap-2"
              >
                <Building2 className="h-4 w-4" />
                Permanent
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {villageType === "popup" 
                ? "Temporary village with specific dates" 
                : "Ongoing community without fixed dates"}
            </p>
          </div>

          {/* Website URL field */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website (optional)</Label>
            <div className="relative">
              <Input
                id="websiteUrl"
                placeholder="https://yourvillage.com"
                value={websiteUrl}
                onChange={handleWebsiteUrlChange}
                onBlur={handleWebsiteUrlBlur}
                disabled={isScrapingWebsite}
              />
              {isScrapingWebsite && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {websiteMetadata && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {websiteMetadata.favicon_url && (
                  <img 
                    src={websiteMetadata.favicon_url} 
                    alt="" 
                    className="h-4 w-4 rounded-sm"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <span className="truncate">
                  {websiteMetadata.title || "Website info extracted"}
                </span>
                {(websiteMetadata.twitter_url || websiteMetadata.instagram_url || websiteMetadata.telegram_url) && (
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    socials found
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              We'll auto-extract name, logo, and social links
            </p>
          </div>

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

          {/* Conditionally show dates only for popup villages */}
          {villageType === "popup" && (
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
                      className={cn("p-3 pointer-events-auto")}
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
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

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
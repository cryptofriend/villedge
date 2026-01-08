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
import { Plus, Loader2, Calendar, MapPin, User, Crosshair, X } from "lucide-react";
import { toast } from "sonner";
import { EventInput } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";

interface LumaEventData {
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  imageUrl?: string;
  hostName?: string;
  hostAvatar?: string;
  lumaUrl?: string;
}

interface AddEventFormProps {
  onAddEvent: (event: EventInput) => Promise<unknown>;
  villageId?: string;
  onRequestMapPin?: () => void;
  pendingCoordinates?: [number, number] | null;
  onClearCoordinates?: () => void;
}

export const AddEventForm = ({ 
  onAddEvent, 
  villageId, 
  onRequestMapPin, 
  pendingCoordinates, 
  onClearCoordinates 
}: AddEventFormProps) => {
  const [open, setOpen] = useState(false);
  const [lumaUrl, setLumaUrl] = useState("");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [eventData, setEventData] = useState<LumaEventData | null>(null);

  const resolveLumaUrl = async (url: string) => {
    if (!url.trim()) return;

    setIsResolving(true);
    setEventData(null);

    try {
      const { data, error } = await supabase.functions.invoke("resolve-luma", {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.success && data.data) {
        const event = data.data as LumaEventData;
        setEventData(event);

        if (event.name && !name) {
          setName(event.name);
        }
        if (event.location && !location) {
          setLocation(event.location);
        }
        if (event.startTime && !startTime) {
          // Convert ISO to datetime-local format
          const date = new Date(event.startTime);
          if (!isNaN(date.getTime())) {
            setStartTime(date.toISOString().slice(0, 16));
          }
        }
        if (event.endTime && !endTime) {
          const date = new Date(event.endTime);
          if (!isNaN(date.getTime())) {
            setEndTime(date.toISOString().slice(0, 16));
          }
        }

        toast.success("Event data extracted successfully!");
      } else {
        toast.error(data.error || "Could not extract event data from URL");
      }
    } catch (err) {
      console.error("Error resolving URL:", err);
      toast.error("Failed to resolve Luma URL");
    } finally {
      setIsResolving(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLumaUrl(url);

    // Auto-resolve when a Luma URL is pasted
    if (url.includes("luma.com/") || url.includes("lu.ma/")) {
      resolveLumaUrl(url);
    }
  };

  const handleSetPin = () => {
    if (onRequestMapPin) {
      onRequestMapPin();
      setOpen(false);
      toast.info("Click on the map to set the event location");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter an event name");
      return;
    }

    if (!startTime) {
      toast.error("Please enter a start time");
      return;
    }

    setIsSubmitting(true);

    const newEvent: EventInput = {
      name: name.trim(),
      description: eventData?.description || undefined,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : undefined,
      location: location.trim() || undefined,
      coordinates: pendingCoordinates || undefined,
      image_url: eventData?.imageUrl || undefined,
      luma_url: eventData?.lumaUrl || lumaUrl.trim() || undefined,
      host_name: eventData?.hostName || undefined,
      host_avatar: eventData?.hostAvatar || undefined,
      village_id: villageId,
    };

    const result = await onAddEvent(newEvent);
    setIsSubmitting(false);

    if (result) {
      toast.success(`${name} added!`);

      // Reset form
      setName("");
      setLumaUrl("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setEventData(null);
      onClearCoordinates?.();
      setOpen(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Clear coordinates when closing dialog without submitting
      onClearCoordinates?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="sage" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add New Event
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lumaUrl">Luma Event Link</Label>
            <div className="relative">
              <Input
                id="lumaUrl"
                placeholder="Paste Luma event link..."
                value={lumaUrl}
                onChange={handleUrlChange}
                disabled={isResolving}
              />
              {isResolving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a Luma link (lu.ma or luma.com) to auto-fill event details
            </p>
          </div>

          {eventData && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              {eventData.imageUrl && (
                <img
                  src={eventData.imageUrl}
                  alt="Event cover"
                  className="w-full h-32 object-cover rounded-md"
                />
              )}
              {eventData.hostName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Hosted by {eventData.hostName}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <div className="relative">
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-9"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <Input
                id="location"
                placeholder="e.g., Beach Cafe"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Map Pin</Label>
            {pendingCoordinates ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-sage-100 border border-sage-200">
                <Crosshair className="h-4 w-4 text-sage-600" />
                <span className="text-sm text-sage-700 flex-1">
                  {pendingCoordinates[1].toFixed(5)}, {pendingCoordinates[0].toFixed(5)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onClearCoordinates}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleSetPin}
              >
                <Crosshair className="h-4 w-4" />
                Set Pin on Map
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Click to place a marker on the map for this event
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="sage"
              className="flex-1"
              disabled={isSubmitting || isResolving}
            >
              {isSubmitting ? "Adding..." : "Add Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
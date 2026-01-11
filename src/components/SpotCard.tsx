import { useState, useEffect } from "react";
import { Spot, categoryColors } from "@/data/spots";
import { SpotUpdate } from "@/hooks/useSpots";
import { useComments } from "@/hooks/useComments";
import { X, Trash2, Pencil, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { EditSpotDialog } from "./EditSpotDialog";
import { SpotComments } from "./SpotComments";

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (
  coord1: [number, number],
  coord2: [number, number]
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  
  const dLat = toRad(coord2[1] - coord1[1]);
  const dLon = toRad(coord2[0] - coord1[0]);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1[1])) * Math.cos(toRad(coord2[1])) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

interface SpotCardProps {
  spot: Spot & { google_maps_url?: string | null };
  onClose: () => void;
  onDelete?: (spotId: string) => Promise<boolean>;
  onUpdate?: (spotId: string, updates: SpotUpdate) => Promise<any>;
  userLocation?: [number, number] | null;
}

export const SpotCard = ({ spot, onClose, onDelete, onUpdate, userLocation }: SpotCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { comments, loading: commentsLoading, addComment } = useComments(spot.id);
  
  const distance = userLocation
    ? calculateDistance(userLocation, spot.coordinates)
    : null;

  const handleDelete = async () => {
    if (!onDelete) return;
    const success = await onDelete(spot.id);
    if (success) {
      toast.success("Spot deleted");
      onClose();
    }
  };

  return (
    <>
      <div className="animate-fade-in-up w-[320px] overflow-hidden rounded-lg bg-card shadow-elevated">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-muted">
          {spot.image ? (
            <img
              src={spot.image}
              alt={spot.name}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <MapPin className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="gradient-overlay absolute inset-0" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Edit button */}
          {onUpdate && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="absolute right-3 top-14 flex h-8 w-8 items-center justify-center rounded-full bg-primary/90 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-primary"
              aria-label="Edit spot"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="absolute right-3 top-[6.5rem] flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground backdrop-blur-sm transition-colors hover:bg-destructive"
              aria-label="Delete spot"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Category badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div
              className="rounded-full px-3 py-1 text-xs font-medium text-primary-foreground"
              style={{ backgroundColor: categoryColors[spot.category] }}
            >
              {spot.category.charAt(0).toUpperCase() + spot.category.slice(1)}
            </div>
            {distance !== null && (
              <div className="flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                <Navigation className="h-3 w-3" />
                {formatDistance(distance)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            {spot.name}
          </h3>
          <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
            {spot.description}
          </p>

          {/* Tags */}
          {spot.tags && spot.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {spot.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <SpotComments
          spotId={spot.id}
          comments={comments}
          loading={commentsLoading}
          onAddComment={addComment}
          googleMapsUrl={spot.google_maps_url}
        />
      </div>

      {onUpdate && (
        <EditSpotDialog
          key={spot.id}
          spot={spot}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

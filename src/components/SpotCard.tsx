import { Spot, categoryColors } from "@/data/spots";
import { X } from "lucide-react";

interface SpotCardProps {
  spot: Spot;
  onClose: () => void;
}

export const SpotCard = ({ spot, onClose }: SpotCardProps) => {
  return (
    <div className="animate-fade-in-up w-[320px] overflow-hidden rounded-lg bg-card shadow-elevated">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={spot.image}
          alt={spot.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="gradient-overlay absolute inset-0" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Category badge */}
        <div
          className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-medium text-primary-foreground"
          style={{ backgroundColor: categoryColors[spot.category] }}
        >
          {spot.category.charAt(0).toUpperCase() + spot.category.slice(1)}
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
    </div>
  );
};

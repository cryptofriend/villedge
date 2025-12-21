import { Spot, categoryColors, categoryLabels } from "@/data/spots";
import { cn } from "@/lib/utils";

interface SpotMarkerProps {
  spot: Spot;
  isSelected: boolean;
  onClick: () => void;
}

export const SpotMarker = ({ spot, isSelected, onClick }: SpotMarkerProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-center transition-all duration-300",
        isSelected && "z-10"
      )}
      aria-label={`View ${spot.name}`}
    >
      {/* Pulse ring for selected state */}
      {isSelected && (
        <div
          className="absolute h-12 w-12 animate-pulse-gentle rounded-full opacity-40"
          style={{ backgroundColor: categoryColors[spot.category] }}
        />
      )}

      {/* Main marker */}
      <div
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-background shadow-card transition-all duration-300",
          isSelected ? "h-10 w-10" : "group-hover:scale-110"
        )}
        style={{ backgroundColor: categoryColors[spot.category] }}
      >
        <MarkerIcon category={spot.category} />
      </div>

      {/* Label on hover or selected */}
      <div
        className={cn(
          "absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card px-2 py-1 text-xs font-medium text-foreground shadow-soft transition-all duration-200",
          isSelected
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        )}
      >
        {spot.name}
      </div>
    </button>
  );
};

const MarkerIcon = ({ category }: { category: Spot["category"] }) => {
  const iconClass = "h-4 w-4 text-primary-foreground";

  switch (category) {
    case "accommodation":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "food":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      );
    case "activity":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      );
    case "work":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    default:
      return null;
  }
};

export const CategoryLegend = ({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: Spot["category"] | null;
  onSelectCategory: (category: Spot["category"] | null) => void;
}) => {
  const categories: Spot["category"][] = [
    "accommodation",
    "food",
    "activity",
    "work",
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() =>
            onSelectCategory(selectedCategory === category ? null : category)
          }
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200",
            selectedCategory === category
              ? "border-transparent text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-secondary"
          )}
          style={
            selectedCategory === category
              ? { backgroundColor: categoryColors[category] }
              : undefined
          }
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: categoryColors[category] }}
          />
          {categoryLabels[category]}
        </button>
      ))}
    </div>
  );
};

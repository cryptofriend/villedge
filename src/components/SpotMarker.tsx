import { useState } from "react";
import { Spot, categoryColors, categoryLabels } from "@/data/spots";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  availableTags = [],
  selectedTags = [],
  onSelectTags,
}: {
  selectedCategory: Spot["category"] | null;
  onSelectCategory: (category: Spot["category"] | null) => void;
  availableTags?: string[];
  selectedTags?: string[];
  onSelectTags?: (tags: string[]) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const categories: Spot["category"][] = [
    "accommodation",
    "food",
    "activity",
    "work",
  ];

  // When a specific category is selected, show only that button (collapsed state)
  const showingSelectedOnly = selectedCategory !== null && !isExpanded;

  const handleTagClick = (tag: string) => {
    if (!onSelectTags) return;
    if (selectedTags.includes(tag)) {
      onSelectTags(selectedTags.filter((t) => t !== tag));
    } else {
      onSelectTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* All button - always visible when no category selected or expanded */}
      {(selectedCategory === null || isExpanded) && (
        <button
          onClick={() => {
            if (selectedCategory === null) {
              setIsExpanded(!isExpanded);
            } else {
              onSelectCategory(null);
              setIsExpanded(false);
            }
          }}
          className={cn(
            "flex w-fit items-center gap-2 rounded-full border text-sm transition-all duration-200",
            selectedCategory === null
              ? "border-foreground bg-foreground text-background font-semibold"
              : "border-border bg-card text-foreground hover:bg-secondary font-medium"
          )}
          style={{ padding: "10px 8px" }}
        >
          {selectedCategory === null ? (
            isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : null}
          All
        </button>
      )}

      {/* Category buttons - show when expanded OR showing selected only */}
      {(isExpanded || showingSelectedOnly) &&
        categories.map((category) => {
          // When showing selected only, only render the selected category
          if (showingSelectedOnly && selectedCategory !== category) return null;

          const isSelected = selectedCategory === category;
          const borderColor = categoryColors[category];

          return (
            <button
              key={category}
              onClick={() => {
                if (isSelected) {
                  // Clicking selected category expands to show all options
                  setIsExpanded(true);
                } else {
                  onSelectCategory(category);
                  setIsExpanded(false);
                }
              }}
              className={cn(
                "flex w-fit items-center gap-2 rounded-full border text-sm transition-all duration-200",
                isSelected ? "font-semibold" : "font-medium"
              )}
              style={{
                padding: "10px 8px",
                borderColor: borderColor,
                backgroundColor: isSelected
                  ? `${borderColor}80`
                  : "hsl(var(--card))",
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: categoryColors[category] }}
              />
              {categoryLabels[category]}
            </button>
          );
        })}

      {/* Tags section - always visible below categories */}
      {availableTags.length > 0 && onSelectTags && (
        <div className="flex flex-wrap gap-1.5 max-w-[180px] mt-1">
          {availableTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={cn(
                  "px-2 py-1 text-xs rounded-full border transition-all duration-200",
                  isSelected
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "bg-card text-foreground border-border hover:bg-secondary"
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

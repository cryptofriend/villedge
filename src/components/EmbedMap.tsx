import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { categoryColors } from "@/data/spots";
import { useSpots, DbSpot } from "@/hooks/useSpots";
import { Loader2, MapPin, ExternalLink, X } from "lucide-react";

const MAP_CENTER: [number, number] = [108.1885, 10.9355];

interface EmbedMapProps {
  mapboxToken: string;
}

export const EmbedMap = ({ mapboxToken }: EmbedMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const { spots, loading } = useSpots();
  const [selectedSpot, setSelectedSpot] = useState<DbSpot | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DbSpot["category"] | null>(null);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: MAP_CENTER,
      zoom: 14,
      pitch: 0,
      attributionControl: false,
      scrollZoom: true,
      doubleClickZoom: true,
    });

    map.current = m;

    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      m.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Add markers
  useEffect(() => {
    if (!map.current) return;

    const addMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const filteredSpots = selectedCategory
        ? spots.filter((s) => s.category === selectedCategory)
        : spots;

      filteredSpots.forEach((spot) => {
        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 28px;
            height: 28px;
            background-color: ${categoryColors[spot.category]};
            border: 2px solid #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              ${getIconPath(spot.category)}
            </svg>
          </div>
        `;

        el.addEventListener("mouseenter", () => {
          const container = el.firstElementChild as HTMLElement;
          if (container) container.style.transform = "scale(1.2)";
        });

        el.addEventListener("mouseleave", () => {
          const container = el.firstElementChild as HTMLElement;
          if (container) container.style.transform = "scale(1)";
        });

        el.addEventListener("click", () => {
          setSelectedSpot(spot);
          map.current?.flyTo({
            center: spot.coordinates,
            zoom: 15,
            duration: 500,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(spot.coordinates)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    };

    const m = map.current;
    if (m.isStyleLoaded()) {
      addMarkers();
    } else {
      m.on("load", addMarkers);
    }

    return () => {
      m.off("load", addMarkers);
    };
  }, [spots, selectedCategory]);

  const categories: DbSpot["category"][] = ["accommodation", "food", "activity", "work", "atm", "shopping"];
  const categoryLabels: Record<DbSpot["category"], string> = {
    accommodation: "Stay",
    food: "Eat",
    activity: "Do",
    work: "Work",
    atm: "ATMs",
    shopping: "Shop",
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Compact header */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-background/95 to-transparent p-3 pb-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-base font-semibold text-foreground">
            Villedge Is
          </h1>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Full Map
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Category pills */}
        <div className="mt-2 flex gap-1.5">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                setSelectedCategory(selectedCategory === category ? null : category)
              }
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all ${
                selectedCategory === category
                  ? "text-primary-foreground"
                  : "bg-card/90 text-foreground hover:bg-card"
              }`}
              style={
                selectedCategory === category
                  ? { backgroundColor: categoryColors[category] }
                  : undefined
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: categoryColors[category] }}
              />
              {categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Selected spot popup */}
      {selectedSpot && (
        <div className="absolute bottom-3 left-3 right-3 z-20 animate-fade-in-up">
          <div className="flex gap-3 rounded-lg bg-card p-3 shadow-elevated">
            {/* Image */}
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {selectedSpot.image_url ? (
                <img
                  src={selectedSpot.image_url}
                  alt={selectedSpot.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-display text-sm font-semibold text-foreground">
                  {selectedSpot.name}
                </h3>
                <button
                  onClick={() => setSelectedSpot(null)}
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {selectedSpot.description}
              </p>
              {selectedSpot.google_maps_url && (
                <a
                  href={selectedSpot.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Directions
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getIconPath = (category: DbSpot["category"]) => {
  switch (category) {
    case "accommodation":
      return '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
    case "food":
      return '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>';
    case "activity":
      return '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>';
    case "work":
      return '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>';
    case "atm":
      return '<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="12" y2="16"/>';
    case "shopping":
      return '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>';
    default:
      return "";
  }
};

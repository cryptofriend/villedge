import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { categoryColors } from "@/data/spots";
import { SpotCard } from "./SpotCard";
import { CategoryLegend } from "./SpotMarker";
import { AddSpotForm } from "./AddSpotForm";
import { MapPin, Loader2, Check, X, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { useSpots, DbSpot, SpotInput } from "@/hooks/useSpots";
import { Button } from "@/components/ui/button";

// SeaLinks Golf Club coordinates
const MAP_CENTER: [number, number] = [108.1885, 10.9355];

interface InteractiveMapProps {
  mapboxToken: string;
}

export const InteractiveMap = ({ mapboxToken }: InteractiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const { spots, loading, addSpot, updateSpotCoordinates, deleteSpot, updateSpot } = useSpots();
  const [selectedSpot, setSelectedSpot] = useState<DbSpot | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DbSpot["category"] | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<[number, number] | null>(null);
  const selectionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const spotMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Create/update the draggable selection marker
  useEffect(() => {
    if (!mapReady || !map.current) return;

    const m = map.current;

    if (isSelectingLocation) {
      // Remove existing marker first
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }

      // Create a draggable marker at center of map
      const center = m.getCenter();
      const initialCoords: [number, number] = [center.lng, center.lat];
      setSelectionCoords(initialCoords);

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width: 56px;
          height: 56px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          cursor: grab;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        ">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#c45c3e" stroke="#fff" stroke-width="1">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3" fill="#fff" stroke="#c45c3e"/>
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'bottom' })
        .setLngLat(initialCoords)
        .addTo(m);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setSelectionCoords([lngLat.lng, lngLat.lat]);
      });

      selectionMarkerRef.current = marker;
    } else {
      // Remove selection marker when not selecting
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
      setSelectionCoords(null);
    }
  }, [isSelectingLocation, mapReady]);

  // Cleanup selection marker on unmount
  useEffect(() => {
    return () => {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: MAP_CENTER,
      zoom: 13,
      pitch: 20,
    });

    map.current = m;

    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    // Set mapReady when style is loaded (handles both immediate and async cases)
    if (m.isStyleLoaded()) {
      setMapReady(true);
    } else {
      m.once("load", () => {
        setMapReady(true);
      });
    }

    return () => {
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
      m.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  const addMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    spotMarkersRef.current.clear();

    const filteredSpots = selectedCategory
      ? spots.filter((s) => s.category === selectedCategory)
      : spots;

    filteredSpots.forEach((spot) => {
      // Create custom marker element
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.innerHTML = `
        <div class="marker-container" style="
          width: 36px;
          height: 36px;
          background-color: ${categoryColors[spot.category]};
          border: 3px solid ${isEditMode ? '#c45c3e' : '#faf8f5'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: ${isEditMode ? 'grab' : 'pointer'};
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            ${getIconPath(spot.category)}
          </svg>
        </div>
      `;

      el.addEventListener("mouseenter", () => {
        const container = el.querySelector(".marker-container") as HTMLElement;
        if (container) {
          container.style.transform = "scale(1.15)";
        }
      });

      el.addEventListener("mouseleave", () => {
        const container = el.querySelector(".marker-container") as HTMLElement;
        if (container) {
          container.style.transform = "scale(1)";
        }
      });

      const marker = new mapboxgl.Marker({ element: el, draggable: isEditMode })
        .setLngLat(spot.coordinates)
        .addTo(map.current!);

      // Handle drag end for edit mode
      if (isEditMode) {
        marker.on("dragend", async () => {
          const lngLat = marker.getLngLat();
          const newCoords: [number, number] = [lngLat.lng, lngLat.lat];
          const success = await updateSpotCoordinates(spot.id, newCoords);
          if (success) {
            toast.success(`${spot.name} location updated!`);
          }
        });
      }

      el.addEventListener("click", () => {
        if (!isEditMode) {
          setSelectedSpot(spot);
          map.current?.flyTo({
            center: spot.coordinates,
            zoom: 15,
            duration: 800,
          });
        }
      });

      markersRef.current.push(marker);
      spotMarkersRef.current.set(spot.id, marker);
    });
  };

  useEffect(() => {
    if (!map.current) return;

    const m = map.current;
    const onLoad = () => addMarkers();

    if (m.isStyleLoaded()) {
      addMarkers();
    } else {
      m.on("load", onLoad);
    }

    return () => {
      m.off("load", onLoad);
    };
  }, [selectedCategory, spots, isEditMode]);

  const handleAddSpot = async (spotInput: SpotInput) => {
    const result = await addSpot(spotInput);
    if (result) {
      setPendingCoordinates(null);
    }
    return result;
  };

  const handleSelectLocation = () => {
    setIsSelectingLocation(true);
  };

  const handleConfirmLocation = () => {
    if (selectionCoords) {
      setPendingCoordinates(selectionCoords);
      setIsSelectingLocation(false);
      toast.success("Location confirmed! Complete the form to add the spot.");
    }
  };

  const handleCancelSelection = () => {
    setIsSelectingLocation(false);
  };

  const handleCloseSpot = () => {
    setSelectedSpot(null);
    map.current?.flyTo({
      center: MAP_CENTER,
      zoom: 13,
      duration: 800,
    });
  };


  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      {/* Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-body text-muted-foreground">Loading spots...</p>
          </div>
        </div>
      )}

      {/* Location selection UI */}
      {isSelectingLocation && (
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-lg">
            <p className="font-body text-sm text-foreground">
              Drag the pin to select location
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelSelection}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                variant="sage"
                onClick={handleConfirmLocation}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header overlay */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-background/90 via-background/60 to-transparent p-4 pb-16 md:p-6 md:pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
              Popup Village
            </h1>
            <p className="mt-1 font-body text-sm text-muted-foreground md:text-base">
              Mũi Né, Vietnam · One of the world's great kitesurf spots
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={isEditMode ? "destructive" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) {
                  toast.success("Edit mode disabled");
                } else {
                  toast.info("Edit mode enabled - drag pins to adjust locations");
                }
              }}
            >
              <Edit3 className="h-4 w-4" />
              {isEditMode ? "Done Editing" : "Edit Locations"}
            </Button>
            {!isEditMode && (
              <AddSpotForm
                onAddSpot={handleAddSpot}
                pendingCoordinates={pendingCoordinates}
                onSetCoordinates={setPendingCoordinates}
              />
            )}
            <div className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Jan 15 – Feb 15, 2026
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="mt-4">
          <CategoryLegend
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </div>

      {/* Selected spot card */}
      {selectedSpot && (
        <div className="absolute bottom-4 left-4 z-20 md:bottom-6 md:left-6">
          <SpotCard 
            spot={{
              id: selectedSpot.id,
              name: selectedSpot.name,
              description: selectedSpot.description,
              image: selectedSpot.image_url || "",
              category: selectedSpot.category,
              coordinates: selectedSpot.coordinates,
              tags: selectedSpot.tags || undefined,
              google_maps_url: selectedSpot.google_maps_url,
            }} 
            onClose={handleCloseSpot}
            onDelete={deleteSpot}
            onUpdate={updateSpot}
          />
        </div>
      )}

      {/* Spots list sidebar */}
      <div className="absolute bottom-4 right-4 z-10 hidden max-h-[300px] w-72 overflow-auto rounded-lg bg-card/95 p-3 shadow-card backdrop-blur-sm md:block">
        <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
          Explore Spots
        </h3>
        <div className="flex flex-col gap-2">
          {(selectedCategory
            ? spots.filter((s) => s.category === selectedCategory)
            : spots
          ).map((spot) => (
            <button
              key={spot.id}
              onClick={() => {
                setSelectedSpot(spot);
                map.current?.flyTo({
                  center: spot.coordinates,
                  zoom: 15,
                  duration: 800,
                });
              }}
              className={`flex items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-secondary ${
                selectedSpot?.id === spot.id ? "bg-secondary" : ""
              }`}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: categoryColors[spot.category] }}
              >
                <MapPin className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-medium text-foreground">
                  {spot.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {spot.tags?.slice(0, 2).join(" · ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
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
    default:
      return "";
  }
};

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { categoryColors } from "@/data/spots";
import { SpotCard } from "./SpotCard";
import { CategoryLegend } from "./SpotMarker";
import { AddSpotForm } from "./AddSpotForm";
import { PopupTimeline } from "./PopupTimeline";
import { MapPin, Loader2, Check, X, Edit3, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSpots, DbSpot, SpotInput } from "@/hooks/useSpots";
import { Button } from "@/components/ui/button";
import popupVillageLogo from "@/assets/popup-village-logo.png";
import networkStateLogo from "@/assets/network-state-logo.png";
import edgeCityLogo from "@/assets/edge-city-logo.png";
import marsCollegeLogo from "@/assets/mars-college-logo.webp";
import ipeVillageLogo from "@/assets/ipe-village-logo.webp";
import zuafriqueLogo from "@/assets/zuafrique-logo.webp";

// SeaLinks Golf Club coordinates (Proof of Retreat)
const MAP_CENTER: [number, number] = [108.1885, 10.9355];

// Forest City coordinates (Network State / Network School v2)
const FOREST_CITY_CENTER: [number, number] = [103.5710, 1.4050];

// Healdsburg, CA coordinates (Edge Esmeralda)
const HEALDSBURG_CENTER: [number, number] = [-122.8697, 38.6107];

// Austin, TX coordinates (Edge City Austin)
const AUSTIN_CENTER: [number, number] = [-97.7431, 30.2672];

// Chiang Mai, Thailand coordinates (ETHChiangmai)
const CHIANG_MAI_CENTER: [number, number] = [98.9853, 18.7883];

// California desert coordinates (Mars College)
const BOMBAY_BEACH_CENTER: [number, number] = [-115.7294, 33.3511];

// Santa Catarina, Brazil coordinates (Ipê Village II)
const SANTA_CATARINA_CENTER: [number, number] = [-48.5482, -27.5954];

// Kilifi, Kenya coordinates (ZuAfrique 2.0)
const KILIFI_CENTER: [number, number] = [39.8499, -3.6305];

// Luštica Bay, Montenegro coordinates (Ārc Montenegro)
const LUSTICA_CENTER: [number, number] = [18.6833, 42.3833];

// Define popup villages configuration
interface PopupVillage {
  id: string;
  name: string;
  logo: string;
  center: [number, number];
  dates: string;
  location: string;
  description: string;
  participants?: string;
  focus?: string;
}

const POPUP_VILLAGES: PopupVillage[] = [
  {
    id: "proof-of-retreat",
    name: "Proof of Retreat",
    logo: popupVillageLogo,
    center: MAP_CENTER,
    dates: "Dec 1, 2025 – Apr 1, 2026",
    location: "Mũi Né, Vietnam",
    description: "One of the world's great kitesurf spots",
    participants: "50+ builders",
    focus: "Web3 & Deep Tech",
  },
  {
    id: "network-school-v2",
    name: "Network School v2",
    logo: networkStateLogo,
    center: FOREST_CITY_CENTER,
    dates: "Mar 1, 2025 – Mar 1, 2026",
    location: "Forest City, Malaysia",
    description: "Year-long Web3 community residency",
    participants: "100-500 pioneers",
    focus: "Crypto & Governance",
  },
  {
    id: "ethchiangmai",
    name: "ETHChiangmai",
    logo: networkStateLogo,
    center: CHIANG_MAI_CENTER,
    dates: "Dec 8, 2025 – Mar 2, 2026",
    location: "Chiang Mai, Thailand",
    description: "Web3 Unconference, Bootcamp & Summit",
    participants: "100-500 builders",
    focus: "Crypto & Tech",
  },
  {
    id: "mars-college",
    name: "Mars College",
    logo: marsCollegeLogo,
    center: BOMBAY_BEACH_CENTER,
    dates: "May 1 – Apr 27, 2026",
    location: "California, USA",
    description: "Off-grid solarpunk campus in the desert",
    participants: "25-100 Martians",
    focus: "Tech, Governance & AI",
  },
  {
    id: "arc-montenegro",
    name: "Ārc Montenegro",
    logo: networkStateLogo,
    center: LUSTICA_CENTER,
    dates: "Coming 2026",
    location: "Luštica Bay, Montenegro",
    description: "Straight after EthCC. Two months.",
    participants: "500-2500",
    focus: "Crypto & Governance",
  },
  {
    id: "ipe-village-ii",
    name: "Ipê Village II",
    logo: ipeVillageLogo,
    center: SANTA_CATARINA_CENTER,
    dates: "Apr 6 – May 1, 2026",
    location: "Santa Catarina, Brazil",
    description: "Brazil's first ever pop-up village",
    participants: "100-500 builders",
    focus: "Crypto & Governance",
  },
  {
    id: "zuafrique-2",
    name: "ZuAfrique 2.0",
    logo: zuafriqueLogo,
    center: KILIFI_CENTER,
    dates: "Apr 12 – May 3, 2026",
    location: "Kilifi, Kenya",
    description: "Africa's largest onchain movement",
    participants: "100-500 builders",
    focus: "Crypto & Culture",
  },
  {
    id: "edge-esmeralda",
    name: "Edge Esmeralda",
    logo: edgeCityLogo,
    center: HEALDSBURG_CENTER,
    dates: "May 30 – Jun 27, 2026",
    location: "Healdsburg, CA",
    description: "Prototyping new ways of living",
    participants: "500-2500 innovators",
    focus: "Culture, Science & Tech",
  },
  {
    id: "edge-city-austin",
    name: "Edge City Austin",
    logo: edgeCityLogo,
    center: AUSTIN_CENTER,
    dates: "Mar 2 – 7, 2025",
    location: "Austin, TX",
    description: "Pop-up village during SXSW",
    participants: "100-500 creators",
    focus: "Culture & Technology",
  },
];

interface InteractiveMapProps {
  mapboxToken: string;
}

export const InteractiveMap = ({ mapboxToken }: InteractiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clusterMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const { spots, loading, addSpot, updateSpotCoordinates, deleteSpot, updateSpot } = useSpots();
  const [selectedSpot, setSelectedSpot] = useState<DbSpot | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DbSpot["category"] | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<[number, number] | null>(null);
  const selectionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const isClusteredRef = useRef(false);
  const spotMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [activeVillage, setActiveVillage] = useState<PopupVillage>(POPUP_VILLAGES[0]);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  
  const CLUSTER_ZOOM_THRESHOLD = 12;

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
      zoom: 15,
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

  // Calculate center point of all spots for cluster marker
  const getSpotsCenterPoint = useCallback((): [number, number] => {
    if (spots.length === 0) return MAP_CENTER;
    
    const sumLng = spots.reduce((sum, spot) => sum + spot.coordinates[0], 0);
    const sumLat = spots.reduce((sum, spot) => sum + spot.coordinates[1], 0);
    
    return [sumLng / spots.length, sumLat / spots.length];
  }, [spots]);

  // Create cluster markers for all popup villages
  const createClusterMarkers = useCallback(() => {
    if (!map.current) return;
    
    // Remove existing cluster markers
    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();
    
    POPUP_VILLAGES.forEach((village) => {
      const el = document.createElement("div");
      el.className = "cluster-marker";
      el.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(250, 248, 245, 0.95);
          padding: 8px 16px 8px 8px;
          border-radius: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          <img src="${village.logo}" alt="${village.name}" style="width: 32px; height: 32px; border-radius: 4px;" />
          <span style="
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            color: #3d4a3f;
            white-space: nowrap;
          ">${village.name}</span>
        </div>
      `;
      
      el.addEventListener("mouseenter", () => {
        const container = el.firstChild as HTMLElement;
        if (container) {
          container.style.transform = "scale(1.05)";
        }
      });
      
      el.addEventListener("mouseleave", () => {
        const container = el.firstChild as HTMLElement;
        if (container) {
          container.style.transform = "scale(1)";
        }
      });
      
      el.addEventListener("click", () => {
        setActiveVillage(village);
        map.current?.flyTo({
          center: village.center,
          zoom: 15,
          duration: 800,
        });
      });
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(village.center)
        .addTo(map.current!);
      
      clusterMarkersRef.current.set(village.id, marker);
    });
  }, []);

  // Remove all cluster markers
  const removeClusterMarkers = useCallback(() => {
    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();
  }, []);

  const addMarkers = useCallback(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    spotMarkersRef.current.clear();
    
    // Also remove cluster markers when re-adding markers
    removeClusterMarkers();
    isClusteredRef.current = false;

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
  }, [selectedCategory, spots, isEditMode, updateSpotCoordinates]);

  // Handle zoom-based clustering
  const updateMarkersVisibility = useCallback(() => {
    if (!map.current) return;
    
    const zoom = map.current.getZoom();
    const shouldCluster = zoom < CLUSTER_ZOOM_THRESHOLD;
    
    if (shouldCluster !== isClusteredRef.current) {
      isClusteredRef.current = shouldCluster;
      setIsZoomedIn(!shouldCluster);
      
      if (shouldCluster) {
        // Hide individual markers, show cluster markers
        markersRef.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.display = 'none';
        });
        createClusterMarkers();
      } else {
        // Show individual markers, hide cluster markers
        markersRef.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.display = 'block';
        });
        removeClusterMarkers();
      }
    }
  }, [createClusterMarkers, removeClusterMarkers]);

  // Update markers when dependencies change
  useEffect(() => {
    if (!map.current) return;

    const m = map.current;
    const onLoad = () => {
      addMarkers();
      updateMarkersVisibility();
    };

    if (m.isStyleLoaded()) {
      addMarkers();
      updateMarkersVisibility();
    } else {
      m.on("load", onLoad);
    }

    return () => {
      m.off("load", onLoad);
    };
  }, [selectedCategory, spots, isEditMode, addMarkers, updateMarkersVisibility]);

  // Listen to zoom changes for clustering
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const m = map.current;
    
    const handleZoom = () => {
      updateMarkersVisibility();
    };
    
    m.on("zoom", handleZoom);
    
    // Initial check
    updateMarkersVisibility();
    
    return () => {
      m.off("zoom", handleZoom);
    };
  }, [mapReady, updateMarkersVisibility]);

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
      zoom: 15,
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
          <div className="flex items-center gap-3">
            <img 
              src={activeVillage.logo} 
              alt={activeVillage.name} 
              className="h-10 w-10 rounded md:h-12 md:w-12"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                  {activeVillage.name}
                </h1>
                <span className="font-body text-sm text-muted-foreground">
                  {activeVillage.dates}
                </span>
              </div>
              <p className="mt-1 font-body text-sm text-muted-foreground md:text-base">
                {activeVillage.location} · {activeVillage.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isEditMode ? "destructive" : "outline"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) {
                  toast.success("Edit mode disabled");
                } else {
                  toast.info("Edit mode enabled - drag pins to adjust locations");
                }
              }}
              title={isEditMode ? "Done Editing" : "Edit Locations"}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            {!isEditMode && (
              <AddSpotForm
                onAddSpot={handleAddSpot}
                pendingCoordinates={pendingCoordinates}
                onSetCoordinates={setPendingCoordinates}
              />
            )}
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
      <div className="absolute bottom-28 right-4 z-10 hidden w-72 rounded-lg bg-card/95 p-4 shadow-card backdrop-blur-sm md:bottom-32 md:block">
        {/* Village info header */}
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
          <img 
            src={activeVillage.logo} 
            alt={activeVillage.name} 
            className="h-10 w-10 rounded"
          />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {activeVillage.name}
            </h3>
            <p className="text-xs text-muted-foreground">{activeVillage.dates}</p>
          </div>
        </div>
        
        {/* Village details */}
        <div className="mb-3 text-xs">
          <p className="text-muted-foreground">Location</p>
          <p className="font-medium text-foreground">{activeVillage.location} · {activeVillage.description}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {activeVillage.participants && (
            <div className="rounded-md bg-secondary/50 p-2">
              <p className="text-muted-foreground">Participants</p>
              <p className="font-medium text-foreground">{activeVillage.participants}</p>
            </div>
          )}
          {activeVillage.focus && (
            <div className="rounded-md bg-secondary/50 p-2">
              <p className="text-muted-foreground">Focus</p>
              <p className="font-medium text-foreground">{activeVillage.focus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <PopupTimeline
        villages={POPUP_VILLAGES}
        activeVillage={activeVillage}
        isZoomedIn={isZoomedIn}
        onVillageClick={(village) => {
          setActiveVillage(village);
          map.current?.flyTo({
            center: village.center,
            zoom: 15,
            duration: 800,
          });
        }}
      />
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

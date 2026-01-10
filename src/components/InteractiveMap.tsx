import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format, isSameDay, startOfDay } from "date-fns";
import { categoryColors } from "@/data/spots";
import { SpotCard } from "./SpotCard";
import { CategoryLegend } from "./SpotMarker";
import { AddSpotForm } from "./AddSpotForm";
import { AddEventForm } from "./AddEventForm";
import { EventCard } from "./EventCard";
import { EventTimeline } from "./EventTimeline";
import { PopupTimeline } from "./PopupTimeline";
import { MapPin, Loader2, Check, X, Edit3, Plus, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useSpots, DbSpot, SpotInput } from "@/hooks/useSpots";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    description: "One-month pop-up village and a long-form hacker house",
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
  const eventMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

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
  const [isZoomedIn, setIsZoomedIn] = useState(true); // Start zoomed in since initial zoom is 15
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [activeView, setActiveView] = useState<"map" | "events">("map");
  const [selectedEventDate, setSelectedEventDate] = useState<Date>(new Date());
  
  // Event pin selection mode
  const [isSelectingEventPin, setIsSelectingEventPin] = useState(false);
  const [pendingEventCoords, setPendingEventCoords] = useState<[number, number] | null>(null);
  const eventPinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  const { events, loading: eventsLoading, addEvent, deleteEvent } = useEvents();
  
  // Filter events by selected date
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = startOfDay(new Date(event.start_time));
      return isSameDay(eventDate, startOfDay(selectedEventDate));
    });
  }, [events, selectedEventDate]);
  
  // Handle event pin map click
  const handleEventPinMapClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!isSelectingEventPin || !map.current) return;
    
    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setPendingEventCoords(coords);
    setIsSelectingEventPin(false);
    
    // Remove click listener
    map.current.off('click', handleEventPinMapClick);
    
    // Create a marker at the selected location
    if (eventPinMarkerRef.current) {
      eventPinMarkerRef.current.remove();
    }
    
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, hsl(142, 40%, 45%) 0%, hsl(142, 35%, 55%) 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
          <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
        </svg>
      </div>
    `;
    
    eventPinMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map.current);
    
    toast.success("Pin placed! Return to the form to complete adding the event.");
  }, [isSelectingEventPin]);
  
  // Set up event pin click listener
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    if (isSelectingEventPin) {
      map.current.getCanvas().style.cursor = 'crosshair';
      map.current.on('click', handleEventPinMapClick);
    } else {
      map.current.getCanvas().style.cursor = '';
    }
    
    return () => {
      if (map.current) {
        map.current.off('click', handleEventPinMapClick);
      }
    };
  }, [isSelectingEventPin, mapReady, handleEventPinMapClick]);
  
  const handleRequestEventPin = useCallback(() => {
    setIsSelectingEventPin(true);
  }, []);
  
  const handleClearEventCoords = useCallback(() => {
    setPendingEventCoords(null);
    if (eventPinMarkerRef.current) {
      eventPinMarkerRef.current.remove();
      eventPinMarkerRef.current = null;
    }
  }, []);
  const CLUSTER_ZOOM_THRESHOLD = 9;

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
          setIsZoomedIn(true); // Hide timeline when spot is clicked
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

  // Handle zoom-based clustering and view-based visibility
  const updateMarkersVisibility = useCallback(() => {
    if (!map.current) return;
    
    const zoom = map.current.getZoom();
    const shouldCluster = zoom < CLUSTER_ZOOM_THRESHOLD;
    
    if (shouldCluster !== isClusteredRef.current) {
      isClusteredRef.current = shouldCluster;
      setIsZoomedIn(!shouldCluster);
      
      if (shouldCluster) {
        // Hide individual markers, show cluster markers, and clear selected spot
        setSelectedSpot(null);
        markersRef.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.display = 'none';
        });
        // Hide event markers when clustered
        eventMarkersRef.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.display = 'none';
        });
        createClusterMarkers();
      } else {
        // Show individual markers only if in map view, hide cluster markers
        markersRef.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.display = activeView === "map" ? 'block' : 'none';
        });
        // Show event markers only if in events view
        eventMarkersRef.current.forEach((marker) => {
          const el = marker.getElement();
          el.style.display = activeView === "events" ? 'block' : 'none';
        });
        removeClusterMarkers();
      }
    } else if (!shouldCluster) {
      // Update visibility based on view when not clustered
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        el.style.display = activeView === "map" ? 'block' : 'none';
      });
      eventMarkersRef.current.forEach((marker) => {
        const el = marker.getElement();
        el.style.display = activeView === "events" ? 'block' : 'none';
      });
    }
  }, [createClusterMarkers, removeClusterMarkers, activeView]);

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

  // Add event markers for events with coordinates
  const addEventMarkers = useCallback(() => {
    if (!map.current || !mapReady) return;

    // Remove existing event markers
    eventMarkersRef.current.forEach((marker) => marker.remove());
    eventMarkersRef.current.clear();

    // Filter events with coordinates
    const eventsWithCoords = events.filter(event => event.coordinates);

    eventsWithCoords.forEach((event) => {
      const coords = event.coordinates as [number, number];
      
      const el = document.createElement("div");
      el.className = "event-marker";
      el.innerHTML = `
        <div class="marker-container" style="
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, hsl(142, 40%, 45%) 0%, hsl(142, 35%, 55%) 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border: 2px solid white;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="transform: rotate(45deg);">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
      `;

      el.addEventListener("mouseenter", () => {
        const container = el.querySelector(".marker-container") as HTMLElement;
        if (container) {
          container.style.transform = "rotate(-45deg) scale(1.15)";
        }
      });

      el.addEventListener("mouseleave", () => {
        const container = el.querySelector(".marker-container") as HTMLElement;
        if (container) {
          container.style.transform = "rotate(-45deg) scale(1)";
        }
      });

      // Create popup for event
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="padding: 8px; max-width: 200px;">
            <strong style="font-size: 14px;">${event.name}</strong>
            ${event.location ? `<p style="font-size: 12px; color: #666; margin: 4px 0 0;">${event.location}</p>` : ''}
            <p style="font-size: 11px; color: #888; margin: 4px 0 0;">${format(new Date(event.start_time), 'MMM d, h:mm a')}</p>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener("click", () => {
        // Select the date of this event
        setSelectedEventDate(startOfDay(new Date(event.start_time)));
        // Switch to events view
        setActiveView("events");
      });

      eventMarkersRef.current.set(event.id, marker);
    });
  }, [events, mapReady]);

  // Update event markers visibility based on active view
  const updateEventMarkersVisibility = useCallback(() => {
    const shouldShow = activeView === "events" && !isClusteredRef.current;
    eventMarkersRef.current.forEach((marker) => {
      const el = marker.getElement();
      el.style.display = shouldShow ? 'block' : 'none';
    });
  }, [activeView]);

  // Render event markers when events change
  useEffect(() => {
    addEventMarkers();
  }, [addEventMarkers]);

  // Update event markers visibility when view changes
  useEffect(() => {
    updateEventMarkersVisibility();
  }, [updateEventMarkersVisibility, activeView]);

  // Listen to zoom changes for clustering and view changes
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const m = map.current;
    
    const handleZoom = () => {
      updateMarkersVisibility();
    };
    
    m.on("zoom", handleZoom);
    
    // Update visibility when view changes
    updateMarkersVisibility();
    
    return () => {
      m.off("zoom", handleZoom);
    };
  }, [mapReady, updateMarkersVisibility, activeView]);

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

  // Create/update user location marker
  const updateUserLocationMarker = useCallback((coords: [number, number]) => {
    if (!map.current) return;

    // Remove existing marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create pulsing blue dot marker with high z-index
    const el = document.createElement("div");
    el.style.zIndex = "9999";
    el.innerHTML = `
      <div style="position: relative; width: 32px; height: 32px;">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 18px;
          height: 18px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map.current);

    userMarkerRef.current = marker;
  }, []);

  // Get user location
  const handleGetUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);

    const onSuccess = (position: GeolocationPosition) => {
      const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
      setUserLocation(coords);
      updateUserLocationMarker(coords);
      setIsLocating(false);
      
      // Fly to user location
      map.current?.flyTo({
        center: coords,
        zoom: 15,
        duration: 1000,
      });
      
      toast.success("Found your location!");
    };

    const onError = (error: GeolocationPositionError) => {
      // If high accuracy fails, try with low accuracy
      if (error.code === error.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackError) => {
            setIsLocating(false);
            switch (fallbackError.code) {
              case fallbackError.PERMISSION_DENIED:
                toast.error("Location access denied. Please enable location permissions.");
                break;
              case fallbackError.POSITION_UNAVAILABLE:
                toast.error("Location unavailable. Try opening in a new tab.");
                break;
              case fallbackError.TIMEOUT:
                toast.error("Location request timed out.");
                break;
              default:
                toast.error("Unable to get your location.");
            }
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
        );
        return;
      }
      
      setIsLocating(false);
      switch (error.code) {
        case error.PERMISSION_DENIED:
          toast.error("Location access denied. Please enable location permissions.");
          break;
        case error.TIMEOUT:
          toast.error("Location request timed out.");
          break;
        default:
          toast.error("Unable to get your location.");
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      onError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [updateUserLocationMarker]);

  // Watch user location for updates
  useEffect(() => {
    if (!navigator.geolocation || !userLocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setUserLocation(coords);
        updateUserLocationMarker(coords);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userLocation, updateUserLocationMarker]);

  // Cleanup user marker on unmount
  useEffect(() => {
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
    };
  }, []);


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
      <div className="absolute left-0 right-0 top-0 z-10 pointer-events-none bg-gradient-to-b from-background/90 via-background/60 to-transparent p-4 pb-16 md:p-6 md:pb-20">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-4 pointer-events-auto w-fit">
            <div className="flex items-center gap-3">
              {isZoomedIn ? (
                <>
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
                      {activeVillage.location}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                    Popup Villages
                  </h1>
                  <p className="mt-1 font-body text-sm text-muted-foreground md:text-base">
                    Explore communities around the world
                  </p>
                </div>
              )}
            </div>

            {/* Category filter - only show in map view when zoomed in */}
            {isZoomedIn && activeView === "map" && (
              <div className="pointer-events-auto w-fit">
                <CategoryLegend
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            )}
          </div>

          {/* Map / Events Toggle - right side */}
          {isZoomedIn && (
            <div className="flex rounded-lg bg-card/90 p-1 shadow-sm backdrop-blur-sm pointer-events-auto mr-14">
              <button
                onClick={() => setActiveView("map")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeView === "map"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setActiveView("events")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeView === "events"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Events
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected spot card - only show in map view */}
      {selectedSpot && activeView === "map" && (
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
            userLocation={userLocation}
          />
        </div>
      )}

      {/* Events view - shows when in events mode */}
      {activeView === "events" && (
        <div className="absolute bottom-[72px] left-2 right-2 z-20 sm:left-4 sm:right-4 md:bottom-[80px] md:left-6 md:right-auto">
          <div className="w-full rounded-xl bg-card/95 shadow-lg backdrop-blur-sm md:w-96 max-h-[40vh] sm:max-h-[50vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Events
                </h3>
                <p className="text-xs text-muted-foreground">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} on {format(selectedEventDate, 'MMM d, yyyy')}
                </p>
              </div>
              <AddEventForm 
                onAddEvent={addEvent} 
                villageId={activeVillage.id}
                onRequestMapPin={handleRequestEventPin}
                pendingCoordinates={pendingEventCoords}
                onClearCoordinates={handleClearEventCoords}
              />
            </div>
            <ScrollArea className="flex-1 p-4">
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    No events on this date
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select another date or add a new event
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={deleteEvent}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Spots list sidebar */}
      <div className="absolute bottom-28 right-4 z-10 hidden w-72 rounded-lg bg-card/95 p-4 shadow-card backdrop-blur-sm md:bottom-32 md:block">
        {/* Village info header */}
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
          {isZoomedIn ? (
            <>
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
                {activeVillage.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeVillage.description}</p>
                )}
              </div>
            </>
          ) : (
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                Popup Villages
              </h3>
              <p className="text-xs text-muted-foreground">Click on a village to explore</p>
            </div>
          )}
        </div>
        
        {/* Village details - only show when zoomed in */}
        {isZoomedIn && (
          <div className="mb-3 text-xs">
            <p className="text-muted-foreground">Location</p>
            <p className="font-medium text-foreground">{activeVillage.location} · Famous kitesurfing spot</p>
          </div>
        )}
        
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

      {/* Floating Action Buttons - bottom right */}
      <div className="absolute bottom-[80px] right-2 z-20 flex flex-col gap-2 sm:right-4 md:bottom-[88px] md:right-6">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-card"
          onClick={handleGetUserLocation}
          disabled={isLocating}
          title="Find my location"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Navigation className="h-5 w-5" />
          )}
        </Button>
        {!isEditMode && (
          <AddSpotForm
            onAddSpot={handleAddSpot}
            pendingCoordinates={pendingCoordinates}
            onSetCoordinates={setPendingCoordinates}
          />
        )}
      </div>

      {/* Event pin selection mode indicator */}
      {isSelectingEventPin && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-sage-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">Click on the map to set event location</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-sage-700"
            onClick={() => setIsSelectingEventPin(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Timeline - show PopupTimeline for map view, EventTimeline for events view */}
      {activeView === "events" ? (
        <EventTimeline
          events={events}
          selectedDate={selectedEventDate}
          onDateSelect={setSelectedEventDate}
        />
      ) : (
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

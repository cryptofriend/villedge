import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { categoryColors } from "@/data/spots";
import { SpotCard } from "./SpotCard";
import { CategoryLegend } from "./SpotMarker";
import { AddSpotForm } from "./AddSpotForm";
import { PopupTimeline } from "./PopupTimeline";
import { StayCalendar } from "./stays/StayCalendar";
import { SceniusList } from "./SceniusList";
import { BulletinList } from "./BulletinList";
import { EventsList } from "./events/EventsList";
import { createFloatingCommentHTML } from "./FloatingCommentBubble";
import { AuthButton } from "./AuthButton";
import { MobileBottomNav } from "./MobileBottomNav";
import { VillageSocialIcons } from "./VillageSocialIcons";
import { EditVillageDialog } from "./villages/EditVillageDialog";
import { MapPin, Loader2, Check, X, Edit3, Plus, Navigation, Users, Sparkles, ArrowLeft, CalendarDays, MessageSquare, Calendar, Coins } from "lucide-react";
import { TreasuryList } from "./treasury/TreasuryList";
import { ExpandablePanel } from "./ExpandablePanel";
import { toast } from "sonner";
import { useSpots, DbSpot, SpotInput } from "@/hooks/useSpots";
import { useVillages, Village } from "@/hooks/useVillages";
import { useSceniusProjects } from "@/hooks/useSceniusProjects";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Comment } from "@/hooks/useComments";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Default center (first village or fallback)
const DEFAULT_CENTER: [number, number] = [108.1885, 10.9355];

type CategoryType = "map" | "residents" | "scenius" | "bulletin" | "events" | "treasury";

interface InteractiveMapProps {
  mapboxToken: string;
  initialVillageId?: string;
  initialCategory?: CategoryType;
}

export const InteractiveMap = ({ mapboxToken, initialVillageId, initialCategory = "map" }: InteractiveMapProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clusterMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const commentMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const isMobile = useIsMobile();

  // Data hooks
  const { villages, loading: villagesLoading, refetch: refetchVillages } = useVillages();
  const [activeVillage, setActiveVillage] = useState<Village | null>(null);
  const { spots, loading: spotsLoading, addSpot, updateSpotCoordinates, deleteSpot, updateSpot } = useSpots(activeVillage?.id);
  const { isHost, canCreate } = usePermissions();
  const { profile, isAuthenticated } = useAuth();
  
  
  // State
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
  const [isZoomedIn, setIsZoomedIn] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  // Active view - use URL path-based category, fallback to query param for backward compatibility
  const validTabs: CategoryType[] = ["map", "residents", "scenius", "bulletin", "events", "treasury"];
  const queryTab = searchParams.get("tab") as CategoryType | null;
  const [activeView, setActiveView] = useState<CategoryType>(
    initialCategory || (queryTab && validTabs.includes(queryTab) ? queryTab : "map")
  );
  
  // Handle view changes with URL navigation
  const handleViewChange = useCallback((view: CategoryType) => {
    setActiveView(view);
    if (initialVillageId) {
      // Navigate to the new category URL
      const basePath = `/${initialVillageId}`;
      const newPath = view === "map" ? basePath : `${basePath}/${view}`;
      navigate(newPath, { replace: true });
    }
  }, [initialVillageId, navigate]);
  
  // Comments for floating bubbles
  const [allComments, setAllComments] = useState<Comment[]>([]);
  
  // Scenius for the active village
  const { projects, loading: projectsLoading } = useSceniusProjects(activeVillage?.id);
  
  const CLUSTER_ZOOM_THRESHOLD = 9;

  // Set initial active village when villages load
  useEffect(() => {
    if (villages.length > 0 && !activeVillage) {
      if (initialVillageId) {
        const targetVillage = villages.find(v => v.id === initialVillageId);
        if (targetVillage) {
          setActiveVillage(targetVillage);
          return;
        }
      }
      setActiveVillage(villages[0]);
    }
  }, [villages, activeVillage, initialVillageId]);

  // Fly to active village when map is ready (for village-specific routes)
  useEffect(() => {
    if (mapReady && map.current && activeVillage && initialVillageId) {
      map.current.flyTo({
        center: activeVillage.center,
        zoom: 15,
        duration: 0, // Instant on initial load
      });
      setIsZoomedIn(true);
      isClusteredRef.current = false;
    }
  }, [mapReady, activeVillage, initialVillageId]);

  // Create/update the draggable selection marker
  useEffect(() => {
    if (!mapReady || !map.current) return;

    const m = map.current;

    if (isSelectingLocation) {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }

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

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const initialCenter = activeVillage?.center || DEFAULT_CENTER;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initialCenter,
      zoom: 15,
      pitch: 20,
    });

    map.current = m;

    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

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

  // Create cluster markers for all villages
  const createClusterMarkers = useCallback(() => {
    if (!map.current || villages.length === 0) return;
    
    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();
    
    villages.forEach((village) => {
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
          <img 
            src="${village.logo_url || '/placeholder.svg'}" 
            alt="${village.name}" 
            style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;"
          />
          <div style="display: flex; flex-direction: column; line-height: 1.2;">
            <span style="font-weight: 600; font-size: 12px; color: #333;">${village.name}</span>
            <span style="font-size: 10px; color: #666;">${village.location}</span>
          </div>
        </div>
      `;

      el.addEventListener("mouseenter", () => {
        const container = el.firstElementChild as HTMLElement;
        if (container) {
          container.style.transform = "scale(1.05)";
          container.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
        }
      });

      el.addEventListener("mouseleave", () => {
        const container = el.firstElementChild as HTMLElement;
        if (container) {
          container.style.transform = "scale(1)";
          container.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
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

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(village.center)
        .addTo(map.current!);

      clusterMarkersRef.current.set(village.id, marker);
    });
  }, [villages]);

  // Remove cluster markers
  const removeClusterMarkers = useCallback(() => {
    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();
  }, []);

  // Add spot markers
  const addMarkers = useCallback(() => {
    if (!map.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    spotMarkersRef.current.clear();

    const filteredSpots = selectedCategory
      ? spots.filter((spot) => spot.category === selectedCategory)
      : spots;

    filteredSpots.forEach((spot) => {
      const color = categoryColors[spot.category] || categoryColors.activity;

      const el = document.createElement("div");
      el.className = "marker";
      el.innerHTML = `
        <div class="marker-container" style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: ${isEditMode ? 'grab' : 'pointer'};
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border: 2px solid white;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="transform: rotate(45deg);">
            ${getIconPath(spot.category)}
          </svg>
        </div>
      `;

      el.addEventListener("mouseenter", () => {
        const container = el.querySelector(".marker-container") as HTMLElement;
        if (container) container.style.transform = "rotate(-45deg) scale(1.15)";
      });

      el.addEventListener("mouseleave", () => {
        const container = el.querySelector(".marker-container") as HTMLElement;
        if (container) container.style.transform = "rotate(-45deg) scale(1)";
      });

      const marker = new mapboxgl.Marker({ element: el, draggable: isEditMode })
        .setLngLat(spot.coordinates)
        .addTo(map.current!);

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
          setIsZoomedIn(true);
          const bottomPadding = isMobile ? 350 : 0;
          map.current?.flyTo({
            center: spot.coordinates,
            zoom: 15,
            duration: 800,
            padding: { top: 80, bottom: bottomPadding, left: 0, right: 0 },
          });
        }
      });

      markersRef.current.push(marker);
      spotMarkersRef.current.set(spot.id, marker);
    });
  }, [selectedCategory, spots, isEditMode, updateSpotCoordinates, isMobile]);

  // Handle zoom-based clustering and view-based visibility
  // Local map elements (spot markers, comment bubbles) only show when zoomed into a village
  const updateMarkersVisibility = useCallback(() => {
    if (!map.current) return;
    
    const zoom = map.current.getZoom();
    const shouldCluster = zoom < CLUSTER_ZOOM_THRESHOLD;
    const zoomedIn = !shouldCluster;
    
    if (shouldCluster !== isClusteredRef.current) {
      isClusteredRef.current = shouldCluster;
      setIsZoomedIn(zoomedIn);
      
      if (shouldCluster) {
        // Global view: hide all local markers
        setSelectedSpot(null);
        markersRef.current.forEach((marker) => {
          marker.getElement().style.display = 'none';
        });
        commentMarkersRef.current.forEach((marker) => {
          marker.getElement().style.display = 'none';
        });
        createClusterMarkers();
      } else {
        // Village view: show markers only when on map tab
        const shouldShowMarkers = activeView === "map" && zoomedIn;
        markersRef.current.forEach((marker) => {
          marker.getElement().style.display = shouldShowMarkers ? 'block' : 'none';
        });
        commentMarkersRef.current.forEach((marker) => {
          marker.getElement().style.display = shouldShowMarkers ? 'block' : 'none';
        });
        removeClusterMarkers();
      }
    } else if (!shouldCluster) {
      // Already in village view, update visibility based on active tab
      const shouldShowMarkers = activeView === "map" && zoomedIn;
      markersRef.current.forEach((marker) => {
        marker.getElement().style.display = shouldShowMarkers ? 'block' : 'none';
      });
      commentMarkersRef.current.forEach((marker) => {
        marker.getElement().style.display = shouldShowMarkers ? 'block' : 'none';
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

  // Fetch all comments for floating bubbles
  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setAllComments(data as Comment[]);
      }
    };
    
    fetchComments();
    
    const channel = supabase
      .channel('comments-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => fetchComments()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group comments by spot and get latest for each
  const latestCommentBySpot = useMemo(() => {
    const map = new Map<string, Comment>();
    allComments.forEach((comment) => {
      if (!map.has(comment.spot_id)) {
        map.set(comment.spot_id, comment);
      }
    });
    return map;
  }, [allComments]);

  // Add floating comment bubbles
  const addCommentBubbles = useCallback(() => {
    if (!map.current || !mapReady) return;

    commentMarkersRef.current.forEach((marker) => marker.remove());
    commentMarkersRef.current.clear();

    spots.forEach((spot) => {
      const latestComment = latestCommentBySpot.get(spot.id);
      if (!latestComment) return;

      if (selectedCategory && spot.category !== selectedCategory) return;

      const el = document.createElement("div");
      el.innerHTML = createFloatingCommentHTML(latestComment);
      el.style.pointerEvents = 'none';

      el.addEventListener("click", () => {
        setSelectedSpot(spot);
        setIsZoomedIn(true);
        const bottomPadding = isMobile ? 350 : 0;
        map.current?.flyTo({
          center: spot.coordinates,
          zoom: 15,
          duration: 800,
          padding: { top: 80, bottom: bottomPadding, left: 0, right: 0 },
        });
      });

      const marker = new mapboxgl.Marker({ 
        element: el, 
        anchor: 'bottom',
        offset: [isMobile ? 30 : 40, -25]
      })

        .setLngLat(spot.coordinates)
        .addTo(map.current!);

      commentMarkersRef.current.set(spot.id, marker);
    });
  }, [spots, latestCommentBySpot, mapReady, isMobile, selectedCategory]);

  // Update comment bubbles visibility - only show when zoomed into a village (not in global clustered view)
  const updateCommentBubblesVisibility = useCallback(() => {
    const shouldShow = activeView === "map" && isZoomedIn && !isClusteredRef.current;
    commentMarkersRef.current.forEach((marker) => {
      marker.getElement().style.display = shouldShow ? 'block' : 'none';
    });
  }, [activeView, isZoomedIn]);

  // Render comment bubbles when data changes
  useEffect(() => {
    addCommentBubbles();
  }, [addCommentBubbles]);

  // Update comment bubbles visibility when view or zoom state changes
  useEffect(() => {
    updateCommentBubblesVisibility();
  }, [updateCommentBubblesVisibility, activeView, isZoomedIn]);

  // Listen to zoom changes
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const m = map.current;
    const handleZoom = () => updateMarkersVisibility();
    
    m.on("zoom", handleZoom);
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
    if (activeVillage) {
      map.current?.flyTo({
        center: activeVillage.center,
        zoom: 15,
        duration: 800,
      });
    }
  };

  // User location marker
  const updateUserLocationMarker = useCallback((coords: [number, number]) => {
    if (!map.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

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
      
      map.current?.flyTo({
        center: coords,
        zoom: 15,
        duration: 1000,
      });
      
      toast.success("Location found!");
    };

    const onError = (error: GeolocationPositionError) => {
      setIsLocating(false);
      console.error("Geolocation error:", error);
      toast.error("Unable to get your location");
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [updateUserLocationMarker]);

  // Convert villages to PopupTimeline format
  const villagesForTimeline = useMemo(() => {
    return villages.map(v => ({
      id: v.id,
      name: v.name,
      logo: v.logo_url || '/placeholder.svg',
      center: v.center,
      dates: v.dates,
      location: v.location,
      description: v.description,
      participants: v.participants || undefined,
      focus: v.focus || undefined,
    }));
  }, [villages]);

  const activeVillageForTimeline = useMemo(() => {
    if (!activeVillage) return villagesForTimeline[0];
    return {
      id: activeVillage.id,
      name: activeVillage.name,
      logo: activeVillage.logo_url || '/placeholder.svg',
      center: activeVillage.center,
      dates: activeVillage.dates,
      location: activeVillage.location,
      description: activeVillage.description,
      participants: activeVillage.participants || undefined,
      focus: activeVillage.focus || undefined,
    };
  }, [activeVillage, villagesForTimeline]);

  const loading = villagesLoading || spotsLoading;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ touchAction: 'manipulation', overscrollBehavior: 'contain' }}>
      <div ref={mapContainer} className="h-full w-full" />
      
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-body text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Location selection UI */}
      {isSelectingLocation && selectionCoords && (
        <div className="absolute inset-x-0 top-4 z-30 flex justify-center px-4">
          <div className="rounded-xl bg-card/95 p-4 shadow-lg backdrop-blur-sm">
            <p className="mb-3 text-center text-sm font-medium text-foreground">
              Drag the pin to set the spot location
            </p>
            <p className="mb-3 text-center text-xs text-muted-foreground">
              {selectionCoords[1].toFixed(5)}, {selectionCoords[0].toFixed(5)}
            </p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={handleCancelSelection} className="gap-1">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" variant="sage" onClick={handleConfirmLocation} className="gap-1">
                <Check className="h-4 w-4" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header overlay */}
      <div className="absolute left-0 right-0 top-0 z-10 pointer-events-none bg-gradient-to-b from-background/90 via-background/60 to-transparent p-3 pb-12 sm:p-4 sm:pb-16 md:p-6 md:pb-20">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 sm:gap-4 pointer-events-auto w-fit max-w-[65%] sm:max-w-none">
            <div className="flex items-center gap-2 sm:gap-3">
              {initialVillageId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 pointer-events-auto"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {activeVillage && (
                <>
                  <img 
                    src={activeVillage.logo_url || '/placeholder.svg'} 
                    alt={activeVillage.name} 
                    className="h-8 w-8 rounded sm:h-10 sm:w-10 md:h-12 md:w-12 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    {/* Mobile layout: stacked */}
                    <div className="flex flex-col sm:hidden gap-0.5">
                      <div className="flex items-center gap-1">
                        <h1 className="font-display text-base font-semibold text-foreground leading-tight">
                          {activeVillage.name}
                        </h1>
                        {isHost(activeVillage.id) && (
                          <EditVillageDialog 
                            village={activeVillage} 
                            onVillageUpdated={() => {
                              refetchVillages();
                            }} 
                          />
                        )}
                      </div>
                      <VillageSocialIcons village={activeVillage} />
                      <span className="font-body text-xs text-muted-foreground">
                        {activeVillage.dates}
                      </span>
                    </div>
                    {/* Desktop layout */}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
                              {activeVillage.name}
                            </h1>
                            {isHost(activeVillage.id) && (
                              <EditVillageDialog 
                                village={activeVillage} 
                                onVillageUpdated={() => {
                                  refetchVillages();
                                }} 
                              />
                            )}
                          </div>
                          <span className="font-body text-sm text-muted-foreground">
                            {activeVillage.dates}
                          </span>
                        </div>
                        <VillageSocialIcons village={activeVillage} />
                      </div>
                      <p className="font-body text-sm md:text-base text-muted-foreground truncate">
                        {activeVillage.location}
                      </p>
                    </div>
                  </div>
                </>
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

          {/* Auth button - always visible on desktop (top-right) */}
          <div className="hidden sm:flex items-center gap-2 pointer-events-auto">
            {/* View toggle tabs - only when zoomed in */}
            {isZoomedIn && (
              <div className="flex rounded-lg bg-card/90 p-0.5 sm:p-1 shadow-sm backdrop-blur-sm">
                <button
                  onClick={() => handleViewChange("map")}
                className={`px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  activeView === "map"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
              
              {/* Restricted tabs for verified users only */}
              {[
                { id: "residents" as CategoryType, icon: CalendarDays, label: "Residents" },
                { id: "scenius" as CategoryType, icon: Sparkles, label: "Scenius" },
                { id: "bulletin" as CategoryType, icon: MessageSquare, label: "Bulletin" },
                { id: "treasury" as CategoryType, icon: Coins, label: "Treasury" },
                { id: "events" as CategoryType, icon: Calendar, label: "Events" },
              ].map(({ id, icon: Icon, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleViewChange(id)}
                      className={`px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                        activeView === id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  </TooltipTrigger>
                </Tooltip>
              ))}
              </div>
            )}
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Selected spot card - only show in map view */}
      {selectedSpot && activeView === "map" && (
        <div className="absolute bottom-20 left-4 z-20 sm:bottom-4 md:bottom-6 md:left-6">
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
            onDelete={activeVillage && isHost(activeVillage.id) ? deleteSpot : undefined}
            onUpdate={canCreate ? updateSpot : undefined}
            userLocation={userLocation}
          />
        </div>
      )}

      {/* Stays Calendar view */}
      {activeView === "residents" && isZoomedIn && activeVillage && (
        <div className="absolute bottom-[72px] left-2 right-2 z-20 sm:left-4 sm:right-4 md:bottom-[80px] md:left-6 md:right-6">
          <ExpandablePanel>
            <StayCalendar villageId={activeVillage.id} applyUrl={(activeVillage as any).apply_url} />
          </ExpandablePanel>
        </div>
      )}

      {/* Scenius view */}
      {activeView === "scenius" && isZoomedIn && (
        <div className="absolute bottom-[72px] left-2 right-2 z-20 sm:left-4 sm:right-4 md:bottom-[80px] md:left-6 md:right-6">
          <ExpandablePanel>
            <div className="p-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Scenius
              </h3>
              <p className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? "s" : ""} being built
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-4">
              <SceniusList projects={projects} loading={projectsLoading} villageId={activeVillage?.id} />
            </div>
          </ExpandablePanel>
        </div>
      )}

      {/* Bulletin view */}
      {activeView === "bulletin" && isZoomedIn && activeVillage && (
        <div className="absolute bottom-[72px] left-2 right-2 z-20 sm:left-4 sm:right-4 md:bottom-[80px] md:left-6 md:right-6">
          <ExpandablePanel>
            <div className="p-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Bulletin
              </h3>
              <p className="text-xs text-muted-foreground">
                Share messages with the village
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <BulletinList villageId={activeVillage.id} />
            </div>
          </ExpandablePanel>
        </div>
      )}

      {/* Events view */}
      {activeView === "events" && isZoomedIn && activeVillage && (
        <div className="absolute bottom-[72px] left-2 right-2 z-20 sm:left-4 sm:right-4 md:bottom-[80px] md:left-6 md:right-6">
          <ExpandablePanel>
            <div className="p-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Events
              </h3>
              <p className="text-xs text-muted-foreground">
                Drop a Luma link to add events
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <EventsList villageId={activeVillage.id} />
            </div>
          </ExpandablePanel>
        </div>
      )}

      {/* Treasury view */}
      {activeView === "treasury" && isZoomedIn && activeVillage && (
        <div className="absolute bottom-[72px] left-2 right-2 z-20 sm:left-4 sm:right-4 md:bottom-[80px] md:left-6 md:right-6">
          <ExpandablePanel>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TreasuryList 
                villageId={activeVillage.id} 
                ethWalletAddress={activeVillage.wallet_address}
                solWalletAddress={activeVillage.solana_wallet_address}
              />
            </div>
          </ExpandablePanel>
        </div>
      )}

      {activeView === "map" && (
        <div className="absolute bottom-28 right-4 z-10 hidden w-72 rounded-lg bg-card/95 p-4 shadow-card backdrop-blur-sm md:bottom-32 md:block">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
            {isZoomedIn && activeVillage ? (
              <>
                <img 
                  src={activeVillage.logo_url || '/placeholder.svg'} 
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
          
          {isZoomedIn && activeVillage && (
            <div className="mb-3 text-xs">
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium text-foreground">{activeVillage.location}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {activeVillage?.participants && (
              <div className="rounded-md bg-secondary/50 p-2">
                <p className="text-muted-foreground">Participants</p>
                <p className="font-medium text-foreground">{activeVillage.participants}</p>
              </div>
            )}
            {activeVillage?.focus && (
              <div className="rounded-md bg-secondary/50 p-2">
                <p className="text-muted-foreground">Focus</p>
                <p className="font-medium text-foreground">{activeVillage.focus}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="absolute bottom-24 right-3 z-20 flex flex-col gap-2 sm:bottom-20 sm:right-4 md:bottom-[88px] md:right-6">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full shadow-lg bg-card sm:h-12 sm:w-12"
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
        {activeView === "map" && !isEditMode && (
          <AddSpotForm
            onAddSpot={handleAddSpot}
            pendingCoordinates={pendingCoordinates}
            onSetCoordinates={setPendingCoordinates}
          />
        )}
      </div>

      {/* Timeline */}
      {villagesForTimeline.length > 0 && activeVillageForTimeline && (
        <PopupTimeline
          villages={villagesForTimeline}
          activeVillage={activeVillageForTimeline}
          isZoomedIn={isZoomedIn}
          onVillageClick={(village) => {
            const fullVillage = villages.find(v => v.id === village.id);
            if (fullVillage) {
              setActiveVillage(fullVillage);
              map.current?.flyTo({
                center: fullVillage.center,
                zoom: 15,
                duration: 800,
              });
            }
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {isZoomedIn && (
        <MobileBottomNav
          activeView={activeView}
          onViewChange={handleViewChange}
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

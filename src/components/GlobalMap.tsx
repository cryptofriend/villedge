import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, Users, Settings, Calendar, Building2, ScrollText, User } from "lucide-react";
import { useVillages, Village, VillageType } from "@/hooks/useVillages";
import { useNavigate } from "react-router-dom";
import { AddVillageForm } from "@/components/villages/AddVillageForm";
import { AuthButton } from "@/components/AuthButton";
import { PopupTimeline } from "@/components/PopupTimeline";
import { useUserCount } from "@/hooks/useUserCount";
import { useAuth } from "@/hooks/useAuth";
import { useUserCurrentVillage } from "@/hooks/useUserCurrentVillage";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ManifestoDialog } from "@/components/ManifestoDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ADMIN_USER_IDS = [
  "9807c494-ba07-4438-9a89-07ac13334e78", // dev
  "b015441b-3bb4-4150-94e6-d8be048035bb", // booga
];
const DEFAULT_CENTER: [number, number] = [30, 25];
const DEFAULT_ZOOM = 2;

// Padding to account for UI overlays (right sidebar, bottom timeline)
const MAP_PADDING = { top: 80, bottom: 220, left: 0, right: 300 };

interface GlobalMapProps {
  mapboxToken: string;
}

export const GlobalMap = ({ mapboxToken }: GlobalMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const clusterMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const navigate = useNavigate();

  const { villages, loading: villagesLoading } = useVillages();
  const { count: userCount } = useUserCount();
  const { user } = useAuth();
  const { currentVillage } = useUserCurrentVillage(user?.id, villages);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [villageTypeFilter, setVillageTypeFilter] = useState<VillageType>("popup");
  const [initialCenterSet, setInitialCenterSet] = useState(false);

  const isAdmin = user?.id ? ADMIN_USER_IDS.includes(user.id) : false;
  const isMobile = useIsMobile();
  const { profile, isAuthenticated } = useAuth();

  // Filter villages by type, ensuring the featured village renders on top
  const filteredVillages = useMemo(() => {
    const list = villages.filter(v => v.village_type === villageTypeFilter);
    return list.sort((a, b) => {
      if (a.id === 'renaissance-village') return 1;
      if (b.id === 'renaissance-village') return -1;
      return 0;
    });
  }, [villages, villageTypeFilter]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      const m = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      // Apply padding to visually center the map within the visible area
      m.setPadding(MAP_PADDING);

      map.current = m;

      m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

      m.on('error', (e) => {
        if (e.error && e.error.message.includes('WebGL')) {
          setMapError(e.error.message);
        }
      });

      if (m.isStyleLoaded()) {
        setMapReady(true);
      } else {
        m.once("load", () => {
          setMapReady(true);
        });
      }
    } catch (e: any) {
      console.error("GlobalMap: Mapbox initialization error", e);
      setMapError(e.message || "Failed to load map");
    }

    return () => {
      setMapReady(false);
      setInitialCenterSet(false);
      clusterMarkersRef.current.forEach((marker) => marker.remove());
      clusterMarkersRef.current.clear();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  // Center map on user's current village or preferred village
  useEffect(() => {
    if (!map.current || !mapReady || initialCenterSet) return;

    // Prefer Renaissance Village as the featured village, then fall back to user's current village
    const preferredVillage = villages.find(v => v.id === 'renaissance-village') || currentVillage;

    if (preferredVillage) {
      map.current.flyTo({
        center: preferredVillage.center,
        zoom: 5,
        duration: 1500,
      });
      setInitialCenterSet(true);
    }
  }, [mapReady, currentVillage, villages, initialCenterSet]);

  // Get village route slug - all villages use /:id format now
  const getVillageRoute = (village: Village | { id: string }) => {
    return `/${village.id}`;
  };

  // Transform villages for PopupTimeline format (only popup villages)
  const timelineVillages = useMemo(() => {
    return villages
      .filter(v => v.village_type === 'popup')
      .map((v) => ({
        id: v.id,
        name: v.name,
        logo: v.logo_url || '/placeholder.svg',
        center: v.center as [number, number],
        dates: v.dates,
        location: v.location,
        description: v.description,
        participants: v.participants || undefined,
        focus: v.focus || undefined,
      }));
  }, [villages]);

  const activeVillage = timelineVillages[0] || {
    id: "",
    name: "",
    logo: "",
    center: [0, 0] as [number, number],
    dates: "",
    location: "",
    description: "",
  };

  const handleTimelineVillageClick = (village: { id: string }) => {
    const route = getVillageRoute(village);
    navigate(route);
  };

  // Truncate text to a maximum length
  const truncateText = (text: string, maxLength: number = 20) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Calculate marker scale based on zoom level
  const getMarkerScale = useCallback((zoom: number) => {
    // Scale markers with zoom: smaller when zoomed out, larger when zoomed in
    const minZoom = 1;
    const maxZoom = 8;
    const minScale = 0.5;
    const maxScale = 1.0;
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    return minScale + (maxScale - minScale) * ((clampedZoom - minZoom) / (maxZoom - minZoom));
  }, []);

  // Update marker scales based on current zoom
  const updateMarkerScales = useCallback(() => {
    if (!map.current) return;
    const zoom = map.current.getZoom();
    const scale = getMarkerScale(zoom);
    clusterMarkersRef.current.forEach((marker) => {
      const el = marker.getElement();
      el.style.transform = `scale(${scale})`;
      el.style.transformOrigin = 'bottom center';
    });
  }, [getMarkerScale]);

  // Detect if a popup village's end date is in the past
  const isVillagePast = useCallback((village: Village): boolean => {
    if (village.village_type !== 'popup' || !village.dates) return false;
    const dateStr = village.dates;
    if (dateStr.toLowerCase().includes('coming') || dateStr.toLowerCase().includes('permanent')) return false;
    const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    try {
      const parts = dateStr.split(/[–-]/);
      const endPart = (parts[1] || parts[0]).trim();
      const yearMatch = endPart.match(/(\d{4})/);
      const endYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
      const endMonthMatch = endPart.match(/([a-zA-Z]+)/);
      const endDayMatch = endPart.match(/(\d+)/);
      const endMonth = endMonthMatch ? months[endMonthMatch[1].toLowerCase().slice(0,3)] : 11;
      const endDay = endDayMatch ? parseInt(endDayMatch[1]) : 28;
      const end = new Date(endYear, endMonth, endDay);
      return end.getTime() < Date.now();
    } catch {
      return false;
    }
  }, []);

  // Create village markers
  const createVillageMarkers = useCallback(() => {
    if (!map.current || filteredVillages.length === 0) return;

    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();

    const currentZoom = map.current.getZoom();
    const initialScale = getMarkerScale(currentZoom);

    filteredVillages.forEach((village, index) => {
      const isPast = isVillagePast(village);
      const el = document.createElement("div");
      el.className = "village-marker";
      el.style.zIndex = String(10 + index);
      el.style.position = "relative";
      el.style.transform = `scale(${initialScale})`;
      el.style.transformOrigin = 'bottom center';
      el.style.transition = 'transform 0.15s ease-out, opacity 0.2s ease-out';
      el.style.opacity = isPast ? '0.5' : '1';

      const truncatedLocation = truncateText(village.location, 20);
      const logoSrc = village.logo_url || '/placeholder.svg';

      // Structure: pointer arrow at bottom center, pill above it
      el.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div class="village-marker-pill" style="
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(250, 248, 245, 0.97);
            padding: 8px 12px 8px 8px;
            border-radius: 24px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            max-width: 200px;
          ">
            <img 
              src="${logoSrc}" 
              alt="${village.name}" 
              style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; flex-shrink: 0;"
              onerror="this.onerror=null; this.src='/placeholder.svg';"
            />
            <div style="display: flex; flex-direction: column; line-height: 1.2; min-width: 0; overflow: hidden;">
              <span style="font-weight: 600; font-size: 12px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${village.name}</span>
              <span style="font-size: 10px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${truncatedLocation}</span>
            </div>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid rgba(250, 248, 245, 0.97);
            margin-top: -1px;
          "></div>
        </div>
      `;

      el.addEventListener("mouseenter", () => {
        el.style.zIndex = "1000";
        const pill = el.querySelector('.village-marker-pill') as HTMLElement;
        if (pill) {
          pill.style.transform = "scale(1.05)";
          pill.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
        }
      });

      el.addEventListener("mouseleave", () => {
        el.style.zIndex = String(10 + index);
        const pill = el.querySelector('.village-marker-pill') as HTMLElement;
        if (pill) {
          pill.style.transform = "scale(1)";
          pill.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
        }
      });

      el.addEventListener("click", () => {
        const route = getVillageRoute(village);
        navigate(route);
      });

      // Use 'bottom' anchor so the arrow tip points exactly at the coordinate
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat(village.center)
        .addTo(map.current!);

      clusterMarkersRef.current.set(village.id, marker);
    });
  }, [filteredVillages, navigate, getMarkerScale, isVillagePast]);

  // Create markers when filtered villages change
  useEffect(() => {
    if (mapReady) {
      createVillageMarkers();
    }
  }, [mapReady, filteredVillages, createVillageMarkers]);

  // Listen to zoom changes to scale markers
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;
    const onZoom = () => updateMarkerScales();
    m.on('zoom', onZoom);
    return () => { m.off('zoom', onZoom); };
  }, [mapReady, updateMarkerScales]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ touchAction: 'manipulation', overscrollBehavior: 'contain' }}>
      <div ref={mapContainer} className="h-full w-full" />

      {mapError && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-muted/20">
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]},${DEFAULT_ZOOM}/1280x800?access_token=${mapboxToken}`}
            alt="Map fallback"
            className="h-full w-full object-cover grayscale opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg shadow-sm border border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Interactive map unavailable (WebGL disabled)</p>
            </div>
          </div>
        </div>
      )}

      {villagesLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-body text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Header overlay */}
      <div className="absolute left-0 right-0 top-0 z-10 pointer-events-none bg-gradient-to-b from-background/90 via-background/60 to-transparent p-3 pb-12 sm:p-4 sm:pb-16 md:p-6 md:pb-20">
        <div className="flex items-start justify-between pointer-events-auto">
          <div className="flex flex-col gap-1 w-fit">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl md:text-3xl">
                Villedge
              </h1>
              <AddVillageForm onVillageAdded={() => window.location.reload()} />
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate("/admin")}
                  title="Admin"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="font-body text-xs text-muted-foreground sm:text-sm md:text-base">
              Explore communities around the world
            </p>
          </div>

          {/* User count badge + Showtime + Auth button */}
          <div className="flex items-center gap-2">
            <ManifestoDialog />
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full border border-border/50 shadow-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{userCount}</span>
            </div>
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Info sidebar - positioned above map markers and timeline */}
      <div className="absolute top-24 right-4 z-[100] hidden w-56 max-h-[320px] rounded-lg bg-card/95 p-3 shadow-card backdrop-blur-sm md:block lg:w-64">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              Villedge
            </h3>
            <p className="text-xs text-muted-foreground">Click on a village to explore</p>
          </div>
        </div>

        {/* Type Switcher */}
        <div className="mb-2">
          <ToggleGroup
            type="single"
            value={villageTypeFilter}
            onValueChange={(value) => value && setVillageTypeFilter(value as VillageType)}
            className="w-full"
          >
            <ToggleGroupItem value="popup" className="flex-1 gap-1 text-xs py-1.5">
              <Calendar className="h-3 w-3" />
              Popups
            </ToggleGroupItem>
            <ToggleGroupItem value="permanent" className="flex-1 gap-1 text-xs py-1.5">
              <Building2 className="h-3 w-3" />
              Permanent
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="overflow-y-auto max-h-[180px] space-y-1">
          {filteredVillages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No {villageTypeFilter} villages yet
            </p>
          ) : (
            filteredVillages.map((village) => (
              <button
                key={village.id}
                onClick={() => navigate(getVillageRoute(village))}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <img
                  src={village.logo_url || '/placeholder.svg'}
                  alt={village.name}
                  className="h-7 w-7 rounded object-cover flex-shrink-0"
                  onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{village.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate" title={village.location}>{village.location}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>


      {/* Timeline */}
      {timelineVillages.length > 0 && (
        <PopupTimeline
          villages={timelineVillages}
          activeVillage={activeVillage}
          isZoomedIn={false}
          onVillageClick={handleTimelineVillageClick}
        />
      )}

      {/* Mobile bottom bar */}
      {isMobile && (
        <div className="absolute bottom-2 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 sm:hidden">
          <ToggleGroup
            type="single"
            value={villageTypeFilter}
            onValueChange={(value) => value && setVillageTypeFilter(value as VillageType)}
            className="bg-card/95 backdrop-blur-sm rounded-full border border-border/50 shadow-lg px-1 py-1"
          >
            <ToggleGroupItem value="popup" className="gap-1 text-xs rounded-full px-3 py-1.5 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Popups
            </ToggleGroupItem>
            <ToggleGroupItem value="permanent" className="gap-1 text-xs rounded-full px-3 py-1.5 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Permanent
            </ToggleGroupItem>
          </ToggleGroup>

          <button
            onClick={() => isAuthenticated ? navigate("/profile") : navigate("/auth")}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg"
          >
            {isAuthenticated && profile?.avatar_url ? (
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {(profile.username || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

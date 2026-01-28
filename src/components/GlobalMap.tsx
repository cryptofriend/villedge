import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, Users, Settings, Calendar, Building2, Mic, Home } from "lucide-react";
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
  const [topLevelMode, setTopLevelMode] = useState<'villedge' | 'conferences'>('villedge');
  const [villageSubFilter, setVillageSubFilter] = useState<'popup' | 'permanent'>('popup');
  const [initialCenterSet, setInitialCenterSet] = useState(false);

  const isAdmin = user?.id ? ADMIN_USER_IDS.includes(user.id) : false;

  // Filter villages by type based on top-level mode
  const filteredVillages = useMemo(() => {
    if (topLevelMode === 'conferences') {
      return villages.filter(v => v.village_type === 'conference');
    }
    return villages.filter(v => v.village_type === villageSubFilter);
  }, [villages, topLevelMode, villageSubFilter]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

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

    if (m.isStyleLoaded()) {
      setMapReady(true);
    } else {
      m.once("load", () => {
        setMapReady(true);
      });
    }

    return () => {
      setMapReady(false);
      setInitialCenterSet(false);
      clusterMarkersRef.current.forEach((marker) => marker.remove());
      clusterMarkersRef.current.clear();
      m.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Center map on user's current village or active popup
  useEffect(() => {
    if (!map.current || !mapReady || initialCenterSet) return;
    
    if (currentVillage) {
      map.current.flyTo({
        center: currentVillage.center,
        zoom: 4,
        duration: 1500,
      });
      setInitialCenterSet(true);
    }
  }, [mapReady, currentVillage, initialCenterSet]);

  // Get village route slug - all villages use /:id format now
  const getVillageRoute = (village: Village | { id: string }) => {
    return `/${village.id}`;
  };

  // Transform villages for PopupTimeline format based on top-level mode
  const timelineVillages = useMemo(() => {
    const typeToShow = topLevelMode === 'conferences' ? 'conference' : 'popup';
    return villages
      .filter(v => v.village_type === typeToShow)
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
  }, [villages, topLevelMode]);

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

  // Create village markers
  const createVillageMarkers = useCallback(() => {
    if (!map.current || filteredVillages.length === 0) return;
    
    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();

    filteredVillages.forEach((village, index) => {
      const el = document.createElement("div");
      el.className = "village-marker";
      el.style.zIndex = String(10 + index);
      el.style.position = "relative";
      
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
  }, [filteredVillages, navigate]);

  // Create markers when filtered villages change
  useEffect(() => {
    if (mapReady) {
      createVillageMarkers();
    }
  }, [mapReady, filteredVillages, createVillageMarkers]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ touchAction: 'manipulation', overscrollBehavior: 'contain' }}>
      <div ref={mapContainer} className="h-full w-full" />
      
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
          
          {/* User count badge + Auth button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full border border-border/50 shadow-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{userCount}</span>
            </div>
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Info sidebar - positioned above map markers and timeline */}
      <div className="absolute top-24 right-4 z-[100] hidden w-56 max-h-[350px] rounded-lg bg-card/95 p-3 shadow-card backdrop-blur-sm md:block lg:w-64">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {topLevelMode === 'villedge' ? 'Villedge' : 'Conferences'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {topLevelMode === 'villedge' ? 'Click on a village to explore' : 'Ethereum community events'}
            </p>
          </div>
        </div>
        
        {/* Top-level Mode Switcher: Villedge vs Conferences */}
        <div className="mb-2">
          <ToggleGroup 
            type="single" 
            value={topLevelMode} 
            onValueChange={(value) => value && setTopLevelMode(value as 'villedge' | 'conferences')}
            className="w-full grid grid-cols-2"
          >
            <ToggleGroupItem value="villedge" className="gap-1 text-xs py-1.5">
              <Home className="h-3 w-3" />
              Villedge
            </ToggleGroupItem>
            <ToggleGroupItem value="conferences" className="gap-1 text-xs py-1.5">
              <Mic className="h-3 w-3" />
              Conferences
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Sub-filter for Villedge mode: Popups vs Permanent */}
        {topLevelMode === 'villedge' && (
          <div className="mb-2">
            <ToggleGroup 
              type="single" 
              value={villageSubFilter} 
              onValueChange={(value) => value && setVillageSubFilter(value as 'popup' | 'permanent')}
              className="w-full grid grid-cols-2"
            >
              <ToggleGroupItem value="popup" className="gap-1 text-xs py-1.5">
                <Calendar className="h-3 w-3" />
                Popups
              </ToggleGroupItem>
              <ToggleGroupItem value="permanent" className="gap-1 text-xs py-1.5">
                <Building2 className="h-3 w-3" />
                Permanent
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        <div className="overflow-y-auto max-h-[160px] space-y-1">
          {filteredVillages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {topLevelMode === 'conferences' ? 'No conferences yet' : `No ${villageSubFilter} villages yet`}
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
    </div>
  );
};

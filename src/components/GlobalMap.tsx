import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, Users, Settings, Calendar, Building2 } from "lucide-react";
import { useVillages, Village, VillageType } from "@/hooks/useVillages";
import { useNavigate } from "react-router-dom";
import { AddVillageForm } from "@/components/villages/AddVillageForm";
import { AuthButton } from "@/components/AuthButton";
import { PopupTimeline } from "@/components/PopupTimeline";
import { useUserCount } from "@/hooks/useUserCount";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ADMIN_USER_IDS = [
  "9807c494-ba07-4438-9a89-07ac13334e78", // dev
  "b015441b-3bb4-4150-94e6-d8be048035bb", // booga
];
const DEFAULT_CENTER: [number, number] = [50, 20];
const DEFAULT_ZOOM = 2;

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
  const [mapReady, setMapReady] = useState(false);
  const [villageTypeFilter, setVillageTypeFilter] = useState<VillageType>("popup");

  const isAdmin = user?.id ? ADMIN_USER_IDS.includes(user.id) : false;

  // Filter villages by type
  const filteredVillages = useMemo(() => {
    return villages.filter(v => v.village_type === villageTypeFilter);
  }, [villages, villageTypeFilter]);

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
      clusterMarkersRef.current.forEach((marker) => marker.remove());
      clusterMarkersRef.current.clear();
      m.remove();
      map.current = null;
    };
  }, [mapboxToken]);

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

  // Create village markers
  const createVillageMarkers = useCallback(() => {
    if (!map.current || villages.length === 0) return;
    
    clusterMarkersRef.current.forEach((marker) => marker.remove());
    clusterMarkersRef.current.clear();
    
    // Anchor the marker to the *logo center* (not the pill's left edge) so text width
    // changes/zoom transforms don't make the marker appear to shift.
    // left padding (8) + half logo (16) = 24px
    const ANCHOR_TO_LOGO_CENTER_PX = 24;

    villages.forEach((village, index) => {
      const el = document.createElement("div");
      el.className = "village-marker";
      el.style.zIndex = String(10 + index);
      el.style.position = "relative";
      
      const truncatedLocation = truncateText(village.location, 20);
      const logoSrc = village.logo_url || '/placeholder.svg';
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
          max-width: 200px;
          transform-origin: left center;
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
      `;

      el.addEventListener("mouseenter", () => {
        el.style.zIndex = "1000";
        const container = el.firstElementChild as HTMLElement;
        if (container) {
          container.style.transform = "scale(1.05)";
          container.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
        }
      });

      el.addEventListener("mouseleave", () => {
        el.style.zIndex = String(10 + index);
        const container = el.firstElementChild as HTMLElement;
        if (container) {
          container.style.transform = "scale(1)";
          container.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
        }
      });

      el.addEventListener("click", () => {
        const route = getVillageRoute(village);
        navigate(route);
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'left',
        // shift left so the anchor point sits at the logo center
        offset: [-ANCHOR_TO_LOGO_CENTER_PX, 0],
      })
        .setLngLat(village.center)
        .addTo(map.current!);

      clusterMarkersRef.current.set(village.id, marker);
    });
  }, [villages, navigate]);

  // Create markers when villages load
  useEffect(() => {
    if (mapReady && villages.length > 0) {
      createVillageMarkers();
    }
  }, [mapReady, villages, createVillageMarkers]);

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
      <div className="absolute top-24 right-4 z-[100] hidden w-64 max-h-[calc(100%-180px)] rounded-lg bg-card/95 p-3 shadow-card backdrop-blur-sm md:block lg:w-72 lg:p-4">
        <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              Villedge
            </h3>
            <p className="text-xs text-muted-foreground">Click on a village to explore</p>
          </div>
        </div>
        
        {/* Type Switcher */}
        <div className="mb-3">
          <ToggleGroup 
            type="single" 
            value={villageTypeFilter} 
            onValueChange={(value) => value && setVillageTypeFilter(value as VillageType)}
            className="w-full"
          >
            <ToggleGroupItem value="popup" className="flex-1 gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Popups
            </ToggleGroupItem>
            <ToggleGroupItem value="permanent" className="flex-1 gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Permanent
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100%-120px)]">
          {filteredVillages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No {villageTypeFilter} villages yet
            </p>
          ) : (
            filteredVillages.map((village) => (
              <button
                key={village.id}
                onClick={() => navigate(getVillageRoute(village))}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <img 
                  src={village.logo_url || '/placeholder.svg'} 
                  alt={village.name} 
                  className="h-8 w-8 rounded object-cover"
                  onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{village.name}</p>
                  <p className="text-xs text-muted-foreground truncate" title={village.location}>{village.location}</p>
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

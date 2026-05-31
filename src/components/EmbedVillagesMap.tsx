import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, ExternalLink } from "lucide-react";
import { useVillages, Village } from "@/hooks/useVillages";

const WORLD_CENTER: [number, number] = [10, 20];
const WORLD_ZOOM = 1.2;

export type EmbedTheme = "default" | "blue" | "dark" | "ocean" | "terracotta";

interface ThemeConfig {
  accent: string; // hex
  accentSoft: string; // rgba/hex with low alpha
  mapStyle: string;
  badgeBg: string;
  badgeText: string;
  surface: string; // bubble background
}

const THEMES: Record<EmbedTheme, ThemeConfig> = {
  default: {
    accent: "#466946",
    accentSoft: "rgba(70,105,70,0.12)",
    mapStyle: "mapbox://styles/mapbox/light-v11",
    badgeBg: "rgba(250,248,245,0.97)",
    badgeText: "#333",
    surface: "rgba(250,248,245,0.97)",
  },
  blue: {
    accent: "#3B82F6",
    accentSoft: "rgba(59,130,246,0.14)",
    mapStyle: "mapbox://styles/mapbox/light-v11",
    badgeBg: "rgba(255,255,255,0.97)",
    badgeText: "#1e293b",
    surface: "rgba(255,255,255,0.97)",
  },
  dark: {
    accent: "#60A5FA",
    accentSoft: "rgba(96,165,250,0.18)",
    mapStyle: "mapbox://styles/mapbox/dark-v11",
    badgeBg: "rgba(20,25,35,0.95)",
    badgeText: "#f1f5f9",
    surface: "rgba(20,25,35,0.95)",
  },
  ocean: {
    accent: "#0c8a9e",
    accentSoft: "rgba(12,138,158,0.14)",
    mapStyle: "mapbox://styles/mapbox/light-v11",
    badgeBg: "rgba(255,255,255,0.97)",
    badgeText: "#0c2340",
    surface: "rgba(255,255,255,0.97)",
  },
  terracotta: {
    accent: "#bf6e4e",
    accentSoft: "rgba(191,110,78,0.14)",
    mapStyle: "mapbox://styles/mapbox/light-v11",
    badgeBg: "rgba(250,248,245,0.97)",
    badgeText: "#3a2418",
    surface: "rgba(250,248,245,0.97)",
  },
};

interface EmbedVillagesMapProps {
  mapboxToken: string;
  /** Optional village id/slug to center the map on */
  centerVillageId?: string;
  /** Zoom override when centering on a village */
  centerZoom?: number;
  /** Visual theme for the embed */
  theme?: EmbedTheme;
}

export const EmbedVillagesMap = ({
  mapboxToken,
  centerVillageId,
  centerZoom,
  theme = "default",
}: EmbedVillagesMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const t = THEMES[theme] ?? THEMES.default;

  const { villages, loading } = useVillages();
  const [mapReady, setMapReady] = useState(false);
  const [centered, setCentered] = useState(false);

  const popupVillages = useMemo(
    () => villages.filter((v) => v.village_type === "popup"),
    [villages],
  );

  // Init map — default view shows the whole planet
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: t.mapStyle,
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      attributionControl: false,
      projection: { name: "mercator" },
    });
    map.current = m;
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    m.once("load", () => setMapReady(true));
    return () => {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current.clear();
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, t.mapStyle]);

  // Center on requested village ONLY if explicitly provided
  useEffect(() => {
    if (!map.current || !mapReady || centered) return;
    if (!centerVillageId) return;
    const target = popupVillages.find((v) => v.id === centerVillageId);
    if (target) {
      map.current.flyTo({
        center: target.center,
        zoom: centerZoom ?? 6,
        duration: 1200,
      });
      setCentered(true);
    }
  }, [mapReady, popupVillages, centerVillageId, centerZoom, centered]);

  // Markers
  const renderMarkers = useCallback(() => {
    if (!map.current) return;
    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current.clear();

    popupVillages.forEach((village: Village, index) => {
      const isCenter = village.id === centerVillageId;
      const el = document.createElement("div");
      el.style.zIndex = isCenter ? "900" : String(10 + index);
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.2s ease;">
          <div style="
            display:flex;align-items:center;gap:6px;
            background:${isCenter ? t.surface : t.badgeBg};
            padding:6px 10px 6px 6px;border-radius:20px;
            border:${isCenter ? `2px solid ${t.accent}` : "0"};
            box-shadow:${isCenter ? `0 6px 22px ${t.accent}59` : "0 3px 12px rgba(0,0,0,0.15)"};
            max-width:180px;
          ">
            <img src="${village.logo_url || "/placeholder.svg"}" alt="${village.name}"
              style="width:24px;height:24px;border-radius:6px;object-fit:cover;flex-shrink:0;"
              onerror="this.onerror=null;this.src='/placeholder.svg';" />
            <div style="display:flex;flex-direction:column;line-height:1.2;min-width:0;overflow:hidden;">
              <span style="font-weight:600;font-size:11px;color:${t.badgeText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${village.name}</span>
              <span style="font-size:9px;color:${t.badgeText};opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${village.location || ""}</span>
            </div>
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${isCenter ? t.accent : t.badgeBg};margin-top:-1px;"></div>
        </div>
      `;
      el.addEventListener("click", () => {
        window.open(`${window.location.origin}/${village.id}`, "_blank", "noopener");
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(village.center)
        .addTo(map.current!);
      markersRef.current.set(village.id, marker);
    });
  }, [popupVillages, centerVillageId, t]);

  useEffect(() => {
    if (mapReady) renderMarkers();
  }, [mapReady, renderMarkers]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={mapContainer} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: t.accent }} />
        </div>
      )}

      {/* Header bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-background/95 to-transparent p-3">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-base font-semibold text-foreground hover:underline"
          >
            Villedge
          </a>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium hover:opacity-80"
            style={{ background: t.accentSoft, color: t.accent }}
          >
            Explore all
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

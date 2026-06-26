import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, ExternalLink } from "lucide-react";
import { useFestivals, Festival } from "@/hooks/useFestivals";

const WORLD_CENTER: [number, number] = [10, 20];
const WORLD_ZOOM = 1.2;

export type FestivalsTheme = "default" | "blue" | "dark" | "ocean" | "terracotta";

interface ThemeConfig {
  accent: string;
  accentSoft: string;
  mapStyle: string;
  badgeBg: string;
  badgeText: string;
  surface: string;
}

const THEMES: Record<FestivalsTheme, ThemeConfig> = {
  default: {
    accent: "#7c3aed",
    accentSoft: "rgba(124,58,237,0.14)",
    mapStyle: "mapbox://styles/mapbox/light-v11",
    badgeBg: "rgba(255,255,255,0.97)",
    badgeText: "#1e1b2e",
    surface: "rgba(255,255,255,0.97)",
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
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.2)",
    mapStyle: "mapbox://styles/mapbox/dark-v11",
    badgeBg: "rgba(20,20,30,0.95)",
    badgeText: "#f1f5f9",
    surface: "rgba(20,20,30,0.95)",
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

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start) return "";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
};

interface FestivalsMapProps {
  mapboxToken: string;
  theme?: FestivalsTheme;
  onFestivalClick?: (f: Festival) => void;
}

export const FestivalsMap = ({ mapboxToken, theme = "default", onFestivalClick }: FestivalsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const t = THEMES[theme] ?? THEMES.default;
  const { festivals, loading } = useFestivals();

  const [mapReady, setMapReady] = useState(false);

  const validFestivals = useMemo(
    () =>
      festivals.filter(
        (f) => Number.isFinite(f.center[0]) && Number.isFinite(f.center[1]),
      ),
    [festivals],
  );

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

  const renderMarkers = useCallback(() => {
    if (!map.current) return;
    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current.clear();

    validFestivals.forEach((f: Festival, index) => {
      const el = document.createElement("div");
      el.style.zIndex = String(10 + index);
      const dates = formatDateRange(f.start_date, f.end_date);
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.2s ease;">
          <div style="
            display:flex;align-items:center;gap:6px;
            background:${t.badgeBg};
            padding:6px 10px 6px 6px;border-radius:20px;
            box-shadow:0 3px 12px rgba(0,0,0,0.15);
            max-width:200px;
          ">
            <img src="${f.logo_url || "/placeholder.svg"}" alt="${f.name}"
              style="width:24px;height:24px;border-radius:6px;object-fit:cover;flex-shrink:0;"
              onerror="this.onerror=null;this.src='/placeholder.svg';" />
            <div style="display:flex;flex-direction:column;line-height:1.2;min-width:0;overflow:hidden;">
              <span style="font-weight:600;font-size:11px;color:${t.badgeText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</span>
              <span style="font-size:9px;color:${t.badgeText};opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dates}${dates && (f.city || f.country) ? " · " : ""}${f.city || f.country || ""}</span>
            </div>
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${t.badgeBg};margin-top:-1px;"></div>
        </div>
      `;
      el.addEventListener("click", () => {
        if (onFestivalClick) {
          onFestivalClick(f);
        } else if (f.website_url) {
          window.open(f.website_url, "_blank", "noopener");
        }
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(f.center)
        .addTo(map.current!);
      markersRef.current.set(f.id, marker);
    });
  }, [validFestivals, t, onFestivalClick]);

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

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-background/95 to-transparent p-3">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <a
            href="/"
            className="font-display text-base font-semibold text-foreground hover:underline"
          >
            Villedge · Festivals
          </a>
          <a
            href="/"
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium hover:opacity-80"
            style={{ background: t.accentSoft, color: t.accent }}
          >
            Villages map
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

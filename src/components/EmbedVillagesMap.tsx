import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, ExternalLink } from "lucide-react";
import { useVillages, Village } from "@/hooks/useVillages";

const DEFAULT_CENTER: [number, number] = [106.7358675, 10.8056129];
const DEFAULT_ZOOM = 4;

interface EmbedVillagesMapProps {
  mapboxToken: string;
  /** Optional village id/slug to center the map on */
  centerVillageId?: string;
  /** Zoom override when centering on a village */
  centerZoom?: number;
}

export const EmbedVillagesMap = ({
  mapboxToken,
  centerVillageId,
  centerZoom = 6,
}: EmbedVillagesMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const { villages, loading } = useVillages();
  const [mapReady, setMapReady] = useState(false);
  const [centered, setCentered] = useState(false);

  const popupVillages = useMemo(
    () => villages.filter((v) => v.village_type === "popup"),
    [villages],
  );

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
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
  }, [mapboxToken]);

  // Center on requested village
  useEffect(() => {
    if (!map.current || !mapReady || centered || popupVillages.length === 0) return;
    const target = centerVillageId
      ? popupVillages.find((v) => v.id === centerVillageId)
      : popupVillages[0];
    if (target) {
      map.current.flyTo({
        center: target.center,
        zoom: centerZoom,
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
            background:${isCenter ? "hsl(var(--background))" : "rgba(250,248,245,0.97)"};
            padding:6px 10px 6px 6px;border-radius:20px;
            border:${isCenter ? "2px solid hsl(var(--primary))" : "0"};
            box-shadow:${isCenter ? "0 6px 22px hsl(var(--primary) / 0.35)" : "0 3px 12px rgba(0,0,0,0.15)"};
            max-width:180px;
          ">
            <img src="${village.logo_url || "/placeholder.svg"}" alt="${village.name}"
              style="width:24px;height:24px;border-radius:6px;object-fit:cover;flex-shrink:0;"
              onerror="this.onerror=null;this.src='/placeholder.svg';" />
            <div style="display:flex;flex-direction:column;line-height:1.2;min-width:0;overflow:hidden;">
              <span style="font-weight:600;font-size:11px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${village.name}</span>
              <span style="font-size:9px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${village.location || ""}</span>
            </div>
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${isCenter ? "hsl(var(--primary))" : "rgba(250,248,245,0.97)"};margin-top:-1px;"></div>
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
  }, [popupVillages, centerVillageId]);

  useEffect(() => {
    if (mapReady) renderMarkers();
  }, [mapReady, renderMarkers]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={mapContainer} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Explore all
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

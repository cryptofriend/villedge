import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import { AuthButton } from "@/components/AuthButton";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";
const DEFAULT_CENTER: [number, number] = [30, 25];
const DEFAULT_ZOOM = 2;

const Home = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const m = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        interactive: false,
      });

      map.current = m;

      m.once("load", () => setMapReady(true));
    } catch (e) {
      console.error("Home map init error", e);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <main className="relative w-screen overflow-hidden" style={{ height: "var(--viewport-height, 100dvh)" }}>
      {/* Background map */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />

      {/* Auth button */}
      <div className="absolute top-4 right-4 z-20">
        <AuthButton />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-7xl text-center leading-tight">
          THE FUTURE
          <br />
          OF LIVING
        </h1>

        <p className="mt-4 max-w-md text-center text-sm text-muted-foreground sm:text-base">
          Explore popup villages and residencies around the world
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <button
            onClick={() => navigate("/villages")}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 px-10 py-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-card/95"
          >
            <span className="block font-display text-lg font-semibold text-foreground sm:text-xl">
              Villages
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Popup communities & permanent hubs
            </span>
          </button>

          <button
            onClick={() => navigate("/residency")}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 px-10 py-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-card/95"
          >
            <span className="block font-display text-lg font-semibold text-foreground sm:text-xl">
              Residency
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Long-term living & co-living spaces
            </span>
          </button>
        </div>
      </div>
    </main>
  );
};

export default Home;

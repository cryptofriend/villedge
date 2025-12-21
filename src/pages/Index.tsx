import { useState } from "react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import muiNeBeach from "@/assets/mui-ne-beach.jpg";

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  const handleSubmitToken = () => {
    if (tokenInput.trim()) {
      setMapboxToken(tokenInput.trim());
      setIsMapReady(true);
    }
  };

  if (!isMapReady) {
    return (
      <div className="relative min-h-screen bg-background paper-texture">
        {/* Hero background */}
        <div className="absolute inset-0 z-0">
          <img
            src={muiNeBeach}
            alt="Mui Ne beach with kitesurfers"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            {/* Logo/Title */}
            <div className="mb-8 animate-fade-in-up">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-elevated">
                <MapPin className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
                Popup Village
              </h1>
              <p className="mt-2 font-body text-lg text-muted-foreground">
                Mũi Né, Vietnam
              </p>
            </div>

            {/* Event info */}
            <div
              className="mb-8 animate-fade-in-up rounded-xl bg-card/80 p-6 shadow-card backdrop-blur-sm"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    When
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-foreground">
                    Jan 15 – Feb 15, 2026
                  </p>
                </div>
                <div className="hidden h-12 w-px bg-border sm:block" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Where
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-foreground">
                    Mũi Né Beach
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                One of the world's great kitesurf spots · 2-3h from HCMC
              </p>
            </div>

            {/* Token input */}
            <div
              className="animate-fade-in-up rounded-xl bg-card/80 p-6 shadow-card backdrop-blur-sm"
              style={{ animationDelay: "0.2s" }}
            >
              <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                Explore the Map
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Enter your Mapbox public token to view the interactive map.
                Get one free at{" "}
                <a
                  href="https://mapbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  mapbox.com
                </a>
              </p>
              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="pk.eyJ1Ijoi..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="bg-background/50"
                />
                <Button
                  onClick={handleSubmitToken}
                  disabled={!tokenInput.trim()}
                  className="w-full"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Open Interactive Map
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <InteractiveMap mapboxToken={mapboxToken} />
    </main>
  );
};

export default Index;

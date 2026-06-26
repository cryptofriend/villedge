import { useState } from "react";
import { FestivalsMap } from "@/components/FestivalsMap";
import { FestivalsGantt } from "@/components/FestivalsGantt";
import { FestivalsPopupTimeline } from "@/components/FestivalsPopupTimeline";
import { FestivalCard } from "@/components/FestivalCard";
import { SEO } from "@/components/SEO";
import { useFestivals, type Festival } from "@/hooks/useFestivals";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Festivals = () => {
  const { festivals } = useFestivals();
  const [activeFestival, setActiveFestival] = useState<Festival | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

  const openFestival = (f: Festival) => {
    setActiveFestival(f);
    setCardOpen(true);
  };

  return (
    <>
      <SEO
        title="Music Festivals Map — Discover festivals worldwide | Villedge"
        description="Explore a live world map of music festivals. Discover lineups, dates and locations of festivals happening around the globe."
        path="/festivals"
      />
      <main className="w-screen min-h-[100dvh] overflow-x-hidden bg-background flex flex-col">
        <section
          className="relative w-full"
          style={{ height: "var(--viewport-height, 100dvh)" }}
        >
          <FestivalsMap mapboxToken={MAPBOX_TOKEN} onFestivalClick={openFestival} />
          <FestivalsPopupTimeline
            festivals={festivals}
            activeId={activeFestival?.id ?? null}
            onFestivalClick={openFestival}
          />
        </section>
        <section className="w-full border-t border-border bg-card">
          <div className="px-4 sm:px-6 py-5">
            <h2 className="text-lg font-semibold">Festival timeline</h2>
            <p className="text-sm text-muted-foreground">
              Festivals plotted on their exact dates.
            </p>
          </div>
          <FestivalsGantt />
        </section>
      </main>

      <FestivalCard
        festival={activeFestival}
        open={cardOpen}
        onOpenChange={setCardOpen}
      />
    </>
  );
};

export default Festivals;

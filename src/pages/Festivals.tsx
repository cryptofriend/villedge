import { FestivalsMap } from "@/components/FestivalsMap";
import { SEO } from "@/components/SEO";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Festivals = () => {
  return (
    <>
      <SEO
        title="Music Festivals Map — Discover festivals worldwide | Villedge"
        description="Explore a live world map of music festivals. Discover lineups, dates and locations of festivals happening around the globe."
        path="/festivals"
      />
      <main
        className="w-screen overflow-hidden bg-background"
        style={{ height: "var(--viewport-height, 100dvh)" }}
      >
        <FestivalsMap mapboxToken={MAPBOX_TOKEN} />
      </main>
    </>
  );
};

export default Festivals;

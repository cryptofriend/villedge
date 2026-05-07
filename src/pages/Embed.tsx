import { useSearchParams } from "react-router-dom";
import { EmbedMap } from "@/components/EmbedMap";
import { EmbedVillagesMap } from "@/components/EmbedVillagesMap";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Embed = () => {
  const [params] = useSearchParams();
  // mode=spots renders the legacy single-village spots map; default = global popup villages
  const mode = params.get("mode") || "villages";
  const centerVillage = params.get("village") || undefined;
  const zoomParam = params.get("zoom");
  const centerZoom = zoomParam ? Number(zoomParam) : undefined;

  return (
    <main
      className="w-screen overflow-hidden bg-background"
      style={{ height: "var(--viewport-height, 100dvh)" }}
    >
      {mode === "spots" ? (
        <EmbedMap mapboxToken={MAPBOX_TOKEN} />
      ) : (
        <EmbedVillagesMap
          mapboxToken={MAPBOX_TOKEN}
          centerVillageId={centerVillage}
          centerZoom={centerZoom}
        />
      )}
    </main>
  );
};

export default Embed;

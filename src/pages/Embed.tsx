import { EmbedMap } from "@/components/EmbedMap";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Embed = () => {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <EmbedMap mapboxToken={MAPBOX_TOKEN} />
    </main>
  );
};

export default Embed;

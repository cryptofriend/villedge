import { GlobalMap } from "@/components/GlobalMap";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Residency = () => {
  return (
    <main className="w-screen overflow-hidden bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
      <GlobalMap mapboxToken={MAPBOX_TOKEN} defaultVillageType="residency" />
    </main>
  );
};

export default Residency;

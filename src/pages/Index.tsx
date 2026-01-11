import { InteractiveMap } from "@/components/InteractiveMap";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Index = () => {
  return (
    <main className="w-screen overflow-hidden bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
      <InteractiveMap mapboxToken={MAPBOX_TOKEN} />
    </main>
  );
};

export default Index;

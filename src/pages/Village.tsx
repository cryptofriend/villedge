import { useParams, Navigate, useLocation } from "react-router-dom";
import { InteractiveMap } from "@/components/InteractiveMap";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

// Map short routes to village IDs
const PATH_TO_VILLAGE_ID: Record<string, string> = {
  "/por": "proof-of-retreat",
};

const Village = () => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const location = useLocation();
  
  // First check if this is a known short path
  let villageId = PATH_TO_VILLAGE_ID[location.pathname];
  
  // Otherwise use the URL param
  if (!villageId && villageSlug) {
    villageId = villageSlug;
  }
  
  if (!villageId) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="w-screen overflow-hidden bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
      <InteractiveMap mapboxToken={MAPBOX_TOKEN} initialVillageId={villageId} />
    </main>
  );
};

export default Village;

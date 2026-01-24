import { useParams, Navigate, useLocation } from "react-router-dom";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

// Map short routes to village IDs
const PATH_TO_VILLAGE_ID: Record<string, string> = {
  "/por": "proof-of-retreat",
};

const Village = () => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  
  // First check if this is a known short path
  let villageId = PATH_TO_VILLAGE_ID[location.pathname];
  
  // Otherwise use the URL param
  if (!villageId && villageSlug) {
    villageId = villageSlug;
  }
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <main className="w-screen flex items-center justify-center bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  
  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
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

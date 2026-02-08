import { useParams, Navigate, useLocation } from "react-router-dom";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useAuth } from "@/hooks/useAuth";
import { AuthDialog } from "@/components/AuthDialog";
import { Loader2 } from "lucide-react";
import { useState, useMemo } from "react";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

type CategoryType = "map" | "residents" | "scenius" | "events";

const Village = () => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(true);
  
  // Use the URL param directly as the village ID
  const villageId = villageSlug;
  
  // Extract category from the URL path (e.g., /proof-of-retreat/residents -> residents)
  const initialCategory = useMemo<CategoryType>(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const validCategories: CategoryType[] = ["map", "residents", "scenius", "events"];
    
    // If path has more than one part, check if last part is a valid category
    if (pathParts.length > 1) {
      const lastPart = pathParts[pathParts.length - 1] as CategoryType;
      if (validCategories.includes(lastPart)) {
        return lastPart;
      }
    }
    return "map";
  }, [location.pathname]);
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <main className="w-screen flex items-center justify-center bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  
  if (!villageId) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="w-screen overflow-hidden bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
      <InteractiveMap 
        mapboxToken={MAPBOX_TOKEN} 
        initialVillageId={villageId} 
        initialCategory={initialCategory}
      />
      
      {/* Auth popup for unauthenticated users */}
      {!isAuthenticated && (
        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
        />
      )}
    </main>
  );
};

export default Village;

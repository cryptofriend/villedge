import { useParams, Navigate, useLocation } from "react-router-dom";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useAuth } from "@/hooks/useAuth";
import { useVillages } from "@/hooks/useVillages";
import { AuthDialog } from "@/components/AuthDialog";
import { VillageLanding } from "@/components/villages/landing/VillageLanding";
import { Loader2 } from "lucide-react";
import { useState, useMemo } from "react";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

type CategoryType = "map" | "about" | "residents" | "scenius" | "events";

interface VillageProps {
  overrideVillageSlug?: string;
}

const Village = ({ overrideVillageSlug }: VillageProps) => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { villages, loading: villagesLoading } = useVillages();
  const [showAuthDialog, setShowAuthDialog] = useState(true);

  const villageId = overrideVillageSlug || villageSlug;

  // Determine if this is the root landing (no sub-route) or a sub-view
  const { isLandingRoot, initialCategory } = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const validCategories: CategoryType[] = ["map", "about", "residents", "scenius", "events"];
    const lastPart = pathParts[pathParts.length - 1];

    // Custom-domain landing root: pathname is "/"
    // Slug landing root: pathname is "/:slug" (only one part)
    const isRoot =
      (overrideVillageSlug && pathParts.length === 0) ||
      (!overrideVillageSlug && pathParts.length === 1);

    const cat = validCategories.includes(lastPart as CategoryType)
      ? (lastPart as CategoryType)
      : "map";

    return { isLandingRoot: !!isRoot, initialCategory: cat };
  }, [location.pathname, overrideVillageSlug]);

  if (loading || villagesLoading) {
    return (
      <main className="w-screen flex items-center justify-center bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!villageId) {
    return <Navigate to="/" replace />;
  }

  // Public landing page at /:slug (no sub-route)
  if (isLandingRoot) {
    const village = villages.find((v) => v.id === villageId);
    if (!village) {
      return (
        <main className="w-screen flex items-center justify-center bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
          <p className="text-muted-foreground">Village not found</p>
        </main>
      );
    }
    return (
      <main className="min-h-screen w-full overflow-x-hidden bg-background">
        <VillageLanding village={village} />
      </main>
    );
  }

  return (
    <main className="w-screen overflow-hidden bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
      <InteractiveMap
        mapboxToken={MAPBOX_TOKEN}
        initialVillageId={villageId}
        initialCategory={initialCategory}
      />

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

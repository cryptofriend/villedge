import { useState } from "react";
import { Eye, Loader2, Check, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import { useRevealRequests } from "@/hooks/useRevealRequests";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileConnectionActionsProps {
  targetUserId: string;
  isAnon: boolean;
  className?: string;
}

export const ProfileConnectionActions = ({
  targetUserId,
  isAnon,
  className,
}: ProfileConnectionActionsProps) => {
  const { isMutualConnection, follow, loading: connectionLoading } = useConnections(targetUserId);
  const { pendingRequest, hasApprovedAccess, requestReveal, loading: revealLoading } = useRevealRequests(targetUserId);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRequestReveal = async () => {
    setActionLoading(true);
    
    // First follow the user (required for mutual connection)
    const followSuccess = await follow();
    if (!followSuccess) {
      toast.error("Failed to send request");
      setActionLoading(false);
      return;
    }
    
    // Then send reveal request
    const revealSuccess = await requestReveal();
    if (revealSuccess) {
      toast.success("Reveal request sent");
    } else {
      toast.error("Failed to send reveal request");
    }
    setActionLoading(false);
  };

  if (connectionLoading || revealLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If already has access (mutual connection or approved reveal), show connected state
  if (isMutualConnection || hasApprovedAccess) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button variant="secondary" size="sm" disabled className="gap-1.5">
          <UserCheck className="h-4 w-4" />
          Connected
        </Button>
      </div>
    );
  }

  // If profile is not anon, no action needed
  if (!isAnon) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {pendingRequest ? (
        <Button variant="secondary" size="sm" disabled className="gap-1.5">
          <Check className="h-4 w-4" />
          Request Sent
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={handleRequestReveal}
          disabled={actionLoading}
          className="gap-1.5"
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Request Reveal
        </Button>
      )}
    </div>
  );
};


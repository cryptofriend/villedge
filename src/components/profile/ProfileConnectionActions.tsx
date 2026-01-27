import { useState } from "react";
import { UserPlus, UserMinus, Eye, Loader2, Check, X } from "lucide-react";
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
  const { isFollowing, isMutualConnection, follow, unfollow, loading: connectionLoading } = useConnections(targetUserId);
  const { pendingRequest, hasApprovedAccess, requestReveal, loading: revealLoading } = useRevealRequests(targetUserId);
  const [actionLoading, setActionLoading] = useState(false);

  const handleFollow = async () => {
    setActionLoading(true);
    const success = await follow();
    if (success) {
      toast.success("Following user");
    } else {
      toast.error("Failed to follow user");
    }
    setActionLoading(false);
  };

  const handleUnfollow = async () => {
    setActionLoading(true);
    const success = await unfollow();
    if (success) {
      toast.success("Unfollowed user");
    } else {
      toast.error("Failed to unfollow user");
    }
    setActionLoading(false);
  };

  const handleRequestReveal = async () => {
    setActionLoading(true);
    const success = await requestReveal();
    if (success) {
      toast.success("Reveal request sent");
    } else {
      toast.error("Failed to send request");
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Follow/Unfollow button */}
      {isFollowing ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnfollow}
          disabled={actionLoading}
          className="gap-1.5"
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserMinus className="h-4 w-4" />
          )}
          {isMutualConnection ? "Connected" : "Following"}
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={handleFollow}
          disabled={actionLoading}
          className="gap-1.5"
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Follow
        </Button>
      )}

      {/* Request reveal button (only show if profile is anon and no mutual connection) */}
      {isAnon && !isMutualConnection && !hasApprovedAccess && (
        <>
          {pendingRequest ? (
            <Button variant="secondary" size="sm" disabled className="gap-1.5">
              <Check className="h-4 w-4" />
              Request Sent
            </Button>
          ) : (
            <Button
              variant="outline"
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
        </>
      )}
    </div>
  );
};

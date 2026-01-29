import { useState } from "react";
import { Link2, Loader2, Check, UserCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnectionRequests } from "@/hooks/useConnectionRequests";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileConnectionActionsProps {
  targetUserId: string;
  className?: string;
}

export const ProfileConnectionActions = ({
  targetUserId,
  className,
}: ProfileConnectionActionsProps) => {
  const { 
    isConnected, 
    pendingRequest, 
    sendConnectionRequest, 
    disconnect,
    loading 
  } = useConnectionRequests(targetUserId);
  const [actionLoading, setActionLoading] = useState(false);

  const handleConnect = async () => {
    setActionLoading(true);
    const success = await sendConnectionRequest();
    if (success) {
      toast.success("Connection request sent");
    } else {
      toast.error("Failed to send request");
    }
    setActionLoading(false);
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    const success = await disconnect();
    if (success) {
      toast.success("Disconnected");
    } else {
      toast.error("Failed to disconnect");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already connected - show connected state with disconnect option
  if (isConnected) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button 
          variant="secondary" 
          size="sm" 
          className="gap-1.5"
          onClick={handleDisconnect}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
          Connected
        </Button>
      </div>
    );
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
          onClick={handleConnect}
          disabled={actionLoading}
          className="gap-1.5"
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Connect
        </Button>
      )}
    </div>
  );
};

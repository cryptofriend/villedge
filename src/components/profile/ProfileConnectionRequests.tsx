import { useState } from "react";
import { Check, X, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConnectionRequests, ConnectionRequest } from "@/hooks/useConnectionRequests";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export const ProfileConnectionRequests = () => {
  const { incomingRequests, respondToRequest, loading } = useConnectionRequests();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleRespond = async (requestId: string, approved: boolean) => {
    setRespondingId(requestId);
    const success = await respondToRequest(requestId, approved);
    if (success) {
      toast.success(approved ? "Connected!" : "Request declined");
    } else {
      toast.error("Failed to respond to request");
    }
    setRespondingId(null);
  };

  if (loading) {
    return null;
  }

  if (incomingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Connection Requests ({incomingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {incomingRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background"
          >
            <Link
              to={`/profile/${request.requester_profile?.username || request.requester_id}`}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={request.requester_profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {request.requester_profile?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">
                @{request.requester_profile?.username || "unknown"}
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={() => handleRespond(request.id, true)}
                disabled={respondingId === request.id}
              >
                {respondingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={() => handleRespond(request.id, false)}
                disabled={respondingId === request.id}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

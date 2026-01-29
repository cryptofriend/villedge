import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ConnectionRequest {
  id: string;
  requester_id: string;
  target_user_id: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  updated_at: string;
  requester_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export const useConnectionRequests = (targetUserId?: string) => {
  const { user } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<ConnectionRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchConnectionStatus = async () => {
      setLoading(true);
      try {
        // Check if already connected (mutual connection exists)
        if (targetUserId && user.id !== targetUserId) {
          const { data: isMutual } = await supabase.rpc("has_mutual_connection", {
            _user_a: user.id,
            _user_b: targetUserId,
          });
          setIsConnected(!!isMutual);

          // Check for pending request from current user to target
          const { data: existingRequest } = await supabase
            .from("reveal_requests")
            .select("*")
            .eq("requester_id", user.id)
            .eq("target_user_id", targetUserId)
            .eq("status", "pending")
            .maybeSingle();

          setPendingRequest(existingRequest as ConnectionRequest | null);
        }

        // Get connections count for target user (mutual connections only)
        if (targetUserId) {
          // Count users where mutual connection exists
          const { data: following } = await supabase
            .from("user_connections")
            .select("following_id")
            .eq("follower_id", targetUserId);

          if (following && following.length > 0) {
            const followingIds = following.map((f) => f.following_id);
            const { count } = await supabase
              .from("user_connections")
              .select("id", { count: "exact", head: true })
              .eq("following_id", targetUserId)
              .in("follower_id", followingIds);
            setConnectionsCount(count || 0);
          } else {
            setConnectionsCount(0);
          }
        }

        // Fetch incoming requests for current user
        const { data: incoming } = await supabase
          .from("reveal_requests")
          .select("*")
          .eq("target_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        // Fetch requester profiles
        if (incoming && incoming.length > 0) {
          const requesterIds = incoming.map((r) => r.requester_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .in("user_id", requesterIds);

          const profileMap = new Map(
            profiles?.map((p) => [p.user_id, { username: p.username, avatar_url: p.avatar_url }]) || []
          );

          const requestsWithProfiles = incoming.map((r) => ({
            ...r,
            requester_profile: profileMap.get(r.requester_id),
          })) as ConnectionRequest[];

          setIncomingRequests(requestsWithProfiles);
        } else {
          setIncomingRequests([]);
        }
      } catch (error) {
        console.error("Error fetching connection status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionStatus();
  }, [user?.id, targetUserId]);

  const sendConnectionRequest = async () => {
    if (!user || !targetUserId) return false;

    try {
      const { error } = await supabase.from("reveal_requests").insert({
        requester_id: user.id,
        target_user_id: targetUserId,
      });

      if (error) throw error;

      setPendingRequest({
        id: "",
        requester_id: user.id,
        target_user_id: targetUserId,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error("Error sending connection request:", error);
      return false;
    }
  };

  const respondToRequest = async (requestId: string, approved: boolean) => {
    if (!user) return false;

    try {
      if (approved) {
        // Use the database function that creates mutual connections
        const { data, error } = await supabase.rpc("approve_connection_request", {
          _request_id: requestId,
          _target_user_id: user.id,
        });

        if (error) throw error;
        if (!data) return false;
      } else {
        // Just deny the request
        const { error } = await supabase
          .from("reveal_requests")
          .update({
            status: "denied",
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId)
          .eq("target_user_id", user.id);

        if (error) throw error;
      }

      // Remove from incoming requests
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      return true;
    } catch (error) {
      console.error("Error responding to connection request:", error);
      return false;
    }
  };

  const disconnect = async () => {
    if (!user || !targetUserId) return false;

    try {
      // Remove both directions of the connection
      await supabase
        .from("user_connections")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      await supabase
        .from("user_connections")
        .delete()
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id);

      setIsConnected(false);
      return true;
    } catch (error) {
      console.error("Error disconnecting:", error);
      return false;
    }
  };

  return {
    pendingRequest,
    isConnected,
    incomingRequests,
    connectionsCount,
    loading,
    sendConnectionRequest,
    respondToRequest,
    disconnect,
  };
};

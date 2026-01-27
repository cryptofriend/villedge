import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RevealRequest {
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

export const useRevealRequests = (targetUserId?: string) => {
  const { user } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<RevealRequest | null>(null);
  const [hasApprovedAccess, setHasApprovedAccess] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<RevealRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRevealStatus = async () => {
      setLoading(true);
      try {
        // Check if current user has a pending/approved request to target
        if (targetUserId && user.id !== targetUserId) {
          const { data: existingRequest } = await supabase
            .from("reveal_requests")
            .select("*")
            .eq("requester_id", user.id)
            .eq("target_user_id", targetUserId)
            .maybeSingle();

          if (existingRequest) {
            setPendingRequest(existingRequest as RevealRequest);
            setHasApprovedAccess(existingRequest.status === "approved");
          } else {
            setPendingRequest(null);
            setHasApprovedAccess(false);
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
          const requesterIds = incoming.map(r => r.requester_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .in("user_id", requesterIds);

          const profileMap = new Map(
            profiles?.map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url }]) || []
          );

          const requestsWithProfiles = incoming.map(r => ({
            ...r,
            requester_profile: profileMap.get(r.requester_id),
          })) as RevealRequest[];

          setIncomingRequests(requestsWithProfiles);
        } else {
          setIncomingRequests([]);
        }
      } catch (error) {
        console.error("Error fetching reveal requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevealStatus();
  }, [user?.id, targetUserId]);

  const requestReveal = async () => {
    if (!user || !targetUserId) return false;

    try {
      const { error } = await supabase
        .from("reveal_requests")
        .insert({
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
      console.error("Error requesting reveal:", error);
      return false;
    }
  };

  const respondToRequest = async (requestId: string, approved: boolean) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("reveal_requests")
        .update({
          status: approved ? "approved" : "denied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("target_user_id", user.id);

      if (error) throw error;
      
      // Remove from incoming requests
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
      return true;
    } catch (error) {
      console.error("Error responding to reveal request:", error);
      return false;
    }
  };

  return {
    pendingRequest,
    hasApprovedAccess,
    incomingRequests,
    loading,
    requestReveal,
    respondToRequest,
  };
};

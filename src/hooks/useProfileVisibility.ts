import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface VisibilityCache {
  [targetUserId: string]: boolean;
}

export const useProfileVisibility = () => {
  const { user } = useAuth();
  const [visibilityCache, setVisibilityCache] = useState<VisibilityCache>({});
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  // Check if current user can see a target user's data
  const canSeeUser = useCallback(async (targetUserId: string, targetIsAnon: boolean): Promise<boolean> => {
    // If not anonymous, everyone can see
    if (!targetIsAnon) return true;
    
    // If no current user, they can't see anon profiles
    if (!user) return false;
    
    // Users can always see their own profile
    if (user.id === targetUserId) return true;

    // Check cache first
    if (targetUserId in visibilityCache) {
      return visibilityCache[targetUserId];
    }

    // Check for mutual connection
    try {
      // Check if current user follows target
      const { data: following } = await supabase
        .from("user_connections")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (following) {
        // Check if target follows current user back (mutual)
        const { data: followedBack } = await supabase
          .from("user_connections")
          .select("id")
          .eq("follower_id", targetUserId)
          .eq("following_id", user.id)
          .maybeSingle();

        if (followedBack) {
          setVisibilityCache(prev => ({ ...prev, [targetUserId]: true }));
          return true;
        }
      }

      // Check for approved reveal request
      const { data: approvedReveal } = await supabase
        .from("reveal_requests")
        .select("id")
        .eq("requester_id", user.id)
        .eq("target_user_id", targetUserId)
        .eq("status", "approved")
        .maybeSingle();

      if (approvedReveal) {
        setVisibilityCache(prev => ({ ...prev, [targetUserId]: true }));
        return true;
      }

      // No access
      setVisibilityCache(prev => ({ ...prev, [targetUserId]: false }));
      return false;
    } catch (error) {
      console.error("Error checking profile visibility:", error);
      return false;
    }
  }, [user, visibilityCache]);

  // Batch check for multiple users
  const checkBatchVisibility = useCallback(async (
    users: { userId: string; isAnon: boolean }[]
  ): Promise<Record<string, boolean>> => {
    if (!user) {
      // No user logged in, only show non-anon profiles
      const result: Record<string, boolean> = {};
      users.forEach(u => {
        result[u.userId] = !u.isAnon;
      });
      return result;
    }

    const result: Record<string, boolean> = {};
    const uncachedUsers: { userId: string; isAnon: boolean }[] = [];

    // First, check cache and non-anon users
    users.forEach(u => {
      if (!u.isAnon) {
        result[u.userId] = true;
      } else if (u.userId === user.id) {
        result[u.userId] = true;
      } else if (u.userId in visibilityCache) {
        result[u.userId] = visibilityCache[u.userId];
      } else {
        uncachedUsers.push(u);
      }
    });

    if (uncachedUsers.length === 0) {
      return result;
    }

    // Batch fetch connections and reveal requests
    const targetUserIds = uncachedUsers.map(u => u.userId);

    try {
      // Get all connections from current user to target users
      const { data: myConnections } = await supabase
        .from("user_connections")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", targetUserIds);

      // Get all connections from target users to current user
      const { data: theirConnections } = await supabase
        .from("user_connections")
        .select("follower_id")
        .eq("following_id", user.id)
        .in("follower_id", targetUserIds);

      // Get approved reveal requests
      const { data: approvedReveals } = await supabase
        .from("reveal_requests")
        .select("target_user_id")
        .eq("requester_id", user.id)
        .eq("status", "approved")
        .in("target_user_id", targetUserIds);

      // Build sets for fast lookup
      const iFollow = new Set(myConnections?.map(c => c.following_id) || []);
      const theyFollowMe = new Set(theirConnections?.map(c => c.follower_id) || []);
      const hasReveal = new Set(approvedReveals?.map(r => r.target_user_id) || []);

      // Determine visibility for each uncached user
      const newCache: VisibilityCache = {};
      uncachedUsers.forEach(u => {
        const isMutual = iFollow.has(u.userId) && theyFollowMe.has(u.userId);
        const hasAccess = isMutual || hasReveal.has(u.userId);
        result[u.userId] = hasAccess;
        newCache[u.userId] = hasAccess;
      });

      // Update cache
      setVisibilityCache(prev => ({ ...prev, ...newCache }));

      return result;
    } catch (error) {
      console.error("Error batch checking visibility:", error);
      // Default to hidden for all uncached anon users
      uncachedUsers.forEach(u => {
        result[u.userId] = false;
      });
      return result;
    }
  }, [user, visibilityCache]);

  // Clear cache when user changes
  useEffect(() => {
    setVisibilityCache({});
  }, [user?.id]);

  return {
    canSeeUser,
    checkBatchVisibility,
  };
};

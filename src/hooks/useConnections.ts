import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Connection {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export const useConnections = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutualConnection, setIsMutualConnection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const fetchConnectionStatus = async () => {
      setLoading(true);
      try {
        // Check if current user follows target
        if (user) {
          const { data: followingData } = await supabase
            .from("user_connections")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", targetUserId)
            .maybeSingle();
          
          setIsFollowing(!!followingData);

          // Check if target follows current user (mutual connection)
          const { data: mutualData } = await supabase
            .from("user_connections")
            .select("id")
            .eq("follower_id", targetUserId)
            .eq("following_id", user.id)
            .maybeSingle();
          
          setIsMutualConnection(!!followingData && !!mutualData);
        }

        // Get follower count for target user
        const { count: followers } = await supabase
          .from("user_connections")
          .select("id", { count: "exact", head: true })
          .eq("following_id", targetUserId);

        // Get following count for target user
        const { count: following } = await supabase
          .from("user_connections")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", targetUserId);

        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);
      } catch (error) {
        console.error("Error fetching connection status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionStatus();
  }, [user?.id, targetUserId]);

  const follow = async () => {
    if (!user || !targetUserId) return false;

    try {
      const { error } = await supabase
        .from("user_connections")
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

      if (error) throw error;
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      
      // Re-check mutual connection
      const { data: mutualData } = await supabase
        .from("user_connections")
        .select("id")
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id)
        .maybeSingle();
      
      setIsMutualConnection(!!mutualData);
      return true;
    } catch (error) {
      console.error("Error following user:", error);
      return false;
    }
  };

  const unfollow = async () => {
    if (!user || !targetUserId) return false;

    try {
      const { error } = await supabase
        .from("user_connections")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
      setIsFollowing(false);
      setIsMutualConnection(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error("Error unfollowing user:", error);
      return false;
    }
  };

  return {
    isFollowing,
    isMutualConnection,
    loading,
    followersCount,
    followingCount,
    follow,
    unfollow,
  };
};

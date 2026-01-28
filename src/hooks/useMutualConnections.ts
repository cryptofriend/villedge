import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MutualConnection {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export const useMutualConnections = (userId?: string) => {
  const [connections, setConnections] = useState<MutualConnection[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMutualConnections = async () => {
      setLoading(true);
      try {
        // Get follower count
        const { count: followers } = await supabase
          .from("user_connections")
          .select("id", { count: "exact", head: true })
          .eq("following_id", userId);

        // Get following count
        const { count: following } = await supabase
          .from("user_connections")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", userId);

        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);

        // Get users that the profile owner follows
        const { data: followingData } = await supabase
          .from("user_connections")
          .select("following_id")
          .eq("follower_id", userId);

        if (!followingData || followingData.length === 0) {
          setConnections([]);
          setLoading(false);
          return;
        }

        const followingIds = followingData.map((f) => f.following_id);

        // Get users that follow the profile owner back (mutual)
        const { data: followersData } = await supabase
          .from("user_connections")
          .select("follower_id")
          .eq("following_id", userId)
          .in("follower_id", followingIds);

        if (!followersData || followersData.length === 0) {
          setConnections([]);
          setLoading(false);
          return;
        }

        const mutualIds = followersData.map((f) => f.follower_id);

        // Fetch profiles for mutual connections
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", mutualIds);

        setConnections(profiles || []);
      } catch (error) {
        console.error("Error fetching mutual connections:", error);
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMutualConnections();
  }, [userId]);

  return { connections, followersCount, followingCount, loading };
};


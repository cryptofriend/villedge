import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MutualConnection {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

export const useMutualConnections = (userId?: string) => {
  const [connections, setConnections] = useState<MutualConnection[]>([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchConnections = async () => {
      setLoading(true);
      try {
        // Get users that the profile owner follows
        const { data: followingData } = await supabase
          .from("user_connections")
          .select("following_id")
          .eq("follower_id", userId);

        if (!followingData || followingData.length === 0) {
          setConnections([]);
          setConnectionsCount(0);
          setLoading(false);
          return;
        }

        const followingIds = followingData.map((f) => f.following_id);

        // Get users that follow the profile owner back (mutual = connected)
        const { data: followersData } = await supabase
          .from("user_connections")
          .select("follower_id")
          .eq("following_id", userId)
          .in("follower_id", followingIds);

        if (!followersData || followersData.length === 0) {
          setConnections([]);
          setConnectionsCount(0);
          setLoading(false);
          return;
        }

        const mutualIds = followersData.map((f) => f.follower_id);

        // Fetch profiles for connections
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", mutualIds);

        setConnections(profiles || []);
        setConnectionsCount(mutualIds.length);
      } catch (error) {
        console.error("Error fetching mutual connections:", error);
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [userId]);

  return { connections, connectionsCount, loading };
};


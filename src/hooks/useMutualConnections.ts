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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMutualConnections = async () => {
      setLoading(true);
      try {
        // Get users that the profile owner follows
        const { data: following } = await supabase
          .from("user_connections")
          .select("following_id")
          .eq("follower_id", userId);

        if (!following || following.length === 0) {
          setConnections([]);
          setLoading(false);
          return;
        }

        const followingIds = following.map((f) => f.following_id);

        // Get users that follow the profile owner back (mutual)
        const { data: followers } = await supabase
          .from("user_connections")
          .select("follower_id")
          .eq("following_id", userId)
          .in("follower_id", followingIds);

        if (!followers || followers.length === 0) {
          setConnections([]);
          setLoading(false);
          return;
        }

        const mutualIds = followers.map((f) => f.follower_id);

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

  return { connections, loading };
};

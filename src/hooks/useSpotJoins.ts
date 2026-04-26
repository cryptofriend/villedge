import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SpotJoiner {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

export const useSpotJoins = (spotId: string | undefined) => {
  const { user } = useAuth();
  const [joiners, setJoiners] = useState<SpotJoiner[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchJoiners = useCallback(async () => {
    if (!spotId) return;
    setLoading(true);
    try {
      const { data: joins, error } = await supabase
        .from("spot_joins")
        .select("id, user_id, created_at")
        .eq("spot_id", spotId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = (joins || []).map((j) => j.user_id);
      let profilesMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", userIds);
        profilesMap = Object.fromEntries(
          (profiles || []).map((p: any) => [p.user_id, { username: p.username, avatar_url: p.avatar_url }])
        );
      }

      setJoiners(
        (joins || []).map((j) => ({
          id: j.id,
          user_id: j.user_id,
          username: profilesMap[j.user_id]?.username ?? null,
          avatar_url: profilesMap[j.user_id]?.avatar_url ?? null,
        }))
      );
    } catch (err) {
      console.error("Error fetching spot joins:", err);
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  useEffect(() => {
    fetchJoiners();
  }, [fetchJoiners]);

  const hasJoined = !!user && joiners.some((j) => j.user_id === user.id);

  const join = async () => {
    if (!user) {
      toast.error("Sign in to join");
      return;
    }
    if (!spotId || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("spot_joins")
        .insert({ spot_id: spotId, user_id: user.id });
      if (error) throw error;
      toast.success("You joined!");
      await fetchJoiners();
    } catch (err: any) {
      console.error("Join error:", err);
      toast.error(err?.message || "Failed to join");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!user || !spotId || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("spot_joins")
        .delete()
        .eq("spot_id", spotId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("You left");
      await fetchJoiners();
    } catch (err: any) {
      console.error("Leave error:", err);
      toast.error(err?.message || "Failed to leave");
    } finally {
      setBusy(false);
    }
  };

  return { joiners, loading, busy, hasJoined, join, leave, refetch: fetchJoiners };
};

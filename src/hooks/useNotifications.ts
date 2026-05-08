import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string;
  entity_id: string;
  parent_entity_type: string | null;
  parent_entity_id: string | null;
  data: Record<string, any>;
  read_at: string | null;
  seen_at: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setNotifications(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markAsRead = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    }
  }, [user]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, remove, refetch: fetchNotifications };
};

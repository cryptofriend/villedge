import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DbEvent {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  coordinates: [number, number] | null;
  image_url: string | null;
  luma_url: string | null;
  host_name: string | null;
  host_avatar: string | null;
  village_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventInput {
  name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  coordinates?: [number, number];
  image_url?: string;
  luma_url?: string;
  host_name?: string;
  host_avatar?: string;
  village_id?: string;
}

export const useEvents = (villageId?: string) => {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      // Fetch all events - don't filter by village_id to include imported Luma events
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;

      const mappedEvents: DbEvent[] = (data || []).map((event) => ({
        ...event,
        coordinates: event.coordinates as [number, number] | null,
      }));

      setEvents(mappedEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (event: EventInput): Promise<DbEvent | null> => {
    try {
      const { data, error } = await supabase
        .from("events")
        .insert({
          name: event.name,
          description: event.description || null,
          start_time: event.start_time,
          end_time: event.end_time || null,
          location: event.location || null,
          coordinates: event.coordinates || null,
          image_url: event.image_url || null,
          luma_url: event.luma_url || null,
          host_name: event.host_name || null,
          host_avatar: event.host_avatar || null,
          village_id: event.village_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newEvent: DbEvent = {
        ...data,
        coordinates: data.coordinates as [number, number] | null,
      };

      setEvents((prev) => [...prev, newEvent].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));

      // Send Telegram notification (fire and forget)
      supabase.functions.invoke("notify-telegram", {
        body: {
          type: "event",
          name: newEvent.name,
          description: newEvent.description,
          location: newEvent.location,
          startTime: newEvent.start_time,
        },
      }).catch((err) => console.error("Failed to send Telegram notification:", err));

      return newEvent;
    } catch (err) {
      console.error("Error adding event:", err);
      toast.error("Failed to add event");
      return null;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      setEvents((prev) => prev.filter((event) => event.id !== id));
      return true;
    } catch (err) {
      console.error("Error deleting event:", err);
      toast.error("Failed to delete event");
      return false;
    }
  };

  return { events, loading, addEvent, deleteEvent, refetch: fetchEvents };
};

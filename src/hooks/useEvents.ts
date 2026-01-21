import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Event {
  id: string;
  village_id: string;
  luma_url: string;
  luma_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  created_at: string;
}

export const useEvents = (villageId: string) => {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["events", villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("village_id", villageId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!villageId,
  });

  const addEvent = useMutation({
    mutationFn: async ({ lumaUrl }: { lumaUrl: string }) => {
      // First, resolve the Luma URL to get event details
      const { data: resolvedData, error: resolveError } = await supabase.functions.invoke(
        'resolve-luma-event',
        { body: { luma_url: lumaUrl } }
      );

      if (resolveError) throw resolveError;
      if (resolvedData?.error) throw new Error(resolvedData.error);

      // Insert the event with resolved data
      const { data, error } = await supabase
        .from("events")
        .insert({
          village_id: villageId,
          luma_url: lumaUrl,
          luma_id: resolvedData.luma_id,
          title: resolvedData.title,
          description: resolvedData.description,
          start_time: resolvedData.start_time,
          end_time: resolvedData.end_time,
          location: resolvedData.location,
          image_url: resolvedData.image_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", villageId] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", villageId] });
    },
  });

  return {
    events,
    isLoading,
    error,
    addEvent,
    deleteEvent,
  };
};

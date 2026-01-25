import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BulletinMessage {
  id: string;
  village_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

export const useBulletin = (villageId: string) => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ["bulletin", villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulletin")
        .select("*")
        .eq("village_id", villageId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BulletinMessage[];
    },
    enabled: !!villageId,
  });

  const addMessage = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const { data, error } = await supabase
        .from("bulletin")
        .insert({ village_id: villageId, author_name: "Anonymous", message })
        .select()
        .single();

      if (error) throw error;
      
      // Send Telegram notification for proof-of-retreat village
      if (villageId === "proof-of-retreat") {
        try {
          await supabase.functions.invoke("notify-telegram", {
            body: {
              type: "bulletin",
              name: message,
              villageId: villageId,
              // Private channel ID with -100 prefix
              bulletinChatId: "-1003580489932",
            },
          });
        } catch (notifyError) {
          console.error("Failed to send bulletin notification:", notifyError);
          // Don't throw - bulletin was saved successfully
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin", villageId] });
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["bulletin", villageId] });
  };

  return {
    messages,
    isLoading,
    error,
    addMessage,
    refetch,
  };
};

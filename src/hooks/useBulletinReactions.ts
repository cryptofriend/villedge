import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReactionType = "support" | "in" | "cute";

export interface BulletinReaction {
  id: string;
  bulletin_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionCounts {
  support: number;
  in: number;
  cute: number;
  total: number;
}

export const useBulletinReactions = (villageId: string) => {
  const queryClient = useQueryClient();

  const { data: reactions = [], isLoading } = useQuery({
    queryKey: ["bulletin-reactions", villageId],
    queryFn: async () => {
      // First get all bulletin IDs for this village
      const { data: bulletins, error: bulletinError } = await supabase
        .from("bulletin")
        .select("id")
        .eq("village_id", villageId);

      if (bulletinError) throw bulletinError;
      
      const bulletinIds = bulletins?.map(b => b.id) || [];
      if (bulletinIds.length === 0) return [];

      const { data, error } = await supabase
        .from("bulletin_reactions")
        .select("*")
        .in("bulletin_id", bulletinIds);

      if (error) throw error;
      return data as BulletinReaction[];
    },
    enabled: !!villageId,
  });

  const addReaction = useMutation({
    mutationFn: async ({ bulletinId, reactionType }: { bulletinId: string; reactionType: ReactionType }) => {
      const { data, error } = await supabase
        .from("bulletin_reactions")
        .insert({ bulletin_id: bulletinId, reaction_type: reactionType })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulletin-reactions", villageId] });
    },
  });

  // Get reaction counts for a specific bulletin
  const getReactionCounts = (bulletinId: string): ReactionCounts => {
    const bulletinReactions = reactions.filter(r => r.bulletin_id === bulletinId);
    return {
      support: bulletinReactions.filter(r => r.reaction_type === "support").length,
      in: bulletinReactions.filter(r => r.reaction_type === "in").length,
      cute: bulletinReactions.filter(r => r.reaction_type === "cute").length,
      total: bulletinReactions.length,
    };
  };

  // Get all bulletin IDs sorted by total reactions (descending)
  const getTopBulletinIds = (): string[] => {
    const countsByBulletin = new Map<string, number>();
    
    reactions.forEach(r => {
      const current = countsByBulletin.get(r.bulletin_id) || 0;
      countsByBulletin.set(r.bulletin_id, current + 1);
    });

    return Array.from(countsByBulletin.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  };

  return {
    reactions,
    isLoading,
    addReaction,
    getReactionCounts,
    getTopBulletinIds,
  };
};

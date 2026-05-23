import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchCount = async (table: "villages" | "profiles") => {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
};

export const useGlobalStats = () => {
  const queryClient = useQueryClient();

  const { data: villageCount = 0 } = useQuery({
    queryKey: ["global-village-count"],
    queryFn: () => fetchCount("villages"),
    staleTime: 1000 * 30,
  });

  const { data: userCount = 0 } = useQuery({
    queryKey: ["global-user-count"],
    queryFn: () => fetchCount("profiles"),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    const channel = supabase
      .channel("global-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "villages" },
        () => queryClient.invalidateQueries({ queryKey: ["global-village-count"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => queryClient.invalidateQueries({ queryKey: ["global-user-count"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { villageCount, userCount };
};

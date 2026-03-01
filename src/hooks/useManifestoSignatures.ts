import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useManifestoSignatures = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ["manifesto-signature-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("manifesto_signatures")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60,
  });

  const { data: hasSigned = false } = useQuery({
    queryKey: ["manifesto-signed", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("manifesto_signatures")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("manifesto_signatures")
        .insert({ user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manifesto-signature-count"] });
      queryClient.invalidateQueries({ queryKey: ["manifesto-signed", user?.id] });
      toast.success("You signed the manifesto!");
    },
    onError: () => {
      toast.error("Failed to sign");
    },
  });

  return { count, hasSigned, sign: signMutation.mutate, isSigning: signMutation.isPending, isLoggedIn: !!user };
};

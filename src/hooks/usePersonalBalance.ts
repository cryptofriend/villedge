import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WalletBalance {
  balance: number;
  walletAddress: string;
  timestamp: string;
}

export const usePersonalBalance = (walletAddress: string | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["personal-balance", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      
      const { data, error } = await supabase.functions.invoke<WalletBalance>("get-wallet-balance", {
        body: { walletAddress },
      });

      if (error) {
        console.error("Error fetching personal balance:", error);
        throw error;
      }

      return data;
    },
    enabled: !!walletAddress,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    balance: data?.balance ?? 0,
    isLoading,
    error,
  };
};

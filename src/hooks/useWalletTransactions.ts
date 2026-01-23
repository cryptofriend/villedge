import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  value: number;
  symbol: string;
  chain: string;
  status: string;
}

interface TransactionsResponse {
  incoming: Transaction[];
  outgoing: Transaction[];
  walletAddress: string;
  timestamp: string;
}

export const useWalletTransactions = (walletAddress: string | undefined) => {
  const query = useQuery({
    queryKey: ["wallet-transactions", walletAddress],
    queryFn: async (): Promise<TransactionsResponse> => {
      if (!walletAddress) {
        return { incoming: [], outgoing: [], walletAddress: '', timestamp: '' };
      }

      const { data, error } = await supabase.functions.invoke('get-wallet-transactions', {
        body: { walletAddress },
      });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      return data;
    },
    enabled: !!walletAddress,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    incoming: query.data?.incoming || [],
    outgoing: query.data?.outgoing || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Treasury {
  id: string;
  village_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface Proposal {
  id: string;
  village_id: string;
  title: string;
  description: string | null;
  amount: number | null;
  author_name: string;
  created_at: string;
}

interface ProposalReaction {
  id: string;
  proposal_id: string;
  reaction_type: "fund" | "later" | "no_fund";
  created_at: string;
}

interface WalletBalance {
  balance: number;
  walletAddress: string;
  ensName?: string;
  timestamp: string;
}

interface SolanaBalance {
  balance: number;
  solBalance: number;
  solPrice: number;
  walletAddress: string;
  timestamp: string;
}

export type ProposalReactionType = "fund" | "later" | "no_fund";

export const useTreasury = (villageId: string, ethWalletAddress?: string | null, solWalletAddress?: string | null) => {
  const queryClient = useQueryClient();

  // Fetch live wallet balance from Zerion (Base/ETH)
  const { data: walletBalance, isLoading: isLoadingWallet, error: walletError } = useQuery({
    queryKey: ["wallet-balance", ethWalletAddress],
    queryFn: async () => {
      if (!ethWalletAddress) return null;
      
      const { data, error } = await supabase.functions.invoke<WalletBalance>("get-wallet-balance", {
        body: { walletAddress: ethWalletAddress },
      });

      if (error) {
        console.error("Error fetching wallet balance:", error);
        throw error;
      }

      return data;
    },
    enabled: !!ethWalletAddress,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch Solana wallet balance
  const { data: solanaBalance, isLoading: isLoadingSolana, error: solanaError } = useQuery({
    queryKey: ["solana-balance", solWalletAddress],
    queryFn: async () => {
      if (!solWalletAddress) return null;
      
      const { data, error } = await supabase.functions.invoke<SolanaBalance>("get-solana-balance", {
        body: { walletAddress: solWalletAddress },
      });

      if (error) {
        console.error("Error fetching Solana balance:", error);
        throw error;
      }

      return data;
    },
    enabled: !!solWalletAddress,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch treasury from DB (fallback)
  const { data: treasury, isLoading: isLoadingTreasury } = useQuery({
    queryKey: ["treasury", villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treasury")
        .select("*")
        .eq("village_id", villageId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Treasury | null;
    },
    enabled: !!villageId,
  });

  // Fetch proposals
  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["proposals", villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("village_id", villageId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!villageId,
  });

  // Fetch all reactions for proposals in this village
  const { data: reactions = [] } = useQuery({
    queryKey: ["proposal_reactions", villageId],
    queryFn: async () => {
      const proposalIds = proposals.map(p => p.id);
      if (proposalIds.length === 0) return [];

      const { data, error } = await supabase
        .from("proposal_reactions")
        .select("*")
        .in("proposal_id", proposalIds);

      if (error) throw error;
      return data as ProposalReaction[];
    },
    enabled: proposals.length > 0,
  });

  // Add proposal
  const addProposal = useMutation({
    mutationFn: async ({ title, description, amount }: { title: string; description?: string; amount?: number }) => {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          village_id: villageId,
          title,
          description: description || null,
          amount: amount || null,
          author_name: "Anonymous",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", villageId] });
    },
  });

  // Add reaction to proposal
  const addReaction = useMutation({
    mutationFn: async ({ proposalId, reactionType }: { proposalId: string; reactionType: ProposalReactionType }) => {
      const { data, error } = await supabase
        .from("proposal_reactions")
        .insert({
          proposal_id: proposalId,
          reaction_type: reactionType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal_reactions", villageId] });
    },
  });

  // Get reaction counts for a proposal
  const getReactionCounts = (proposalId: string) => {
    const proposalReactions = reactions.filter(r => r.proposal_id === proposalId);
    return {
      fund: proposalReactions.filter(r => r.reaction_type === "fund").length,
      later: proposalReactions.filter(r => r.reaction_type === "later").length,
      no_fund: proposalReactions.filter(r => r.reaction_type === "no_fund").length,
    };
  };

  // Use live wallet balance, fall back to DB treasury balance
  const baseBalance = walletBalance?.balance ?? 0;
  const solBalance = solanaBalance?.balance ?? 0;
  const totalBalance = baseBalance + solBalance;
  
  // Get the resolved hex address from the wallet balance response
  const resolvedAddress = walletBalance?.walletAddress;

  return {
    treasury,
    proposals,
    isLoading: isLoadingTreasury || isLoadingProposals,
    isLoadingWallet: isLoadingWallet || isLoadingSolana,
    walletError: walletError || solanaError,
    walletBalance: totalBalance,
    baseBalance,
    solanaBalance: solBalance,
    solanaWalletAddress: solWalletAddress,
    walletAddress: ethWalletAddress,
    resolvedAddress,
    addProposal,
    addReaction,
    getReactionCounts,
  };
};

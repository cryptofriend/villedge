import { useState } from "react";
import { useTreasury, ProposalReactionType } from "@/hooks/useTreasury";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Coins, ThumbsUp, Clock, ThumbsDown, FileText, ExternalLink, RefreshCw, Plus, ArrowLeftRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { TopUpDialog } from "./TopUpDialog";
import { TransactionsList } from "./TransactionsList";

interface TreasuryListProps {
  villageId: string;
}

type ActiveTab = "proposals" | "transactions";

const REACTIONS: { type: ProposalReactionType; icon: typeof ThumbsUp; label: string; activeColor: string }[] = [
  { type: "fund", icon: ThumbsUp, label: "Fund this", activeColor: "text-green-500" },
  { type: "later", icon: Clock, label: "Come Back Later", activeColor: "text-yellow-500" },
  { type: "no_fund", icon: ThumbsDown, label: "Do Not Fund", activeColor: "text-red-500" },
];

export const TreasuryList = ({ villageId }: TreasuryListProps) => {
  const { 
    proposals, 
    isLoading, 
    isLoadingWallet,
    walletBalance,
    walletAddress,
    addProposal, 
    addReaction, 
    getReactionCounts 
  } = useTreasury(villageId);
  
  const { incoming, outgoing, isLoading: isLoadingTxs, refetch: refetchTxs } = useWalletTransactions(walletAddress);
  
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("proposals");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a proposal title",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addProposal.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amount ? parseFloat(amount) : undefined,
      });
      setTitle("");
      setDescription("");
      setAmount("");
      setShowForm(false);
      toast({
        title: "Proposal submitted!",
        description: "Your proposal has been added to the treasury",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit proposal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (proposalId: string, reactionType: ProposalReactionType) => {
    try {
      await addReaction.mutateAsync({ proposalId, reactionType });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add vote",
        variant: "destructive",
      });
    }
  };

  const handleRefreshBalance = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet-balance", walletAddress] });
    refetchTxs();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Treasury balance header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Coins className="h-3.5 w-3.5" />
            <span>Treasury Balance</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshBalance}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Refresh balance"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isLoadingWallet && "animate-spin")} />
            </button>
            <a
              href={`https://app.zerion.io/${walletAddress}/overview`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-muted rounded transition-colors"
              title="View on Zerion"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>
        <div className="text-3xl font-bold text-foreground mt-1">
          {isLoadingWallet ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : (
            `$${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
          {walletAddress}
        </div>
      </div>

      {/* Top up button */}
      <div className="p-4 border-b border-border">
        <TopUpDialog walletAddress={walletAddress} />
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("proposals")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
            activeTab === "proposals"
              ? "text-foreground border-b-2 border-primary bg-muted/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          )}
        >
          <FileText className="h-4 w-4" />
          Proposals
          {proposals.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {proposals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
            activeTab === "transactions"
              ? "text-foreground border-b-2 border-primary bg-muted/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          )}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Transactions
          {(incoming.length + outgoing.length) > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {incoming.length + outgoing.length}
            </span>
          )}
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "proposals" ? (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Proposals list */}
            {isLoading ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                Loading proposals...
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8 flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 opacity-50" />
                <p>No proposals yet. Submit the first one!</p>
              </div>
            ) : (
              proposals.map((proposal) => {
                const counts = getReactionCounts(proposal.id);
                
                return (
                  <div key={proposal.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {proposal.title}
                      </h3>
                      {proposal.amount && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          ${proposal.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {proposal.description && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                        {proposal.description}
                      </p>
                    )}
                    
                    {/* Reactions row */}
                    <div className="flex items-center gap-1 mt-3">
                      {REACTIONS.map(({ type, icon: Icon, label, activeColor }) => {
                        const count = counts[type];
                        const hasReactions = count > 0;
                        
                        return (
                          <button
                            key={type}
                            onClick={() => handleReaction(proposal.id, type)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
                              "hover:bg-muted border border-transparent",
                              hasReactions 
                                ? "bg-muted/80 border-border/50" 
                                : "opacity-60 hover:opacity-100"
                            )}
                            title={label}
                          >
                            <Icon className={cn("h-3.5 w-3.5", hasReactions && activeColor)} />
                            {hasReactions && (
                              <span className="text-muted-foreground">{count}</span>
                            )}
                          </button>
                        );
                      })}
                      
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* New proposal form/button - at the bottom */}
            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-lg p-3">
                <Input
                  placeholder="Proposal title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm"
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm min-h-[60px] resize-none"
                />
                <Input
                  placeholder="Amount requested (optional)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={isSubmitting || !title.trim()}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(true)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </Button>
            )}
          </div>
        </ScrollArea>
      ) : (
        /* Transactions view - split incoming/outgoing */
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 border-r border-border flex flex-col min-h-0">
            <TransactionsList 
              transactions={incoming} 
              type="incoming" 
              isLoading={isLoadingTxs} 
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <TransactionsList 
              transactions={outgoing} 
              type="outgoing" 
              isLoading={isLoadingTxs} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

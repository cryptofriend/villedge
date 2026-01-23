import { Trophy, Medal, ExternalLink, Loader2 } from "lucide-react";
import { Transaction } from "@/hooks/useWalletTransactions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DonorsLeaderboardProps {
  transactions: Transaction[];
  isLoading: boolean;
}

interface DonorEntry {
  address: string;
  totalValue: number;
  transactionCount: number;
}

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getAddressExplorerUrl = (address: string) => {
  return `https://basescan.org/address/${address}`;
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="w-4 text-center text-xs text-muted-foreground font-medium">{rank}</span>;
};

const getRankBg = (rank: number) => {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/20";
  if (rank === 2) return "bg-gray-400/10 border-gray-400/20";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/20";
  return "bg-muted/30 border-transparent";
};

export const DonorsLeaderboard = ({ transactions, isLoading }: DonorsLeaderboardProps) => {
  // Aggregate transactions by sender address
  const donorMap = transactions.reduce<Record<string, DonorEntry>>((acc, tx) => {
    const address = tx.from.toLowerCase();
    if (!acc[address]) {
      acc[address] = {
        address: tx.from,
        totalValue: 0,
        transactionCount: 0,
      };
    }
    acc[address].totalValue += tx.value;
    acc[address].transactionCount += 1;
    return acc;
  }, {});

  // Sort by total value (descending)
  const leaderboard = Object.values(donorMap)
    .sort((a, b) => b.totalValue - a.totalValue);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Top Donors</span>
        </div>
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium">Top Donors</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {leaderboard.length} contributors
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-6 flex flex-col items-center gap-2">
              <Trophy className="h-8 w-8 opacity-30" />
              <p>No donations yet</p>
              <p className="text-[10px]">Contributors will appear here</p>
            </div>
          ) : (
            leaderboard.map((donor, index) => {
              const rank = index + 1;
              return (
                <a
                  key={donor.address}
                  href={getAddressExplorerUrl(donor.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors group hover:bg-muted/50",
                    getRankBg(rank)
                  )}
                >
                  <div className="flex items-center justify-center w-6">
                    {getRankIcon(rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium truncate">
                      {truncateAddress(donor.address)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {donor.transactionCount} transaction{donor.transactionCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-primary">
                      {donor.totalValue.toFixed(4)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">ETH</div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

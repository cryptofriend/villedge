import { ArrowDownLeft, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Transaction } from "@/hooks/useWalletTransactions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TransactionsListProps {
  transactions: Transaction[];
  type: 'incoming' | 'outgoing';
  isLoading: boolean;
}

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getExplorerUrl = (chain: string, hash: string) => {
  const explorers: Record<string, string> = {
    ethereum: 'https://etherscan.io/tx/',
    base: 'https://basescan.org/tx/',
    optimism: 'https://optimistic.etherscan.io/tx/',
    arbitrum: 'https://arbiscan.io/tx/',
  };
  return `${explorers[chain] || explorers.ethereum}${hash}`;
};

export const TransactionsList = ({ transactions, type, isLoading }: TransactionsListProps) => {
  const Icon = type === 'incoming' ? ArrowDownLeft : ArrowUpRight;
  const iconColor = type === 'incoming' ? 'text-green-500' : 'text-red-500';
  const title = type === 'incoming' ? 'Incoming' : 'Outgoing';

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {transactions.length}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {transactions.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-6">
              No {type} transactions
            </div>
          ) : (
            transactions.slice(0, 20).map((tx) => (
              <a
                key={tx.id}
                href={getExplorerUrl(tx.chain, tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium truncate">
                      {tx.value > 0 ? tx.value.toFixed(4) : '0'} {tx.symbol}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {tx.chain}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {type === 'incoming' ? 'From: ' : 'To: '}
                    <span className="font-mono">
                      {truncateAddress(type === 'incoming' ? tx.from : tx.to)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

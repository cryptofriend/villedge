import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpCircle, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TopUpDialogProps {
  walletAddress: string;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export const TopUpDialog = ({ walletAddress }: TopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTopUp = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!window.ethereum) {
      toast.error("Please install MetaMask or another Web3 wallet");
      return;
    }

    setIsLoading(true);

    try {
      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        toast.error("No wallet connected");
        return;
      }

      const fromAddress = accounts[0];

      // Convert ETH amount to Wei (hex)
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const hexAmount = "0x" + amountInWei.toString(16);

      // Send transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: fromAddress,
            to: walletAddress,
            value: hexAmount,
          },
        ],
      });

      toast.success("Transaction submitted!", {
        description: `TX: ${(txHash as string).slice(0, 10)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://etherscan.io/tx/${txHash}`, "_blank"),
        },
      });

      setOpen(false);
      setAmount("");
    } catch (error: unknown) {
      console.error("Transaction error:", error);
      const errorMessage = error instanceof Error ? error.message : "Transaction failed or was rejected";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const presetAmounts = ["0.01", "0.05", "0.1", "0.5"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Top Up Treasury
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Top Up Treasury
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-mono"
            />
          </div>

          {/* Preset amounts */}
          <div className="flex flex-wrap gap-2">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset)}
                className="flex-1 min-w-[60px]"
              >
                {preset} ETH
              </Button>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>To:</span>
              <span className="font-mono truncate ml-2 max-w-[200px]">{walletAddress}</span>
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="flex justify-between font-medium">
                <span>Amount:</span>
                <span>{amount} ETH</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleTopUp}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Waiting for signature...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Sign & Send
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This will open your wallet to sign the transaction
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

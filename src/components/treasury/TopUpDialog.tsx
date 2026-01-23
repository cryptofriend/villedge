import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Copy, Check, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { Input } from "@/components/ui/input";

interface TopUpDialogProps {
  walletAddress: string;
  resolvedAddress?: string;
}

const SUPPORTED_CHAINS = [
  { name: "Base", chainId: 8453, color: "bg-blue-600" },
];

export const TopUpDialog = ({ walletAddress, resolvedAddress }: TopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0]);
  const [amount, setAmount] = useState("");
  const [showPayForm, setShowPayForm] = useState(false);

  const { address: connectedAddress, isConnected } = useAccount();
  const { sendTransaction, isPending } = useSendTransaction();

  // Use resolved address (hex) for the QR code, fallback to walletAddress
  const hexAddress = resolvedAddress || walletAddress;
  
  // EIP-681 Ethereum URI format: ethereum:<address>@<chainId>
  // This format is recognized by all major crypto wallets
  const ethereumUri = `ethereum:${hexAddress}@${selectedChain.chainId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hexAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handlePayWithWallet = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Ensure we have a valid hex address
    const toAddress = hexAddress.startsWith('0x') ? hexAddress : null;
    if (!toAddress) {
      toast.error("Treasury address not resolved yet. Please try again.");
      return;
    }

    sendTransaction(
      {
        to: toAddress as `0x${string}`,
        value: parseEther(amount),
      },
      {
        onSuccess: (hash) => {
          toast.success("Transaction submitted!", {
            description: `TX: ${hash.slice(0, 10)}...`,
          });
          setAmount("");
          setShowPayForm(false);
        },
        onError: (error) => {
          console.error("Transaction error:", error);
          toast.error("Transaction failed", {
            description: error.message.slice(0, 100),
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowPayForm(false);
        setAmount("");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Top Up Treasury
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Top Up Treasury
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-4">
          {/* Chain selector */}
          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Select Network
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain.name}
                  onClick={() => setSelectedChain(chain)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                    selectedChain.chainId === chain.chainId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${chain.color}`} />
                  <span className="text-xs font-medium">{chain.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pay with wallet section */}
          {isConnected && (
            <div className="w-full space-y-3">
              {!showPayForm ? (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setShowPayForm(true)}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Pay with my wallet
                </Button>
              ) : (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      Amount (ETH)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowPayForm(false);
                        setAmount("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handlePayWithWallet}
                      disabled={isPending || !amount}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 w-full">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or scan QR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={hexAddress}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Wallet address */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors group max-w-full"
          >
            <span className="font-mono text-xs text-muted-foreground truncate">
              {hexAddress}
            </span>
            {copied ? (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Scan with your wallet app to send {selectedChain.name} tokens
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from "wagmi";
import { parseEther } from "viem";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TopUpDialogProps {
  walletAddress?: string;
  resolvedAddress?: string;
  solanaWalletAddress?: string;
}

export const TopUpDialog = ({ walletAddress, resolvedAddress, solanaWalletAddress }: TopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<"base" | "solana">(walletAddress ? "base" : (solanaWalletAddress ? "solana" : "base"));
  const [amount, setAmount] = useState("");
  const [showPayForm, setShowPayForm] = useState(false);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { sendTransaction, isPending } = useSendTransaction();

  // Use resolved address (hex) for the QR code, fallback to walletAddress
  const hexAddress = resolvedAddress || walletAddress || "";
  const displayAddress = selectedNetwork === "base" ? hexAddress : (solanaWalletAddress || "");

  // Check if we have addresses
  const hasBaseAddress = !!(walletAddress || resolvedAddress);
  const hasSolanaAddress = !!solanaWalletAddress;

  if (!hasBaseAddress && !hasSolanaAddress) {
    return null; // Don't show dialog if no addresses configured
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handlePayWithWallet = () => {
    if (chainId !== 8453) {
      toast.error("Please switch to Base network");
      try {
        switchChain({ chainId: 8453 });
      } catch {
        // ignore
      }
      return;
    }

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
        chainId: 8453,
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
          {/* Network switch - only show if both networks are available */}
          {hasBaseAddress && hasSolanaAddress && (
            <div className="w-full flex items-center justify-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedNetwork === "base" ? "bg-blue-500" : "bg-muted"}`} />
                <Label 
                  htmlFor="network-switch" 
                  className={`text-sm font-medium cursor-pointer ${selectedNetwork === "base" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Ethereum
                </Label>
              </div>
              <Switch
                id="network-switch"
                checked={selectedNetwork === "solana"}
                onCheckedChange={(checked) => {
                  setSelectedNetwork(checked ? "solana" : "base");
                  setShowPayForm(false);
                  setAmount("");
                }}
              />
              <div className="flex items-center gap-2">
                <Label 
                  htmlFor="network-switch" 
                  className={`text-sm font-medium cursor-pointer ${selectedNetwork === "solana" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Solana
                </Label>
                <div className={`w-2.5 h-2.5 rounded-full ${selectedNetwork === "solana" ? "bg-purple-500" : "bg-muted"}`} />
              </div>
            </div>
          )}

          {/* Pay with wallet section - only for Base */}
          {isConnected && selectedNetwork === "base" && (
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
                  {chainId !== 8453 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Wrong network (current chain: {chainId}). Switch to Base (8453) to send.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => switchChain({ chainId: 8453 })}
                        disabled={isSwitchingChain}
                      >
                        {isSwitchingChain ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Switching...
                          </>
                        ) : (
                          "Switch to Base"
                        )}
                      </Button>
                    </div>
                  )}
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
                      disabled={isPending || !amount || chainId !== 8453}
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

          {/* Solana info text */}
          {selectedNetwork === "solana" && (
            <p className="text-xs text-muted-foreground text-center">
              Send SOL or SPL tokens to the address below
            </p>
          )}

          <div className="flex items-center gap-2 w-full">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {selectedNetwork === "base" && isConnected ? "or scan QR" : "scan QR code"}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={displayAddress}
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
              {displayAddress}
            </span>
            {copied ? (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Scan with your wallet app to send {selectedNetwork === "base" ? "ETH" : "SOL"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

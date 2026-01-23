import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface TopUpDialogProps {
  walletAddress: string;
  resolvedAddress?: string;
}

const SUPPORTED_CHAINS = [
  { name: "Ethereum", chainId: 1, color: "bg-blue-500" },
  { name: "Base", chainId: 8453, color: "bg-blue-600" },
  { name: "Optimism", chainId: 10, color: "bg-red-500" },
  { name: "Arbitrum", chainId: 42161, color: "bg-blue-400" },
];

export const TopUpDialog = ({ walletAddress, resolvedAddress }: TopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0]);

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

          {/* QR Code */}
          <div className="p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={ethereumUri}
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

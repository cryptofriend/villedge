import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowDownCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface PersonalTopUpDialogProps {
  walletAddress: string;
}

const SUPPORTED_CHAINS = [
  { name: "Base", chainId: 8453, color: "bg-blue-600" },
  { name: "Ethereum", chainId: 1, color: "bg-blue-500" },
];

export const PersonalTopUpDialog = ({ walletAddress }: PersonalTopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0]);

  // EIP-681 Ethereum URI format: ethereum:<address>@<chainId>
  const ethereumUri = `ethereum:${walletAddress}@${selectedChain.chainId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
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
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
          <ArrowDownCircle className="h-3 w-3" />
          Top Up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Top Up Your Wallet
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
              {walletAddress}
            </span>
            {copied ? (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Scan with your wallet app to receive {selectedChain.name} tokens
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

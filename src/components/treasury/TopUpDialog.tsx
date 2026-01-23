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
}

const SUPPORTED_CHAINS = [
  { name: "Ethereum", color: "bg-blue-500" },
  { name: "Base", color: "bg-blue-600" },
  { name: "Optimism", color: "bg-red-500" },
  { name: "Arbitrum", color: "bg-blue-400" },
];

export const TopUpDialog = ({ walletAddress }: TopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
          {/* QR Code */}
          <div className="p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={walletAddress}
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

          {/* Supported chains */}
          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Supported Networks
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <div
                  key={chain.name}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full"
                >
                  <div className={`w-2 h-2 rounded-full ${chain.color}`} />
                  <span className="text-xs font-medium">{chain.name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Scan the QR code or copy the address to send crypto to the treasury
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
];

export const PersonalTopUpDialog = ({ walletAddress }: PersonalTopUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // EIP-681 Ethereum URI format: ethereum:<address>@<chainId>
  const ethereumUri = `ethereum:${walletAddress}@8453`;

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
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            Top Up Your Wallet
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              Base
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Send funds on Base network only
          </p>

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

          <p className="text-xs text-muted-foreground text-center">
            Scan with your crypto wallet
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

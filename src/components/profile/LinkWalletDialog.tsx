import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, Wallet, Loader2 } from "lucide-react";
import { useUserWallets, WalletType } from "@/hooks/useUserWallets";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { porto } from "@/lib/wagmi";
import { toast } from "sonner";

interface LinkWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkWalletDialog = ({ open, onOpenChange }: LinkWalletDialogProps) => {
  const { linkWallet } = useUserWallets();
  const [linking, setLinking] = useState<WalletType | null>(null);

  // Wagmi for Porto and Ethereum
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();

  // Solana
  const { publicKey: solanaPublicKey, connect: connectSolana, disconnect: disconnectSolana, wallets: solanaWallets, select: selectSolanaWallet } = useWallet();

  const handleLinkPorto = async () => {
    setLinking("porto");
    try {
      // Disconnect any existing connection first
      if (isEthConnected) {
        await disconnectAsync();
      }

      // Connect with Porto
      const result = await connectAsync({ connector: porto });
      
      if (result.accounts?.[0]) {
        await linkWallet(result.accounts[0], "porto", false);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Porto link error:", error);
      toast.error("Failed to link Porto wallet");
    } finally {
      setLinking(null);
    }
  };

  const handleLinkEthereum = async () => {
    setLinking("ethereum");
    try {
      // Find a non-Porto connector (like injected/MetaMask)
      const injectedConnector = connectors.find(c => c.id === "injected" || c.name === "MetaMask");
      
      if (!injectedConnector) {
        toast.error("No Ethereum wallet detected. Please install MetaMask or similar.");
        return;
      }

      // Disconnect any existing connection first
      if (isEthConnected) {
        await disconnectAsync();
      }

      const result = await connectAsync({ connector: injectedConnector });
      
      if (result.accounts?.[0]) {
        await linkWallet(result.accounts[0].toLowerCase(), "ethereum", false);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Ethereum link error:", error);
      toast.error("Failed to link Ethereum wallet");
    } finally {
      setLinking(null);
    }
  };

  const handleLinkSolana = async () => {
    setLinking("solana");
    try {
      // Disconnect first if connected
      if (solanaPublicKey) {
        await disconnectSolana();
      }

      // Try to find Phantom or first available wallet
      const phantomWallet = solanaWallets.find(w => w.adapter.name === "Phantom");
      const walletToUse = phantomWallet || solanaWallets[0];

      if (!walletToUse) {
        toast.error("No Solana wallet detected. Please install Phantom or similar.");
        return;
      }

      selectSolanaWallet(walletToUse.adapter.name);
      await connectSolana();

      // Wait a bit for the connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));

      if (solanaPublicKey) {
        await linkWallet(solanaPublicKey.toBase58(), "solana", false);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Solana link error:", error);
      toast.error("Failed to link Solana wallet");
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Wallet</DialogTitle>
          <DialogDescription>
            Connect a wallet to link it to your profile for cross-chain identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={handleLinkPorto}
            disabled={linking !== null}
          >
            {linking === "porto" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Fingerprint className="h-5 w-5 text-primary" />
            )}
            <div className="text-left">
              <div className="font-medium">Porto (Biometric)</div>
              <div className="text-xs text-muted-foreground">Create a new passkey wallet</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={handleLinkEthereum}
            disabled={linking !== null}
          >
            {linking === "ethereum" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wallet className="h-5 w-5 text-blue-500" />
            )}
            <div className="text-left">
              <div className="font-medium">Ethereum</div>
              <div className="text-xs text-muted-foreground">MetaMask, Rainbow, etc.</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={handleLinkSolana}
            disabled={linking !== null}
          >
            {linking === "solana" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wallet className="h-5 w-5 text-purple-500" />
            )}
            <div className="text-left">
              <div className="font-medium">Solana</div>
              <div className="text-xs text-muted-foreground">Phantom, Solflare, etc.</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

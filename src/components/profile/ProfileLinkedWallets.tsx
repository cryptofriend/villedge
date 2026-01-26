import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Star, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { useUserWallets, WalletType } from "@/hooks/useUserWallets";
import { LinkWalletDialog } from "./LinkWalletDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfileLinkedWalletsProps {
  userId?: string;
  isOwnProfile: boolean;
}

const WALLET_TYPE_CONFIG: Record<WalletType, { label: string; color: string; explorer: string }> = {
  porto: { label: "Porto", color: "bg-primary/10 text-primary", explorer: "" },
  ethereum: { label: "Ethereum", color: "bg-blue-500/10 text-blue-600", explorer: "https://etherscan.io/address/" },
  solana: { label: "Solana", color: "bg-purple-500/10 text-purple-600", explorer: "https://solscan.io/account/" },
  ton: { label: "TON", color: "bg-cyan-500/10 text-cyan-600", explorer: "https://tonscan.org/address/" },
};

export const ProfileLinkedWallets = ({ userId, isOwnProfile }: ProfileLinkedWalletsProps) => {
  const { wallets, loading, unlinkWallet, setPrimaryWallet } = useUserWallets(userId);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleUnlink = async () => {
    if (walletToDelete) {
      await unlinkWallet(walletToDelete);
      setWalletToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Linked Wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Linked Wallets
            </CardTitle>
            {isOwnProfile && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLinkDialogOpen(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Link Wallet
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isOwnProfile 
                ? "No wallets linked yet. Link your first wallet to enable cross-chain identity."
                : "No wallets linked to this profile."
              }
            </p>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => {
                const config = WALLET_TYPE_CONFIG[wallet.wallet_type];
                return (
                  <div 
                    key={wallet.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={config.color} variant="secondary">
                        {config.label}
                      </Badge>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm truncate">
                          {wallet.display_name || truncateAddress(wallet.wallet_address)}
                        </span>
                        <button
                          onClick={() => copyAddress(wallet.wallet_address)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress === wallet.wallet_address ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                        {config.explorer && (
                          <a
                            href={`${config.explorer}${wallet.wallet_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="View on explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                      {wallet.is_primary && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 gap-1">
                          <Star className="h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    
                    {isOwnProfile && (
                      <div className="flex items-center gap-1">
                        {!wallet.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrimaryWallet(wallet.id)}
                            className="text-xs"
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWalletToDelete(wallet.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <LinkWalletDialog 
        open={linkDialogOpen} 
        onOpenChange={setLinkDialogOpen} 
      />

      <AlertDialog open={!!walletToDelete} onOpenChange={() => setWalletToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this wallet? You can always link it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-destructive text-destructive-foreground">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

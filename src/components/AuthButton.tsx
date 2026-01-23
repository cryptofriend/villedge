import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, Copy, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export function AuthButton() {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const handleSignOut = async () => {
    try {
      disconnect();
      const { error } = await signOut();
      if (error) {
        toast.error('Failed to sign out');
      } else {
        toast.success('Disconnected successfully');
      }
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
    );
  }

  if (!isAuthenticated || !address) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Sign In"
      >
        <LogIn className="h-4 w-4" />
      </button>
    );
  }

  // Truncate address: 0x1234...5678
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 px-3 bg-card/90 backdrop-blur-sm border-border/50 hover:bg-card"
        >
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs">{truncatedAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Connected Wallet</p>
            <p className="text-xs text-muted-foreground font-mono">{truncatedAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut} 
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

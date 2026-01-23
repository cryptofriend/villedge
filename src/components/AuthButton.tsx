import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, Wallet } from 'lucide-react';
import { ProfileDialog } from './ProfileDialog';

export function AuthButton() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading } = useAuth();
  const { address } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const [profileOpen, setProfileOpen] = useState(false);

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
  
  // Check if user has set a custom display name (not just the wallet address format)
  const hasCustomName = profile?.display_name && 
    !profile.display_name.startsWith('0x') && 
    profile.display_name !== truncatedAddress;
  
  const displayName = hasCustomName ? profile?.display_name : truncatedAddress;
  const initials = (displayName || 'U').slice(0, 2).toUpperCase();

  // Format balance
  const formattedBalance = balanceData 
    ? `${(Number(balanceData.value) / 10 ** balanceData.decimals).toFixed(4)} ${balanceData.symbol}`
    : null;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 px-2 bg-card/90 backdrop-blur-sm border-border/50 hover:bg-card"
        onClick={() => setProfileOpen(true)}
      >
        {hasCustomName ? (
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName || ''} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Wallet className="h-4 w-4 text-primary" />
        )}
        <div className="flex flex-col items-start leading-none">
          <span className="text-xs font-medium hidden sm:inline max-w-24 truncate">
            {displayName}
          </span>
          {formattedBalance && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {formattedBalance}
            </span>
          )}
        </div>
      </Button>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

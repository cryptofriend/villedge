import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, LogOut, Wallet } from 'lucide-react';
import { ProfileDialog } from './ProfileDialog';
import { toast } from 'sonner';

export function AuthButton() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading, signOut } = useAuth();
  const { address: evmAddress } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();
  const { data: balanceData } = useBalance({ address: evmAddress });
  
  // TON wallet
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Determine which wallet is connected
  const tonAddress = tonWallet?.account?.address;
  const activeAddress = evmAddress || tonAddress;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Disconnect all wallet types
      if (evmAddress) {
        disconnectEvm();
      }
      if (tonWallet) {
        await tonConnectUI.disconnect();
      }
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
    );
  }

  if (!isAuthenticated) {
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

  // Truncate address for display
  const truncatedAddress = activeAddress 
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : profile?.username || 'User';
  
  // Use username by default, fallback to truncated address
  const displayName = profile?.username || truncatedAddress;
  const initials = (displayName || 'U').slice(0, 2).toUpperCase();
  
  // Check if user has a proper username set (not just wallet-generated)
  const hasUsername = profile?.username && 
    !profile.username.startsWith('0x') && 
    !profile.username.startsWith('0:');

  // Format balance (only for EVM wallets)
  const formattedBalance = balanceData 
    ? `${(Number(balanceData.value) / 10 ** balanceData.decimals).toFixed(4)} ${balanceData.symbol}`
    : null;

  // Get profile URL - use username if available, fallback to user_id
  const profileUrl = profile?.username 
    ? `/profile/${profile.username}` 
    : `/profile/${user?.id}`;

  return (
    <>
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 px-2 bg-card/90 backdrop-blur-sm border-border/50 hover:bg-card"
          onClick={() => navigate(profileUrl)}
        >
          {hasUsername ? (
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

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Keep ProfileDialog for quick edits if needed */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

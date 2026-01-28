import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Shield, Fingerprint, Globe, Sparkles, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Check if Privy is available
const PRIVY_ENABLED = !!import.meta.env.VITE_PRIVY_APP_ID;

// Conditionally import Privy hooks
let usePrivy: any = () => ({ authenticated: false, user: null, logout: () => {} });
let usePrivyLogin: any = () => ({ login: () => {} });

if (PRIVY_ENABLED) {
  try {
    const privyModule = await import('@privy-io/react-auth');
    usePrivy = privyModule.usePrivy;
    usePrivyLogin = privyModule.useLogin;
  } catch (e) {
    console.warn('Privy not available');
  }
}

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const { user } = useAuth();
  
  // Porto/Biometric wallet
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Solana wallet
  const { publicKey, connected: solanaConnected, connecting: solanaConnecting, disconnect: disconnectSolana } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  
  // TON wallet
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  
  // Privy - only use if enabled
  const privyState = PRIVY_ENABLED ? usePrivy() : { authenticated: false, user: null, logout: () => {} };
  const { authenticated: privyAuthenticated, user: privyUser, logout: privyLogout } = privyState;
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'ton' | 'privy' | null>(null);

  // Close dialog when user authenticates
  useEffect(() => {
    if (user && open) {
      onOpenChange(false);
      onSuccess?.();
    }
  }, [user, open, onOpenChange, onSuccess]);

  // When Porto/Ethereum wallet connects, authenticate with backend
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating && (authType === 'biometric' || authType === 'ethereum')) {
      authenticateWithBackend(address, authType === 'biometric' ? 'porto' : 'ethereum');
    }
  }, [isConnected, address, user, isAuthenticating, authType]);

  // When Solana wallet connects, authenticate with backend
  useEffect(() => {
    if (solanaConnected && publicKey && !user && !isAuthenticating && authType === 'solana') {
      authenticateWithBackend(publicKey.toBase58(), 'solana');
    }
  }, [solanaConnected, publicKey, user, isAuthenticating, authType]);

  // When TON wallet connects, authenticate with backend
  useEffect(() => {
    if (tonWallet && !user && !isAuthenticating && authType === 'ton') {
      const tonAddress = tonWallet.account.address;
      authenticateWithBackend(tonAddress, 'ton');
    }
  }, [tonWallet, user, isAuthenticating, authType]);

  // When Privy authenticates, sync with backend
  useEffect(() => {
    if (privyAuthenticated && privyUser && !user && !isAuthenticating && authType === 'privy') {
      const email = privyUser.email?.address;
      const walletAddress = privyUser.wallet?.address;
      authenticateWithPrivy(privyUser.id, email, walletAddress);
    }
  }, [privyAuthenticated, privyUser, user, isAuthenticating, authType]);

  const authenticateWithPrivy = async (privyUserId: string, email?: string, walletAddress?: string) => {
    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('privy-auth', {
        body: { privyUserId, email, walletAddress },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Authentication failed');
      }

      if (data?.verified && data?.actionLink) {
        const url = new URL(data.actionLink);
        const token = url.searchParams.get('token');
        const tokenType = url.searchParams.get('type');

        if (token && tokenType) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: tokenType as 'magiclink',
          });

          if (sessionError) throw sessionError;
        }

        toast.success('Welcome to Villedge!');
      }
    } catch (error) {
      console.error('Privy auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      privyLogout();
    } finally {
      setIsAuthenticating(false);
      setAuthType(null);
    }
  };

  const authenticateWithBackend = async (walletAddress: string, type: 'porto' | 'solana' | 'ethereum' | 'ton') => {
    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('porto-auth', {
        body: { address: walletAddress, walletType: type },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Authentication failed');
      }

      if (data?.verified && data?.actionLink) {
        const url = new URL(data.actionLink);
        const token = url.searchParams.get('token');
        const tokenType = url.searchParams.get('type');

        if (token && tokenType) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: tokenType as 'magiclink',
          });

          if (sessionError) throw sessionError;
        }

        toast.success('Welcome to Villedge!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      if (type === 'solana') {
        disconnectSolana();
      } else if (type === 'ton') {
        tonConnectUI.disconnect();
      } else {
        disconnect();
      }
    } finally {
      setIsAuthenticating(false);
      setAuthType(null);
    }
  };

  const handleBiometricConnect = () => {
    setAuthType('biometric');
    const portoConnector = connectors.find(c => c.id === 'porto' || c.name.toLowerCase().includes('porto'));
    if (portoConnector) {
      connect({ connector: portoConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      toast.error('No wallet connector available');
      setAuthType(null);
    }
  };

  const handleTonConnect = async () => {
    setAuthType('ton');
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('TON connect error:', error);
      toast.error('Failed to open TON wallet modal');
      setAuthType(null);
    }
  };

  // Privy login hook - only use if enabled
  const privyLoginHook = PRIVY_ENABLED ? usePrivyLogin({
    onComplete: () => {
      // Will be handled by the useEffect when privyAuthenticated changes
    },
    onError: (error: any) => {
      console.error('Privy login error:', error);
      toast.error('Login failed');
      setAuthType(null);
    },
  }) : { login: () => {} };

  const handlePrivyConnect = () => {
    if (!PRIVY_ENABLED) {
      toast.error('Email login not configured');
      return;
    }
    setAuthType('privy');
    privyLoginHook.login();
  };

  const isBiometricLoading = (isConnecting || isAuthenticating) && authType === 'biometric';
  const isTonLoading = isAuthenticating && authType === 'ton';
  const isPrivyLoading = isAuthenticating && authType === 'privy';
  const anyLoading = isBiometricLoading || isTonLoading || isPrivyLoading;

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="sm:max-w-md max-w-[90vw] p-0 gap-0 overflow-hidden bg-background border-border z-50 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with branding */}
        <div className="bg-gradient-to-br from-primary/5 via-sage-100/30 to-primary/10 p-6 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">Villedge</span>
            </div>
            <DialogTitle className="text-center text-2xl font-display font-bold">
              Join the Network
            </DialogTitle>
            <p className="text-center text-sm text-muted-foreground">
              Sign in to explore popup villages
            </p>
          </DialogHeader>
        </div>

        {/* Login content */}
        <div className="p-6 space-y-4">
          {/* Privy Button - Email & Social (Primary) */}
          <Button
            onClick={handlePrivyConnect}
            className="w-full h-12 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
            disabled={anyLoading}
          >
            {isPrivyLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span>Sign in with Email</span>
              </div>
            )}
          </Button>

          {/* Biometric & Telegram Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Biometric Button */}
            <Button
              onClick={handleBiometricConnect}
              variant="outline"
              className="h-11 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
              disabled={anyLoading}
            >
              {isBiometricLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" />
                  <span>Biometric</span>
                </div>
              )}
            </Button>

            {/* Telegram Button */}
            <Button
              onClick={handleTonConnect}
              variant="outline"
              className="h-11 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
              disabled={anyLoading}
            >
              {isTonLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.22 15.51 15.99C15.37 16.74 15.09 16.99 14.83 17.02C14.25 17.07 13.81 16.64 13.25 16.27C12.37 15.69 11.87 15.33 11.02 14.77C10.03 14.12 10.67 13.76 11.24 13.18C11.39 13.03 13.95 10.7 14 10.49C14.0069 10.4582 14.006 10.4252 13.9973 10.3938C13.9886 10.3624 13.972 10.3337 13.96 10.31C13.89 10.26 13.78 10.28 13.69 10.3C13.57 10.32 12.22 11.16 9.59 12.82C9.19 13.09 8.83 13.22 8.51 13.21C8.15 13.2 7.47 13.01 6.96 12.85C6.33 12.65 5.84 12.54 5.88 12.19C5.9 12.01 6.15 11.82 6.62 11.63C9.44 10.39 11.34 9.58 12.32 9.19C15 8.07 15.55 7.89 15.92 7.88C15.99 7.88 16.16 7.9 16.27 7.99C16.36 8.06 16.39 8.16 16.4 8.24C16.39 8.3 16.41 8.47 16.4 8.59L16.64 8.8Z" fill="currentColor"/>
                  </svg>
                  <span>Telegram</span>
                </div>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">secure & decentralized</span>
            </div>
          </div>

          {/* Features */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/70 pt-2">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Self-Custody
            </span>
            <span className="flex items-center gap-1">
              <Fingerprint className="h-3 w-3" />
              Passwordless
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Cross-Platform
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

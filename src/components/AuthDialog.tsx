import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Shield, Fingerprint, Globe, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MagicLoginButton } from '@/components/auth/MagicLoginButton';
import { TelegramLoginWidget } from '@/components/auth/TelegramLoginWidget';
import { OnboardingDialog } from '@/components/OnboardingDialog';

// Telegram bot ID (numeric) - proofofretreatbot
const TELEGRAM_BOT_ID = '7911561126';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Porto/Biometric wallet
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Solana wallet
  const { publicKey, connected: solanaConnected, connecting: solanaConnecting, disconnect: disconnectSolana } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'telegram' | 'magic' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const authenticateWithBackend = async (walletAddress: string, type: 'porto' | 'solana' | 'ethereum') => {
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

  const isBiometricLoading = (isConnecting || isAuthenticating) && authType === 'biometric';
  const isTelegramLoading = isAuthenticating && authType === 'telegram';
  const isMagicLoading = isAuthenticating && authType === 'magic';
  const anyLoading = isBiometricLoading || isTelegramLoading || isMagicLoading;

  return (
    <>
      <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
      <Dialog open={open && !showOnboarding} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="sm:max-w-md max-w-[90vw] p-0 gap-0 overflow-hidden bg-background border-border z-50 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with branding */}
        <div className="bg-gradient-to-br from-primary/5 via-sage-100/30 to-primary/10 p-6 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
                title="Back to Home"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Back Home</span>
              </button>
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
          {/* Magic Link Button - Email with Wallet (Primary) */}
          <MagicLoginButton
            disabled={anyLoading}
            className="w-full h-12 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
            onStart={() => setAuthType('magic')}
            onSuccess={(isNewUser) => {
              if (isNewUser) {
                setShowOnboarding(true);
              }
            }}
            onError={() => setAuthType(null)}
          />

          {/* Biometric & Telegram Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Biometric Button */}
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={handleBiometricConnect}
                variant="outline"
                className="w-full h-11 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
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
              <span className="text-[10px] text-muted-foreground/60">Works on Safari & Chrome</span>
            </div>

            {/* Telegram Button */}
            <div className="flex flex-col items-center gap-1">
            <TelegramLoginWidget
                botName={TELEGRAM_BOT_ID}
                disabled={anyLoading}
                isLoading={isTelegramLoading}
                onStart={() => setAuthType('telegram')}
                onSuccess={(isNewUser) => {
                  if (isNewUser) {
                    setShowOnboarding(true);
                  } else {
                    toast.success('Welcome back!');
                  }
                }}
                onError={() => setAuthType(null)}
                className="w-full"
              />
              <span className="text-[10px] text-muted-foreground/60">Works perfect with TG app</span>
            </div>
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
    </>
  );
}
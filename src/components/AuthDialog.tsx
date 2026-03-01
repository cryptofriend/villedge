import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Fingerprint, ChevronDown, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PrivyLoginButton } from '@/components/auth/PrivyLoginButton';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { lovable } from '@/integrations/lovable';


interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();
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
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'magic' | 'google' | 'ton' | null>(null);
  
  const TelegramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOtherMethods, setShowOtherMethods] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthType('google');
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + location.pathname,
      });
      if (error) {
        toast.error(error.message || 'Google login failed');
        setAuthType(null);
      }
    } catch (err) {
      console.error('Google login error:', err);
      toast.error('Google login failed');
      setAuthType(null);
    }
  };

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

  const handleTonConnect = () => {
    setAuthType('ton');
    tonConnectUI.openModal();
  };

  const isBiometricLoading = (isConnecting || isAuthenticating) && authType === 'biometric';
  const isMagicLoading = isAuthenticating && authType === 'magic';
  const isGoogleBtnLoading = authType === 'google';
  const isTonLoading = isAuthenticating && authType === 'ton';
  const anyLoading = isBiometricLoading || isMagicLoading || isGoogleBtnLoading || isTonLoading;

  return (
    <>
      <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
      <Dialog open={open && !showOnboarding} onOpenChange={() => {}} modal={true}>
        <DialogContent 
          className="sm:max-w-md max-w-[90vw] p-0 gap-0 overflow-hidden bg-background border-border z-50 [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Simple centered content like homepage */}
          <div className="flex flex-col items-center justify-center px-6 py-8 space-y-6">
            {/* Back Home Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="self-start -ml-2 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to map
            </Button>

            {/* Header */}
            <h2 className="font-display text-3xl font-bold text-foreground">Get Started</h2>

            {/* Login Buttons */}
            <div className="w-full max-w-sm space-y-3">
              {/* Google Sign In - Primary */}
              <Button
                onClick={handleGoogleLogin}
                disabled={anyLoading}
                className="w-full h-14 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                {isGoogleBtnLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                )}
              </Button>

              {/* Other Methods Collapsible */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowOtherMethods(!showOtherMethods)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Other Methods</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showOtherMethods ? 'rotate-180' : ''}`} />
                </button>

                {showOtherMethods && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Privy Email Button */}
                    <PrivyLoginButton
                      disabled={anyLoading}
                      className="w-full h-12 text-sm font-medium border-2 border-border bg-background hover:bg-muted text-foreground rounded-xl transition-all duration-200"
                      onStart={() => setAuthType('magic')}
                      onSuccess={(isNewUser) => {
                        if (isNewUser) {
                          setShowOnboarding(true);
                        }
                      }}
                      onError={() => setAuthType(null)}
                    />

                    {/* Biometric & TON Row */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Biometric Login */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          onClick={handleBiometricConnect}
                          variant="outline"
                          className="w-full h-12 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
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
                        <span className="text-[10px] text-muted-foreground/60">Works with Safari and Chrome</span>
                      </div>

                      {/* TON Login */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          onClick={handleTonConnect}
                          variant="outline"
                          className="w-full h-12 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
                          disabled={anyLoading}
                        >
                          {isTonLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <TelegramIcon className="h-5 w-5" />
                              <span>TON</span>
                            </div>
                          )}
                        </Button>
                        <span className="text-[10px] text-muted-foreground/60">TON Wallet</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Shield, Fingerprint, Globe, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramSafe } from '@/components/TelegramProvider';

// Telegram Login Widget bot username
const TELEGRAM_BOT_USERNAME = 'villedge_bot';

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Declare global Telegram widget callback
declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const { user } = useAuth();
  const telegram = useTelegramSafe();
  const telegramWidgetRef = useRef<HTMLDivElement>(null);
  
  // Porto/Biometric wallet
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Solana wallet
  const { publicKey, connected: solanaConnected, connecting: solanaConnecting, disconnect: disconnectSolana } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'telegram' | 'telegram-web' | null>(null);

  // Telegram state
  const isTelegram = telegram?.isTelegram && telegram?.user;

  // Handle Telegram Web Login callback
  const handleTelegramWebAuth = useCallback(async (authData: TelegramAuthData) => {
    console.log('Telegram Web Auth callback received:', authData);
    setAuthType('telegram-web');
    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('telegram-web-auth', {
        body: { 
          telegramAuthData: {
            id: String(authData.id),
            first_name: authData.first_name,
            last_name: authData.last_name || '',
            username: authData.username || '',
            photo_url: authData.photo_url || '',
            auth_date: String(authData.auth_date),
            hash: authData.hash,
          },
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Authentication failed');
      }

      if (data?.actionLink) {
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
        
        toast.success(`Welcome, ${authData.first_name}!`);
      }
    } catch (error) {
      console.error('Telegram Web auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
      setAuthType(null);
    }
  }, []);

  // Set up global callback for Telegram widget
  useEffect(() => {
    window.onTelegramAuth = handleTelegramWebAuth;
    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramWebAuth]);

  // Load Telegram Login Widget script when dialog opens (for non-Telegram web users)
  useEffect(() => {
    if (!open || isTelegram || !telegramWidgetRef.current) return;
    
    // Clear any existing widget
    telegramWidgetRef.current.innerHTML = '';
    
    // Create and append the Telegram Login Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    
    telegramWidgetRef.current.appendChild(script);
    
    return () => {
      if (telegramWidgetRef.current) {
        telegramWidgetRef.current.innerHTML = '';
      }
    };
  }, [open, isTelegram]);

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

  const handleTelegramLogin = async () => {
    if (!telegram?.user) return;
    
    setAuthType('telegram');
    setIsAuthenticating(true);
    
    try {
      const telegramAddress = `telegram_${telegram.user.id}`;
      
      const { data, error } = await supabase.functions.invoke('porto-auth', {
        body: { 
          address: telegramAddress,
          telegramUser: telegram.user,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Authentication failed');
      }

      if (data?.actionLink) {
        // Extract tokens from the action link
        const url = new URL(data.actionLink);
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
          
          telegram.haptic?.notification('success');
          toast.success(`Welcome, ${telegram.user.first_name}!`);
        }
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      telegram.haptic?.notification('error');
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
  const isTelegramLoading = isAuthenticating && (authType === 'telegram' || authType === 'telegram-web');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[90vw] p-0 gap-0 overflow-hidden bg-background border-border">
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
          {/* Biometric Button */}
          <Button
            onClick={handleBiometricConnect}
            className="w-full h-12 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
            disabled={isBiometricLoading || isTelegramLoading}
          >
            {isBiometricLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{isAuthenticating ? 'Signing in...' : 'Connecting...'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                <span>Sign in with Biometric</span>
              </div>
            )}
          </Button>

          {/* Telegram Button - always visible */}
          {isTelegram && telegram.user && (
            /* Telegram user preview - only when in Telegram */
            <div className="flex items-center gap-3 p-3 bg-[#0088cc]/5 rounded-xl border border-[#0088cc]/20">
              <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center overflow-hidden">
                {telegram.user?.photo_url ? (
                  <img 
                    src={telegram.user.photo_url} 
                    alt={telegram.user.first_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {telegram.user?.first_name} {telegram.user?.last_name || ''}
                </p>
                {telegram.user?.username && (
                  <p className="text-xs text-muted-foreground truncate">
                    @{telegram.user.username}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Telegram Button - show inline button for Mini App, widget for web */}
          {isTelegram ? (
            <Button
              onClick={handleTelegramLogin}
              variant="outline"
              className="w-full h-12 text-base font-medium border-[#0088cc]/30 hover:bg-[#0088cc]/10 rounded-xl transition-all duration-200"
              disabled={isTelegramLoading || isBiometricLoading}
            >
              {isTelegramLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0088cc]" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span>Continue with Telegram</span>
                </div>
              )}
            </Button>
          ) : (
            /* Telegram Login Widget for web users */
            <div className="flex flex-col items-center gap-2">
              {isTelegramLoading ? (
                <div className="flex items-center gap-2 h-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0088cc]" />
                  <span>Signing in with Telegram...</span>
                </div>
              ) : (
                <div 
                  ref={telegramWidgetRef} 
                  className="flex justify-center min-h-[40px]"
                />
              )}
            </div>
          )}

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
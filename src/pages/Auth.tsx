import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, Fingerprint, Globe, Sparkles, Copy, Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Telegram bot username for URL authorization
const TELEGRAM_BOT_USERNAME = 'villedge_bot';

interface TelegramAuthData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

// Debug log collector
const debugLogs: string[] = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  debugLogs.push(`[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
  originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
  debugLogs.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
  originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  debugLogs.push(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`);
  originalConsoleWarn.apply(console, args);
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Get the redirect path from location state (set by protected routes)
  const from = (location.state as { from?: string })?.from || '/';
  
  // Porto/Biometric wallet
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Solana wallet
  const { publicKey, connected: solanaConnected, connecting: solanaConnecting, disconnect: disconnectSolana } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'telegram-web' | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Handle Telegram URL authorization callback
  const handleTelegramUrlAuth = useCallback(async (authData: TelegramAuthData) => {
    console.log('Telegram URL Auth callback received:', authData);
    setAuthType('telegram-web');
    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('telegram-web-auth', {
        body: { telegramAuthData: authData },
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
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Telegram URL auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
      setAuthType(null);
    }
  }, [from, navigate]);

  // Check for Telegram auth callback in URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramId = urlParams.get('id');
    const hash = urlParams.get('hash');
    
    if (telegramId && hash) {
      const authData: TelegramAuthData = {
        id: urlParams.get('id') || '',
        first_name: urlParams.get('first_name') || '',
        last_name: urlParams.get('last_name') || undefined,
        username: urlParams.get('username') || undefined,
        photo_url: urlParams.get('photo_url') || undefined,
        auth_date: urlParams.get('auth_date') || '',
        hash: hash,
      };
      
      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      handleTelegramUrlAuth(authData);
    }
  }, [handleTelegramUrlAuth]);

  // Handle web users clicking Telegram button - opens bot deep link
  const handleTelegramWebLogin = () => {
    const botUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=login`;
    window.open(botUrl, '_blank');
  };

  // Log wallet state for debugging
  useEffect(() => {
    console.log('[Auth] Connectors available:', connectors.map(c => ({ id: c.id, name: c.name })));
    console.log('[Auth] isConnected:', isConnected, 'address:', address);
    console.log('[Auth] solanaConnected:', solanaConnected, 'publicKey:', publicKey?.toBase58());
  }, [connectors, isConnected, address, solanaConnected, publicKey]);

  const copyLogsToClipboard = async () => {
    const logsText = debugLogs.slice(-50).join('\n');
    await navigator.clipboard.writeText(logsText);
    toast.success('Logs copied to clipboard!');
  };

  const copyWalletState = async () => {
    const state = {
      connectors: connectors.map(c => ({ id: c.id, name: c.name })),
      isConnected,
      address,
      solanaConnected,
      solanaPublicKey: publicKey?.toBase58(),
      authType,
      isAuthenticating,
      userAgent: navigator.userAgent,
      isIframe: window.self !== window.top,
    };
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    toast.success('Wallet state copied to clipboard!');
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

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
        navigate(from, { replace: true });
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

  const handleSolanaConnect = () => {
    setAuthType('solana');
    openSolanaModal(true);
  };

  const handleEthereumConnect = () => {
    setAuthType('ethereum');
    const injectedConnector = connectors.find(c => c.id === 'injected' || c.name.toLowerCase().includes('metamask'));
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else {
      toast.error('No Ethereum wallet detected. Please install MetaMask.');
      setAuthType(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isBiometricLoading = (isConnecting || isAuthenticating) && authType === 'biometric';
  const isSolanaLoading = (solanaConnecting || isAuthenticating) && authType === 'solana';
  const isEthereumLoading = (isConnecting || isAuthenticating) && authType === 'ethereum';
  const isTelegramLoading = isAuthenticating && authType === 'telegram-web';
  const anyLoading = isBiometricLoading || isSolanaLoading || isEthereumLoading || isTelegramLoading;

  const features = [
    {
      icon: Fingerprint,
      title: "Passkey Login",
      description: "No passwords needed. Use biometrics or device security."
    },
    {
      icon: Shield,
      title: "Self-Custody",
      description: "Your keys, your identity. Fully decentralized."
    },
    {
      icon: Globe,
      title: "Cross-Platform",
      description: "Works seamlessly across all your devices."
    },
  ];

  return (
    <div className="min-h-screen flex bg-background/50 backdrop-blur-sm">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-sage-100/30 to-primary/10 relative overflow-hidden backdrop-blur-sm">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-sage-200/30 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <span className="font-display text-2xl font-semibold text-foreground">Villedge</span>
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-bold text-foreground leading-tight mb-4">
              Join the global<br />
              <span className="text-primary">popup village</span><br />
              network
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Connect with like-minded builders, creators, and explorers at popup villages around the world.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mt-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-card/80 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex flex-col">
        {/* Back Button */}
        <div className="p-4 sm:p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Button>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Welcome to Villedge</h1>
              <p className="text-muted-foreground mt-1">Join the popup village network</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">Get Started</h2>
            </div>

            {/* Login Buttons */}
            <div className="space-y-3">
              {/* Biometric Button */}
              <Button
                onClick={handleBiometricConnect}
                className="w-full h-14 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                disabled={anyLoading}
              >
                {isBiometricLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{isAuthenticating ? 'Signing in...' : 'Connecting...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-5 w-5" />
                    <span>Sign in with Biometric</span>
                  </div>
                )}
              </Button>

              {/* Telegram Button */}
              <Button
                onClick={handleTelegramWebLogin}
                variant="outline"
                className="w-full h-14 text-base font-medium border-[#0088cc]/30 hover:bg-[#0088cc]/10 rounded-xl transition-all duration-200"
                disabled={anyLoading}
              >
                {isTelegramLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#0088cc]" />
                    <span>Signing in with Telegram...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    <span>Sign in with Telegram</span>
                  </div>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">secure & decentralized</span>
                </div>
              </div>

              {/* Info text */}
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
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

              {/* Debug Section */}
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                  className="w-full text-xs text-muted-foreground"
                >
                  <Bug className="h-3 w-3 mr-1" />
                  {showDebug ? 'Hide Debug' : 'Show Debug Tools'}
                </Button>
                
                {showDebug && (
                  <div className="mt-3 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyLogsToClipboard}
                      className="w-full text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Console Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyWalletState}
                      className="w-full text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Wallet State
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      isIframe: {String(window.self !== window.top)}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

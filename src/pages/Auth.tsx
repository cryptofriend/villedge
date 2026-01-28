import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, Fingerprint, Globe, Sparkles, Copy, Bug, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePrivyConfig } from '@/components/PrivyProvider';
import { PrivyLoginButton } from '@/components/auth/PrivyLoginButton';

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
  
  // TON wallet
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();

  const { appId: privyAppId, loading: privyAppIdLoading } = usePrivyConfig();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'ton' | 'privy' | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Log wallet state for debugging
  useEffect(() => {
    console.log('[Auth] Connectors available:', connectors.map(c => ({ id: c.id, name: c.name })));
    console.log('[Auth] isConnected:', isConnected, 'address:', address);
    console.log('[Auth] solanaConnected:', solanaConnected, 'publicKey:', publicKey?.toBase58());
    console.log('[Auth] tonWallet:', tonWallet?.account?.address);
  }, [connectors, isConnected, address, solanaConnected, publicKey, tonWallet]);

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
      tonConnected: !!tonWallet,
      tonAddress: tonWallet?.account?.address,
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

  // When TON wallet connects, authenticate with backend
  useEffect(() => {
    if (tonWallet && !user && !isAuthenticating && authType === 'ton') {
      // TON address is in raw format, convert to user-friendly format
      const tonAddress = tonWallet.account.address;
      authenticateWithBackend(tonAddress, 'ton');
    }
  }, [tonWallet, user, isAuthenticating, authType]);

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
        navigate(from, { replace: true });
      }
      return true;
    } catch (error) {
      console.error('Privy auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      return false;
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
        navigate(from, { replace: true });
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

  // Privy login is handled by <PrivyLoginButton /> when configured.

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
  const isTonLoading = isAuthenticating && authType === 'ton';
  const isPrivyLoading = isAuthenticating && authType === 'privy';
  const anyLoading = isBiometricLoading || isSolanaLoading || isEthereumLoading || isTonLoading || isPrivyLoading || privyAppIdLoading;

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
    <div className="min-h-screen flex bg-background/15 backdrop-blur-sm">
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
              {/* Privy Button - Email & Social (Primary) */}
              {privyAppId ? (
                <PrivyLoginButton
                  active={authType === 'privy'}
                  disabled={anyLoading}
                  isLoading={isPrivyLoading}
                  className="w-full h-14 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                  onStart={() => setAuthType('privy')}
                  onAuthenticated={async ({ privyUserId, email, walletAddress }) =>
                    authenticateWithPrivy(privyUserId, email, walletAddress)
                  }
                />
              ) : (
                <Button
                  onClick={() => toast.error('Email login not configured')}
                  className="w-full h-14 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                  disabled={anyLoading}
                >
                  {privyAppIdLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" />
                      <span>Sign in with Email</span>
                    </div>
                  )}
                </Button>
              )}

              {/* Biometric & Telegram Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Biometric Button */}
                <Button
                  onClick={handleBiometricConnect}
                  variant="outline"
                  className="h-12 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
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
                  className="h-12 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
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

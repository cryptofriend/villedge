import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, Fingerprint, Globe, Sparkles, Copy, Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | 'ethereum' | 'ton' | null>(null);
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
    // Use WalletConnect for Ethereum connection - find by name since ID can vary
    const wcConnector = connectors.find(c => 
      c.name.toLowerCase().includes('walletconnect') || c.id.includes('walletConnect')
    );
    console.log('[Auth] Available connectors for ETH:', connectors.map(c => ({ id: c.id, name: c.name })));
    if (wcConnector) {
      connect({ connector: wcConnector });
    } else {
      toast.error('WalletConnect not configured. Please check project settings.');
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
  const anyLoading = isBiometricLoading || isSolanaLoading || isEthereumLoading || isTonLoading;

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

              {/* Chain Buttons Row */}
              <div className="flex gap-2">
                {/* ETH Button */}
                <Button
                  onClick={handleEthereumConnect}
                  variant="outline"
                  className="flex-1 h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#627EEA]/10 hover:border-[#627EEA] transition-all duration-200"
                  disabled={anyLoading}
                >
                  {isEthereumLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5" viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#343434" d="m127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/>
                        <path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
                        <path fill="#3C3C3B" d="m127.961 312.187l-1.575 1.92v98.199l1.575 4.601L256 236.587z"/>
                        <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z"/>
                        <path fill="#141414" d="m127.961 287.958l127.96-75.637l-127.96-58.162z"/>
                        <path fill="#393939" d="m.001 212.321l127.96 75.637V154.159z"/>
                      </svg>
                      <span>ETH</span>
                    </div>
                  )}
                </Button>

                {/* SOL Button */}
                <Button
                  onClick={handleSolanaConnect}
                  variant="outline"
                  className="flex-1 h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#9945FF]/10 hover:border-[#9945FF] transition-all duration-200"
                  disabled={anyLoading}
                >
                  {isSolanaLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5" viewBox="0 0 397 311" xmlns="http://www.w3.org/2000/svg">
                        <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00FFA3"/>
                          <stop offset="100%" stopColor="#DC1FFF"/>
                        </linearGradient>
                        <path fill="url(#solana-gradient)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
                        <path fill="url(#solana-gradient)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
                        <path fill="url(#solana-gradient)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
                      </svg>
                      <span>SOL</span>
                    </div>
                  )}
                </Button>

                {/* Telegram Button */}
                <Button
                  onClick={handleTonConnect}
                  variant="outline"
                  className="flex-1 h-12 text-sm font-medium rounded-xl border-2 hover:bg-[#0098EA]/10 hover:border-[#0098EA] transition-all duration-200"
                  disabled={anyLoading}
                >
                  {isTonLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0098EA" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      <span>TG</span>
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

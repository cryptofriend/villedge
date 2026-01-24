import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, Fingerprint, Globe, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Porto/Biometric wallet
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Solana wallet
  const { publicKey, connected: solanaConnected, disconnect: disconnectSolana } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'solana' | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // When Porto wallet connects, authenticate with backend
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating && authType === 'biometric') {
      authenticateWithBackend(address, 'porto');
    }
  }, [isConnected, address, user, isAuthenticating, authType]);

  // When Solana wallet connects, authenticate with backend
  useEffect(() => {
    if (solanaConnected && publicKey && !user && !isAuthenticating && authType === 'solana') {
      authenticateWithBackend(publicKey.toBase58(), 'solana');
    }
  }, [solanaConnected, publicKey, user, isAuthenticating, authType]);

  const authenticateWithBackend = async (walletAddress: string, type: 'porto' | 'solana') => {
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
        navigate('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      if (type === 'porto') {
        disconnect();
      } else {
        disconnectSolana();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isBiometricLoading = (isConnecting || isAuthenticating) && authType === 'biometric';
  const isSolanaLoading = isAuthenticating && authType === 'solana';

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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-sage-100/50 to-primary/10 relative overflow-hidden">
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
                disabled={isBiometricLoading || isSolanaLoading}
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

              {/* Solana Button */}
              <Button
                onClick={handleSolanaConnect}
                variant="outline"
                className="w-full h-14 text-base font-medium rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 bg-gradient-to-r from-[#9945FF]/10 to-[#14F195]/10 border-[#9945FF]/30 hover:border-[#9945FF]/50"
                disabled={isBiometricLoading || isSolanaLoading}
              >
                {isSolanaLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="solanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9945FF" />
                          <stop offset="100%" stopColor="#14F195" />
                        </linearGradient>
                      </defs>
                      <path d="M25.7 97.9c.7-.7 1.6-1.1 2.6-1.1h95.2c1.6 0 2.5 2 1.4 3.1l-19.6 19.6c-.7.7-1.6 1.1-2.6 1.1H7.5c-1.6 0-2.5-2-1.4-3.1l19.6-19.6z" fill="url(#solanaGradient)"/>
                      <path d="M25.7 8.5c.7-.7 1.7-1.1 2.6-1.1h95.2c1.6 0 2.5 2 1.4 3.1L105.3 30c-.7.7-1.6 1.1-2.6 1.1H7.5c-1.6 0-2.5-2-1.4-3.1L25.7 8.5z" fill="url(#solanaGradient)"/>
                      <path d="M105.3 52.9c-.7-.7-1.6-1.1-2.6-1.1H7.5c-1.6 0-2.5 2-1.4 3.1l19.6 19.6c.7.7 1.6 1.1 2.6 1.1h95.2c1.6 0 2.5-2 1.4-3.1L105.3 52.9z" fill="url(#solanaGradient)"/>
                    </svg>
                    <span>Sign in with Solana</span>
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

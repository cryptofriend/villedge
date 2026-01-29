import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Shield, Fingerprint, Globe, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MagicLoginButton } from '@/components/auth/MagicLoginButton';
import { TelegramLoginWidget } from '@/components/auth/TelegramLoginWidget';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { lovable } from '@/integrations/lovable';

// Telegram bot ID (numeric) - proofofretreatbot
const TELEGRAM_BOT_ID = '7911561126';

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
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<'biometric' | 'telegram' | 'magic' | 'google' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthType('google');
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
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

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  // When Porto/Biometric wallet connects, authenticate with backend
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating && authType === 'biometric') {
      authenticateWithBackend(address, 'porto');
    }
  }, [isConnected, address, user, isAuthenticating, authType]);

  const authenticateWithBackend = async (walletAddress: string, type: 'porto') => {
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
      disconnect();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isBiometricLoading = (isConnecting || isAuthenticating) && authType === 'biometric';
  const isTelegramLoading = isAuthenticating && authType === 'telegram';
  const isMagicLoading = isAuthenticating && authType === 'magic';
  const isGoogleLoading = authType === 'google';
  const anyLoading = isBiometricLoading || isTelegramLoading || isMagicLoading || isGoogleLoading;

  return (
    <>
      <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
      <div className="min-h-screen flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-background rounded-2xl shadow-xl border border-border overflow-hidden">
          {/* Header with branding */}
          <div className="bg-gradient-to-br from-primary/5 via-sage-100/30 to-primary/10 p-6 pb-4">
            <div className="space-y-3">
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
              <h1 className="text-center text-2xl font-display font-bold">
                Join the Network
              </h1>
              <p className="text-center text-sm text-muted-foreground">
                Sign in to explore popup villages
              </p>
            </div>
          </div>

          {/* Login content */}
          <div className="p-6 space-y-4">
            {/* Google Sign In - Primary */}
            <Button
              onClick={handleGoogleLogin}
              disabled={anyLoading}
              className="w-full h-12 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              {isGoogleLoading ? (
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

            {/* Magic Link Button - Email with Wallet */}
            <MagicLoginButton
              disabled={anyLoading}
              className="w-full h-12 text-base font-medium border-2 border-border bg-background hover:bg-muted text-foreground rounded-xl transition-all duration-200"
              onStart={() => setAuthType('magic')}
              onSuccess={(isNewUser) => {
                if (isNewUser) {
                  setShowOnboarding(true);
                } else {
                  navigate(from, { replace: true });
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
                      navigate(from, { replace: true });
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
        </div>
      </div>
    </>
  );
}

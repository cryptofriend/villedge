import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // When wallet connects, authenticate with backend
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating) {
      authenticateWithBackend(address);
    }
  }, [isConnected, address, user, isAuthenticating]);

  const authenticateWithBackend = async (walletAddress: string) => {
    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('porto-auth', {
        body: { address: walletAddress },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Authentication failed');
      }

      if (data?.verified && data?.actionLink) {
        const url = new URL(data.actionLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');

        if (token && type) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink',
          });

          if (sessionError) throw sessionError;
        }

        toast.success('Signed in with Porto!');
        navigate('/');
      }
    } catch (error) {
      console.error('Porto auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      disconnect();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleConnect = () => {
    const portoConnector = connectors.find(c => c.id === 'porto' || c.name.toLowerCase().includes('porto'));
    if (portoConnector) {
      connect({ connector: portoConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      toast.error('No wallet connector available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = isConnecting || isAuthenticating;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Welcome to Villedge</CardTitle>
          <CardDescription>Sign in with your Porto wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleConnect}
            className="w-full gap-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {isAuthenticating ? 'Signing in...' : 'Connecting...'}
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                Connect with Porto
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Porto provides secure passkey-based authentication
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

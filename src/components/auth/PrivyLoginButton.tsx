import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { supabase } from '@/integrations/supabase/client';

interface PrivyLoginButtonProps {
  disabled?: boolean;
  className?: string;
  onStart?: () => void;
  onSuccess?: (isNewUser: boolean) => void;
  onError?: (error: string) => void;
}

export function PrivyLoginButton({
  disabled = false,
  className,
  onStart,
  onSuccess,
  onError,
}: PrivyLoginButtonProps) {
  const { ready, authenticated, user } = usePrivy();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasTriggeredAuth, setHasTriggeredAuth] = useState(false);

  const { login } = useLogin({
    onComplete: ({ user, isNewUser }) => {
      console.log('Privy login complete:', user.id, 'isNewUser:', isNewUser);
      setHasTriggeredAuth(true);
    },
    onError: (error) => {
      console.error('Privy login error:', error);
      toast.error('Login failed');
      onError?.(String(error) || 'Login failed');
      setIsAuthenticating(false);
    },
  });

  // Handle Supabase auth after Privy authentication
  useEffect(() => {
    if (!ready || !authenticated || !user || !hasTriggeredAuth || isAuthenticating) {
      return;
    }

    const authenticateWithSupabase = async () => {
      setIsAuthenticating(true);

      try {
        // Get user info from Privy
        const privyUserId = user.id;
        const email = user.email?.address;
        const walletAddress = user.wallet?.address;

        console.log('Authenticating with Supabase:', { privyUserId, email, walletAddress });

        // Call our backend to authenticate
        const { data, error } = await supabase.functions.invoke('privy-auth', {
          body: {
            privyUserId,
            email,
            walletAddress,
          },
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

          if (data?.isNewUser) {
            onSuccess?.(true);
          } else {
            toast.success('Welcome back!');
            onSuccess?.(false);
          }
        }
      } catch (error) {
        console.error('Privy-Supabase auth error:', error);
        const message = error instanceof Error ? error.message : 'Authentication failed';
        toast.error(message);
        onError?.(message);
      } finally {
        setIsAuthenticating(false);
        setHasTriggeredAuth(false);
      }
    };

    authenticateWithSupabase();
  }, [ready, authenticated, user, hasTriggeredAuth, isAuthenticating, onSuccess, onError]);

  const handleClick = () => {
    onStart?.();
    login();
  };

  const isLoading = !ready || isAuthenticating;
  const isDisabled = disabled || isLoading;

  return (
    <Button
      onClick={handleClick}
      className={className}
      disabled={isDisabled}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <span>Sign in with Email or Crypto</span>
        </div>
      )}
    </Button>
  );
}

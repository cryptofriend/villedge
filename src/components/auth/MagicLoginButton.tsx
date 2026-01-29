import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useMagic } from '@/components/MagicProvider';
import { supabase } from '@/integrations/supabase/client';

interface MagicLoginButtonProps {
  disabled?: boolean;
  className?: string;
  onStart?: () => void;
  onSuccess?: (isNewUser: boolean) => void;
  onError?: (error: string) => void;
}

export function MagicLoginButton({
  disabled = false,
  className,
  onStart,
  onSuccess,
  onError,
}: MagicLoginButtonProps) {
  const { magic, loading: magicLoading } = useMagic();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!magic) {
      toast.error('Magic not configured');
      onError?.('Magic not configured');
      return;
    }

    setIsLoading(true);
    onStart?.();

    try {
      // Login with Magic - this opens the magic link flow
      const didToken = await magic.auth.loginWithEmailOTP({ email: email.trim() });

      if (!didToken) {
        throw new Error('Failed to get DID token');
      }

      // Get user metadata from Magic
      const userInfo = await magic.user.getInfo();
      
      // Get the wallet address - Magic stores it as publicAddress
      const walletAddress = (userInfo as { publicAddress?: string }).publicAddress;

      // Call our backend to verify and authenticate
      const { data, error } = await supabase.functions.invoke('magic-auth', {
        body: {
          didToken,
          email: userInfo.email,
          publicAddress: walletAddress,
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
      console.error('Magic auth error:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || magicLoading || isLoading;

  if (!showEmailInput) {
    return (
      <Button
        onClick={() => setShowEmailInput(true)}
        className={className}
        disabled={isDisabled}
      >
        {magicLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <span>Sign in with Email</span>
          </div>
        )}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          disabled={isDisabled}
          className="flex-1 h-12 rounded-xl"
          autoFocus
        />
        <Button
          onClick={handleLogin}
          disabled={isDisabled || !email.trim()}
          className="h-12 px-4 rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => {
          setShowEmailInput(false);
          setEmail('');
        }}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        disabled={isLoading}
      >
        ← Back to options
      </button>
    </div>
  );
}
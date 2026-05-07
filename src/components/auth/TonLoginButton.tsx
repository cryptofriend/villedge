import { useEffect, useRef } from 'react';
import { useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TonLoginButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  onStart?: () => void;
  onSuccess?: (isNewUser: boolean) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function TonLoginButton({
  disabled,
  isLoading,
  onStart,
  onSuccess,
  onError,
  className,
}: TonLoginButtonProps) {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const wallet = useTonWallet();
  const processingRef = useRef(false);
  const initiatedRef = useRef(false);

  // When wallet connects after our button click, authenticate with backend
  useEffect(() => {
    if (!initiatedRef.current) return;
    if (!wallet || !tonAddress) return;
    if (processingRef.current) return;

    processingRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('porto-auth', {
          body: { address: tonAddress, walletType: 'ton' },
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
          onSuccess?.(!!data?.isNewUser);
        }
      } catch (err) {
        console.error('TON auth error:', err);
        const message = err instanceof Error ? err.message : 'Authentication failed';
        toast.error(message);
        onError?.(message);
        try {
          await tonConnectUI.disconnect();
        } catch {
          /* noop */
        }
      } finally {
        processingRef.current = false;
        initiatedRef.current = false;
      }
    })();
  }, [wallet, tonAddress, tonConnectUI, onSuccess, onError]);

  const handleClick = async () => {
    if (disabled || isLoading) return;
    onStart?.();
    initiatedRef.current = true;
    try {
      // If already connected from a previous session, disconnect and reconnect
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
      await tonConnectUI.openModal();
    } catch (err) {
      console.error('TON modal error:', err);
      initiatedRef.current = false;
      onError?.('Could not open TON wallet');
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={
        className ??
        'w-full h-11 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200'
      }
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="28" fill="#0098EA" />
            <path
              d="M37.6 15.6H18.4c-3.5 0-5.7 3.8-3.95 6.85l11.55 20.05c.76 1.32 2.66 1.32 3.42 0l11.55-20.05c1.74-3.04-.46-6.85-3.97-6.85zM26.42 36.86l-2.52-4.86-6.07-10.85c-.4-.7.1-1.6.95-1.6h7.64v17.31zm11.74-15.71l-6.07 10.85-2.52 4.86V19.55h7.64c.85 0 1.35.9.95 1.6z"
              fill="white"
            />
          </svg>
          <span>Continue with TON</span>
        </div>
      )}
    </Button>
  );
}

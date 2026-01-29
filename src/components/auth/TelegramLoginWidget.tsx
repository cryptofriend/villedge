import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botName: string;
  disabled?: boolean;
  isLoading?: boolean;
  onStart?: () => void;
  onSuccess?: (isNewUser: boolean) => void;
  onError?: (error: string) => void;
  className?: string;
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramUser) => void;
    };
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

export function TelegramLoginWidget({
  botName,
  disabled = false,
  isLoading = false,
  onStart,
  onSuccess,
  onError,
  className,
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  const handleTelegramAuth = useCallback(async (user: TelegramUser) => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    onStart?.();

    try {
      // Call our backend to verify and authenticate
      const { data, error } = await supabase.functions.invoke('telegram-login-auth', {
        body: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          auth_date: user.auth_date,
          hash: user.hash,
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
      console.error('Telegram auth error:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(message);
      onError?.(message);
    } finally {
      processingRef.current = false;
    }
  }, [onStart, onSuccess, onError]);

  useEffect(() => {
    // Set global callback for Telegram widget
    window.onTelegramAuth = handleTelegramAuth;

    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  const handleClick = () => {
    if (disabled || isLoading) return;

    // Open Telegram login popup
    const width = 550;
    const height = 470;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const origin = window.location.origin;
    // Extract bot_id (numeric) from botName
    const botId = botName.replace('@', '');
    
    // Create a callback URL on our domain that will receive the auth data
    const callbackUrl = `${origin}/auth/telegram-callback`;
    
    const popup = window.open(
      `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(origin)}&embed=0&request_access=write&return_to=${encodeURIComponent(callbackUrl)}`,
      'telegram-login',
      `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=no`
    );

    if (popup) {
      // Poll the popup URL to detect when Telegram redirects to our callback
      const checkPopup = setInterval(() => {
        try {
          // Check if popup was closed by user
          if (popup.closed) {
            clearInterval(checkPopup);
            return;
          }
          
          // Try to access the popup's location (will throw if cross-origin)
          const popupUrl = popup.location.href;
          
          // Check if redirected to our callback URL
          if (popupUrl && popupUrl.startsWith(callbackUrl)) {
            clearInterval(checkPopup);
            
            // Extract auth data from URL hash fragment (Telegram puts it there)
            const url = new URL(popupUrl);
            const hashParams = new URLSearchParams(url.hash.slice(1));
            const searchParams = url.searchParams;
            
            // Telegram may put data in hash or query params depending on the flow
            const id = hashParams.get('id') || searchParams.get('id');
            const first_name = hashParams.get('first_name') || searchParams.get('first_name');
            const last_name = hashParams.get('last_name') || searchParams.get('last_name');
            const username = hashParams.get('username') || searchParams.get('username');
            const photo_url = hashParams.get('photo_url') || searchParams.get('photo_url');
            const auth_date = hashParams.get('auth_date') || searchParams.get('auth_date');
            const hash = hashParams.get('hash') || searchParams.get('hash');
            
            popup.close();
            
            if (id && hash && auth_date) {
              handleTelegramAuth({
                id: parseInt(id, 10),
                first_name: first_name || '',
                last_name: last_name || undefined,
                username: username || undefined,
                photo_url: photo_url || undefined,
                auth_date: parseInt(auth_date, 10),
                hash,
              });
            }
          }
        } catch {
          // Cross-origin access denied - popup still on oauth.telegram.org
          // This is expected, continue polling
        }
      }, 200);

      // Safety timeout - stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
      }, 300000);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <Button
        onClick={handleClick}
        variant="outline"
        className="w-full h-11 text-sm font-medium rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200"
        disabled={disabled || isLoading}
      >
        {isLoading ? (
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
  );
}

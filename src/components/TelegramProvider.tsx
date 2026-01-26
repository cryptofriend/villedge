import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTelegramMiniApp, TelegramMiniAppState, TelegramMiniAppActions } from '@/hooks/useTelegramMiniApp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TelegramContextValue extends TelegramMiniAppState, TelegramMiniAppActions {
  isAutoLoggingIn: boolean;
  telegramAuthError: string | null;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

// Safe hook that returns null if not in TelegramProvider
export function useTelegramSafe() {
  return useContext(TelegramContext);
}

interface TelegramProviderProps {
  children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const telegram = useTelegramMiniApp();
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);

  // Auto-login via Telegram ID
  useEffect(() => {
    if (!telegram.isTelegram || !telegram.user) return;

    const autoLogin = async () => {
      try {
        // Check if already logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Telegram] User already logged in');
          return;
        }

        setIsAutoLoggingIn(true);
        console.log('[Telegram] Starting auto-login for user:', telegram.user?.id);

        // Create a deterministic address from Telegram ID
        const telegramAddress = `telegram_${telegram.user.id}`;
        
        const { data, error } = await supabase.functions.invoke('porto-auth', {
          body: { 
            address: telegramAddress,
            telegramUser: telegram.user,
          },
        });

        if (error) {
          console.error('[Telegram] Auth error:', error);
          setTelegramAuthError(error.message);
          return;
        }

        if (data?.actionLink) {
          // Extract tokens from the action link
          const url = new URL(data.actionLink);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('[Telegram] Session error:', sessionError);
              setTelegramAuthError(sessionError.message);
            } else {
              console.log('[Telegram] Auto-login successful');
              telegram.haptic.notification('success');
              toast({
                title: 'Welcome!',
                description: `Signed in as ${telegram.user?.first_name || 'Telegram User'}`,
              });
            }
          }
        }
      } catch (err) {
        console.error('[Telegram] Auto-login failed:', err);
        setTelegramAuthError(err instanceof Error ? err.message : 'Auto-login failed');
      } finally {
        setIsAutoLoggingIn(false);
      }
    };

    autoLogin();
  }, [telegram.isTelegram, telegram.user]);

  // Sync theme with Telegram
  useEffect(() => {
    if (!telegram.isTelegram || !telegram.themeParams) return;

    const { themeParams, colorScheme } = telegram;
    const root = document.documentElement;

    // Update color scheme class
    if (colorScheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Telegram theme colors as CSS variables
    if (themeParams.bg_color) {
      root.style.setProperty('--tg-bg-color', themeParams.bg_color);
    }
    if (themeParams.text_color) {
      root.style.setProperty('--tg-text-color', themeParams.text_color);
    }
    if (themeParams.hint_color) {
      root.style.setProperty('--tg-hint-color', themeParams.hint_color);
    }
    if (themeParams.link_color) {
      root.style.setProperty('--tg-link-color', themeParams.link_color);
    }
    if (themeParams.button_color) {
      root.style.setProperty('--tg-button-color', themeParams.button_color);
    }
    if (themeParams.button_text_color) {
      root.style.setProperty('--tg-button-text-color', themeParams.button_text_color);
    }
    if (themeParams.secondary_bg_color) {
      root.style.setProperty('--tg-secondary-bg-color', themeParams.secondary_bg_color);
    }

    console.log('[Telegram] Theme synced:', colorScheme, themeParams);
  }, [telegram.isTelegram, telegram.themeParams, telegram.colorScheme]);

  // Set Telegram header/background colors to match Villedge theme
  useEffect(() => {
    if (!telegram.isTelegram) return;

    // Use Villedge's sage/cream theme colors
    // These are approximate hex values from our HSL theme
    const headerColor = telegram.colorScheme === 'dark' ? '#1a2e1f' : '#4a7a55'; // sage
    const bgColor = telegram.colorScheme === 'dark' ? '#0f1710' : '#f7f5f0'; // cream

    telegram.setHeaderColor(headerColor);
    telegram.setBackgroundColor(bgColor);
  }, [telegram.isTelegram, telegram.colorScheme]);

  const value: TelegramContextValue = {
    ...telegram,
    isAutoLoggingIn,
    telegramAuthError,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

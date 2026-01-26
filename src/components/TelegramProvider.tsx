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
  // Removed auto-login - now handled explicitly via AuthDialog
  const [isAutoLoggingIn] = useState(false);
  const [telegramAuthError] = useState<string | null>(null);

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

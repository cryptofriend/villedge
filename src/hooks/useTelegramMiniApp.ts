import { useState, useEffect, useCallback } from 'react';

// Telegram WebApp types
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
}

interface TelegramBackButton {
  isVisible: boolean;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
}

interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    receiver?: TelegramUser;
    chat?: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      photo_url?: string;
    };
    chat_type?: string;
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  MainButton: TelegramMainButton;
  BackButton: TelegramBackButton;
  HapticFeedback: TelegramHapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramMiniAppState {
  isTelegram: boolean;
  isReady: boolean;
  user: TelegramUser | null;
  themeParams: TelegramThemeParams | null;
  colorScheme: 'light' | 'dark';
  platform: string;
  version: string;
  startParam: string | null;
  viewportHeight: number;
}

export interface TelegramMiniAppActions {
  expand: () => void;
  close: () => void;
  haptic: {
    impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type: 'error' | 'success' | 'warning') => void;
    selection: () => void;
  };
  mainButton: {
    show: (text: string, onClick: () => void) => void;
    hide: () => void;
    showProgress: () => void;
    hideProgress: () => void;
    enable: () => void;
    disable: () => void;
  };
  backButton: {
    show: (onClick: () => void) => void;
    hide: () => void;
  };
  openLink: (url: string, tryInstantView?: boolean) => void;
  openTelegramLink: (url: string) => void;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  sendData: (data: string) => void;
}

export function useTelegramMiniApp(): TelegramMiniAppState & TelegramMiniAppActions {
  const [state, setState] = useState<TelegramMiniAppState>({
    isTelegram: false,
    isReady: false,
    user: null,
    themeParams: null,
    colorScheme: 'light',
    platform: 'unknown',
    version: '',
    startParam: null,
    viewportHeight: window.innerHeight,
  });

  const [mainButtonCallback, setMainButtonCallback] = useState<(() => void) | null>(null);
  const [backButtonCallback, setBackButtonCallback] = useState<(() => void) | null>(null);

  // Initialize Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg && tg.initData) {
      console.log('[Telegram] Mini App detected, initializing...');
      
      // Mark as ready
      tg.ready();
      
      // Expand to full height
      tg.expand();
      
      setState({
        isTelegram: true,
        isReady: true,
        user: tg.initDataUnsafe?.user || null,
        themeParams: tg.themeParams || null,
        colorScheme: tg.colorScheme || 'light',
        platform: tg.platform || 'unknown',
        version: tg.version || '',
        startParam: tg.initDataUnsafe?.start_param || null,
        viewportHeight: tg.viewportHeight || window.innerHeight,
      });

      console.log('[Telegram] User:', tg.initDataUnsafe?.user);
      console.log('[Telegram] Platform:', tg.platform);
      console.log('[Telegram] Color scheme:', tg.colorScheme);

      // Listen for theme changes
      const handleThemeChange = () => {
        setState(prev => ({
          ...prev,
          themeParams: tg.themeParams,
          colorScheme: tg.colorScheme,
        }));
      };

      // Listen for viewport changes
      const handleViewportChange = () => {
        setState(prev => ({
          ...prev,
          viewportHeight: tg.viewportHeight,
        }));
      };

      tg.onEvent('themeChanged', handleThemeChange);
      tg.onEvent('viewportChanged', handleViewportChange);

      return () => {
        tg.offEvent('themeChanged', handleThemeChange);
        tg.offEvent('viewportChanged', handleViewportChange);
      };
    } else {
      console.log('[Telegram] Not running in Mini App context');
    }
  }, []);

  // Cleanup main button callback
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && mainButtonCallback) {
      tg.MainButton.onClick(mainButtonCallback);
      return () => {
        tg.MainButton.offClick(mainButtonCallback);
      };
    }
  }, [mainButtonCallback]);

  // Cleanup back button callback
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && backButtonCallback) {
      tg.BackButton.onClick(backButtonCallback);
      return () => {
        tg.BackButton.offClick(backButtonCallback);
      };
    }
  }, [backButtonCallback]);

  // Actions
  const expand = useCallback(() => {
    window.Telegram?.WebApp?.expand();
  }, []);

  const close = useCallback(() => {
    window.Telegram?.WebApp?.close();
  }, []);

  const haptic = {
    impact: useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    }, []),
    notification: useCallback((type: 'error' | 'success' | 'warning') => {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    }, []),
    selection: useCallback(() => {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    }, []),
  };

  const mainButton = {
    show: useCallback((text: string, onClick: () => void) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.MainButton.setText(text);
        setMainButtonCallback(() => onClick);
        tg.MainButton.show();
      }
    }, []),
    hide: useCallback(() => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.MainButton.hide();
        setMainButtonCallback(null);
      }
    }, []),
    showProgress: useCallback(() => {
      window.Telegram?.WebApp?.MainButton?.showProgress();
    }, []),
    hideProgress: useCallback(() => {
      window.Telegram?.WebApp?.MainButton?.hideProgress();
    }, []),
    enable: useCallback(() => {
      window.Telegram?.WebApp?.MainButton?.enable();
    }, []),
    disable: useCallback(() => {
      window.Telegram?.WebApp?.MainButton?.disable();
    }, []),
  };

  const backButton = {
    show: useCallback((onClick: () => void) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        setBackButtonCallback(() => onClick);
        tg.BackButton.show();
      }
    }, []),
    hide: useCallback(() => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.BackButton.hide();
        setBackButtonCallback(null);
      }
    }, []),
  };

  const openLink = useCallback((url: string, tryInstantView = false) => {
    window.Telegram?.WebApp?.openLink(url, { try_instant_view: tryInstantView });
  }, []);

  const openTelegramLink = useCallback((url: string) => {
    window.Telegram?.WebApp?.openTelegramLink(url);
  }, []);

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showAlert(message, () => resolve());
      } else {
        alert(message);
        resolve();
      }
    });
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showConfirm(message, (confirmed) => resolve(confirmed));
      } else {
        resolve(window.confirm(message));
      }
    });
  }, []);

  const setHeaderColor = useCallback((color: string) => {
    window.Telegram?.WebApp?.setHeaderColor(color);
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    window.Telegram?.WebApp?.setBackgroundColor(color);
  }, []);

  const sendData = useCallback((data: string) => {
    window.Telegram?.WebApp?.sendData(data);
  }, []);

  return {
    ...state,
    expand,
    close,
    haptic,
    mainButton,
    backButton,
    openLink,
    openTelegramLink,
    showAlert,
    showConfirm,
    setHeaderColor,
    setBackgroundColor,
    sendData,
  };
}

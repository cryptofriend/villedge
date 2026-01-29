import { useEffect } from 'react';

/**
 * This page exists solely as a callback endpoint for Telegram OAuth.
 * The popup will redirect here with auth data in URL params.
 * The parent window (Auth page) polls the popup URL and extracts the data.
 * 
 * This page just shows a brief "Processing..." message while the parent handles auth.
 */
export default function TelegramCallback() {
  useEffect(() => {
    // The parent window will detect this page loading and extract the auth params
    // This page doesn't need to do anything - just exist as a valid redirect target
    
    // Close this window after a short delay if parent doesn't close it
    const timeout = setTimeout(() => {
      window.close();
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Processing Telegram login...</p>
      </div>
    </div>
  );
}

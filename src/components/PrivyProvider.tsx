import { ReactNode, useEffect, useState } from 'react';
import { PrivyProvider as PrivyReactProvider } from '@privy-io/react-auth';
import { supabase } from '@/integrations/supabase/client';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

interface PrivyProviderProps {
  children: ReactNode;
}

export const PrivyProvider = ({ children }: PrivyProviderProps) => {
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // First check env var (for local dev)
        const envAppId = import.meta.env.VITE_PRIVY_APP_ID;
        if (envAppId) {
          setAppId(envAppId);
          setLoading(false);
          return;
        }

        // Fetch from edge function
        const { data, error } = await supabase.functions.invoke('public-config');

        if (error) {
          console.error('Failed to fetch Privy config:', error);
          setLoading(false);
          return;
        }

        if (data?.privyAppId) {
          setAppId(data.privyAppId);
        } else {
          console.warn('Privy app ID not configured');
        }
      } catch (err) {
        console.error('Error initializing Privy:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // While loading or if no app ID, just render children without Privy
  if (loading || !appId) {
    return <>{children}</>;
  }

  const solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: false,
  });

  return (
    <PrivyReactProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: undefined,
        },
        loginMethods: ['email', 'wallet'],
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      {children}
    </PrivyReactProvider>
  );
};

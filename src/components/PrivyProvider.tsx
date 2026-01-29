import { ReactNode, createContext, useContext } from 'react';
import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';
import { usePrivyAppId } from '@/hooks/usePrivyAppId';

interface PrivyProviderProps {
  children: ReactNode;
}

type PrivyConfigState = {
  appId: string | null;
  loading: boolean;
};

const PrivyConfigContext = createContext<PrivyConfigState>({ appId: null, loading: true });

export function usePrivyConfig(): PrivyConfigState {
  return useContext(PrivyConfigContext);
}

export const PrivyProvider = ({ children }: PrivyProviderProps) => {
  const { appId, loading } = usePrivyAppId();

  // Always provide config state to children so they can avoid rendering Privy hooks
  // before the PrivyProviderBase is mounted.
  const state: PrivyConfigState = { appId, loading };

  if (loading || !appId) {
    if (!loading && !appId) console.warn('VITE_PRIVY_APP_ID not configured');
    return <PrivyConfigContext.Provider value={state}>{children}</PrivyConfigContext.Provider>;
  }

  return (
    <PrivyConfigContext.Provider value={state}>
      <PrivyProviderBase
        appId={appId}
        config={{
          loginMethods: ['email', 'wallet'],
          appearance: {
            theme: 'light',
            accentColor: '#676FFF',
            showWalletLoginFirst: false,
          },
        }}
      >
        {children}
      </PrivyProviderBase>
    </PrivyConfigContext.Provider>
  );
};

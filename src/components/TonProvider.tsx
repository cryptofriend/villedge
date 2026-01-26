import { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

interface TonProviderProps {
  children: ReactNode;
}

// TON Connect manifest - describes the app to TON wallets
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

export const TonProvider = ({ children }: TonProviderProps) => {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
};

import { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

interface TonProviderProps {
  children: ReactNode;
}

// TON Connect manifest must be at a publicly accessible URL
// We use the published URL since the manifest needs to be stable and accessible
const MANIFEST_URL = 'https://villedge.lovable.app/tonconnect-manifest.json';

export const TonProvider = ({ children }: TonProviderProps) => {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      {children}
    </TonConnectUIProvider>
  );
};

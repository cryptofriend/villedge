import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

interface PortoProviderProps {
  children: ReactNode;
}

export const PortoProvider = ({ children }: PortoProviderProps) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  );
};

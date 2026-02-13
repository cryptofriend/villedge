import { ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork, Adapter } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { WalletConnectWalletAdapter } from '@walletconnect/solana-adapter';

import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider = ({ children }: SolanaProviderProps) => {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo((): Adapter[] => {
    const walletList: Adapter[] = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];

    // Add WalletConnect adapter if project ID is configured
    const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
    if (walletConnectProjectId) {
      walletList.push(
        new WalletConnectWalletAdapter({
          network,
          options: {
            projectId: walletConnectProjectId,
            metadata: {
              name: 'Villedge',
              description: 'Popup Villages Community App',
              url: window.location.origin,
              icons: [`${window.location.origin}/favicon.ico`],
            },
          },
        })
      );
    }

    return walletList;
  }, [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

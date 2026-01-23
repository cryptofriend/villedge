import { http, createConfig, createStorage } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { porto } from 'porto/wagmi';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [porto()],
  storage: createStorage({ storage: localStorage }),
  transports: {
    [baseSepolia.id]: http(),
  },
});

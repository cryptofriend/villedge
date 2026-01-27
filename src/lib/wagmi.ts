import { http, createConfig, createStorage } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import { porto as portoConnector } from 'porto/wagmi';
import { walletConnect } from 'wagmi/connectors';
import { Mode } from 'porto';

// Villedge-themed Porto dialog
const dialogMode = Mode.dialog({
  theme: {
    colorScheme: 'light',
    // Core accent colors - Villedge sage green
    accent: '#4a5d4a',
    focus: '#4a5d4a',
    link: '#4a5d4a',
    // Backgrounds - Villedge cream
    baseBackground: '#faf8f5',
    baseAltBackground: '#f5f2ed',
    basePlaneBackground: '#ffffff',
    frameBackground: '#faf8f5',
    // Content colors
    baseContent: '#1a1a1a',
    baseContentSecondary: '#6b7280',
    baseContentTertiary: '#9ca3af',
    frameContent: '#1a1a1a',
    // Borders
    baseBorder: '#e5e2dd',
    frameBorder: '#e5e2dd',
    // Primary button - dark with cream text
    primaryBackground: '#2d3a2d',
    primaryContent: '#faf8f5',
    primaryBorder: '#2d3a2d',
    primaryHoveredBackground: '#3d4a3d',
    primaryHoveredBorder: '#3d4a3d',
    // Secondary button
    secondaryBackground: '#f5f2ed',
    secondaryContent: '#1a1a1a',
    secondaryBorder: '#e5e2dd',
    secondaryHoveredBackground: '#ebe8e3',
    secondaryHoveredBorder: '#d5d2cd',
    // Border radius
    radiusSmall: 8,
    radiusMedium: 12,
    radiusLarge: 16,
    frameRadius: 16,
  },
});

// Export the porto connector for use in wallet linking
export const porto = portoConnector({ mode: dialogMode });

// WalletConnect project ID from environment
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Create WalletConnect connector if project ID is available
const walletConnectConnector = walletConnectProjectId
  ? walletConnect({
      projectId: walletConnectProjectId,
      metadata: {
        name: 'Villedge',
        description: 'Popup Villages Community App',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://villedge.lovable.app',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'https://villedge.lovable.app/favicon.ico'],
      },
      showQrModal: true,
    })
  : null;

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  connectors: walletConnectConnector ? [porto, walletConnectConnector] : [porto],
  storage: createStorage({ storage: localStorage }),
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});

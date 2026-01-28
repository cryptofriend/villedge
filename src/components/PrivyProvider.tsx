import { ReactNode } from 'react';
import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';
import { usePrivyAppId } from '@/hooks/usePrivyAppId';

interface PrivyProviderProps {
  children: ReactNode;
}

export const PrivyProvider = ({ children }: PrivyProviderProps) => {
  const { appId, loading } = usePrivyAppId();

  if (loading) {
    return <>{children}</>;
  }

  if (!appId) {
    console.warn('VITE_PRIVY_APP_ID not configured');
    return <>{children}</>;
  }

  return (
    <PrivyProviderBase
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'apple'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
};

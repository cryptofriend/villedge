import { useEffect, ReactNode, createContext, useContext, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

interface MiniKitContextType {
  isInstalled: boolean;
  isInsideMiniApp: boolean;
}

const MiniKitContext = createContext<MiniKitContextType>({
  isInstalled: false,
  isInsideMiniApp: false,
});

export const useMiniKit = () => useContext(MiniKitContext);

export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInsideMiniApp, setIsInsideMiniApp] = useState(false);

  useEffect(() => {
    // Check if we're running inside World App
    const checkMiniApp = () => {
      // MiniKit.isInstalled() returns true if running inside World App
      const installed = MiniKit.isInstalled();
      setIsInsideMiniApp(installed);
      
      if (!installed) {
        // Try to install MiniKit anyway (will work if inside World App)
        try {
          MiniKit.install();
          setIsInstalled(true);
          setIsInsideMiniApp(MiniKit.isInstalled());
        } catch (e) {
          console.log('MiniKit not available (running in browser)');
          setIsInstalled(false);
        }
      } else {
        setIsInstalled(true);
      }
    };

    checkMiniApp();
  }, []);

  return (
    <MiniKitContext.Provider value={{ isInstalled, isInsideMiniApp }}>
      {children}
    </MiniKitContext.Provider>
  );
};

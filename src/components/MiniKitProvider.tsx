import { useEffect, ReactNode, createContext, useContext, useRef, useState } from 'react';
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
  const didInitRef = useRef(false);

  useEffect(() => {
    // React StrictMode runs effects twice in dev; avoid double init.
    if (didInitRef.current) return;
    didInitRef.current = true;

    const appId = import.meta.env.VITE_WORLD_ID_APP_ID as string | undefined;

    try {
      // MiniKit requires appId to set up the bridge correctly.
      if (appId) {
        MiniKit.install(appId);
      } else {
        console.warn('VITE_WORLD_ID_APP_ID is not set; MiniKit will not initialize.');
      }
    } catch (e) {
      // This will throw when not running inside World App.
      console.log('MiniKit not available (running in browser)');
    } finally {
      const inside = MiniKit.isInstalled();
      setIsInsideMiniApp(inside);
      setIsInstalled(inside);
    }
  }, []);

  return (
    <MiniKitContext.Provider value={{ isInstalled, isInsideMiniApp }}>
      {children}
    </MiniKitContext.Provider>
  );
};

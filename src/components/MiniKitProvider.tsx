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

    const syncInstalledState = () => {
      const inside = MiniKit.isInstalled();
      setIsInsideMiniApp(inside);
      setIsInstalled(inside);
      return inside;
    };

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
    }

    // Bridge handshake can be async; re-check for a short window.
    // If we are *not* inside the World App, MiniKit.isInstalled() will remain false.
    syncInstalledState();
    let tries = 0;
    const maxTries = 20; // ~2s at 100ms
    const interval = window.setInterval(() => {
      tries += 1;
      const insideNow = syncInstalledState();
      if (insideNow || tries >= maxTries) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <MiniKitContext.Provider value={{ isInstalled, isInsideMiniApp }}>
      {children}
    </MiniKitContext.Provider>
  );
};

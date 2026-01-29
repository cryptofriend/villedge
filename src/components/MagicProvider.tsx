import { ReactNode, createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Magic } from 'magic-sdk';

interface MagicContextState {
  magic: Magic | null;
  loading: boolean;
}

const MagicContext = createContext<MagicContextState>({ magic: null, loading: true });

export function useMagic(): MagicContextState {
  return useContext(MagicContext);
}

interface MagicProviderProps {
  children: ReactNode;
}

export const MagicProvider = ({ children }: MagicProviderProps) => {
  const [loading, setLoading] = useState(true);
  
  const magic = useMemo(() => {
    const publishableKey = import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.warn('VITE_MAGIC_PUBLISHABLE_KEY not configured');
      return null;
    }
    
    return new Magic(publishableKey);
  }, []);
  
  useEffect(() => {
    // Magic SDK is ready once instantiated
    setLoading(false);
  }, [magic]);
  
  const state: MagicContextState = { magic, loading };
  
  return (
    <MagicContext.Provider value={state}>
      {children}
    </MagicContext.Provider>
  );
};
import { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { Magic } from 'magic-sdk';
import { supabase } from '@/integrations/supabase/client';

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
  const [magic, setMagic] = useState<Magic | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // First check env var (for local dev)
        const envKey = import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY;
        if (envKey) {
          setMagic(new Magic(envKey));
          setLoading(false);
          return;
        }
        
        // Fetch from edge function
        const { data, error } = await supabase.functions.invoke('public-config');
        
        if (error) {
          console.error('Failed to fetch Magic config:', error);
          setLoading(false);
          return;
        }
        
        if (data?.magicPublishableKey) {
          setMagic(new Magic(data.magicPublishableKey));
        } else {
          console.warn('Magic publishable key not configured');
        }
      } catch (err) {
        console.error('Error initializing Magic:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, []);
  
  const state: MagicContextState = { magic, loading };
  
  return (
    <MagicContext.Provider value={state}>
      {children}
    </MagicContext.Provider>
  );
};
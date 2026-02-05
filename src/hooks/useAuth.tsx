import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  social_url: string | null;
  bio: string | null;
  offerings: string | null;
  asks: string | null;
  project_description: string | null;
  project_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  updateProfile: (
    updates: Partial<
      Pick<
        Profile,
        | "username"
        | "avatar_url"
        | "social_url"
        | "bio"
        | "offerings"
        | "asks"
        | "project_description"
        | "project_url"
      >
    >
  ) => Promise<any>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const lastProfileUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    // Avoid re-fetching the same profile in tight loops
    if (lastProfileUserIdRef.current === userId) return;
    lastProfileUserIdRef.current = userId;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data && !error) {
      setProfile(data);
    } else {
      // No profile yet (or error) — don't loop endlessly
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        // Reset ref so we can fetch for the newly authenticated user
        if (lastProfileUserIdRef.current !== nextSession.user.id) {
          lastProfileUserIdRef.current = null;
        }
        fetchProfile(nextSession.user.id);
      } else {
        lastProfileUserIdRef.current = null;
        setProfile(null);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (lastProfileUserIdRef.current !== session.user.id) {
          lastProfileUserIdRef.current = null;
        }
        fetchProfile(session.user.id);
      } else {
        lastProfileUserIdRef.current = null;
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username
        }
      }
    });
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'username' | 'avatar_url' | 'social_url' | 'bio' | 'offerings' | 'asks' | 'project_description' | 'project_url'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    // Use upsert to handle both insert and update cases
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();
    
    if (data && !error) {
      lastProfileUserIdRef.current = user.id;
      setProfile(data);
    }
    
    return { data, error };
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }), [user, session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return {
    ...ctx,
    isAuthenticated: !!ctx.user,
  };
};

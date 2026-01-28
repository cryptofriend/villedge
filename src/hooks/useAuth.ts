import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
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

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data && !error) {
      setProfile(data);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName
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

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'social_url' | 'bio' | 'offerings' | 'asks' | 'project_description' | 'project_url'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    // Generate username from display_name if not already set
    let usernameToSet: string | undefined;
    if (updates.display_name && !profile?.username) {
      // Generate URL-safe username
      const baseUsername = updates.display_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 30) || 'user';
      
      // Check if username exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', baseUsername)
        .single();
      
      if (!existing) {
        usernameToSet = baseUsername;
      } else {
        // Add a suffix to make unique
        usernameToSet = `${baseUsername}-${Date.now().toString(36).slice(-4)}`;
      }
    }
    
    // Use upsert to handle both insert and update cases
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        ...updates,
        ...(usernameToSet ? { username: usernameToSet } : {}),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();
    
    if (data && !error) {
      setProfile(data);
    }
    
    return { data, error };
  };

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  };
};

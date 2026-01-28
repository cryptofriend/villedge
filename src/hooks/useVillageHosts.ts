import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VillageHost {
  id: string;
  village_id: string;
  user_id: string;
  role: 'owner' | 'co-host';
  invited_by: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export const useVillageHosts = (villageId: string) => {
  const { user } = useAuth();
  const [hosts, setHosts] = useState<VillageHost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHosts = useCallback(async () => {
    if (!villageId) {
      setHosts([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch hosts with their profiles
      const { data: hostsData, error } = await supabase
        .from('village_hosts')
        .select('*')
        .eq('village_id', villageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for all host user_ids
      const userIds = (hostsData || []).map(h => h.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      const hostsWithProfiles = (hostsData || []).map(host => ({
        ...host,
        role: host.role as 'owner' | 'co-host',
        profile: profilesMap.get(host.user_id) || null
      }));

      setHosts(hostsWithProfiles);
    } catch (err) {
      console.error('Error fetching village hosts:', err);
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }, [villageId]);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  const addCoHost = async (userId: string) => {
    if (!user || !villageId) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('village_hosts')
      .insert({
        village_id: villageId,
        user_id: userId,
        role: 'co-host',
        invited_by: user.id,
      })
      .select()
      .single();

    if (!error) {
      await fetchHosts();
    }

    return { data, error };
  };

  const removeCoHost = async (hostId: string) => {
    const { error } = await supabase
      .from('village_hosts')
      .delete()
      .eq('id', hostId);

    if (!error) {
      await fetchHosts();
    }

    return { error };
  };

  return {
    hosts,
    loading,
    addCoHost,
    removeCoHost,
    refetch: fetchHosts,
  };
};

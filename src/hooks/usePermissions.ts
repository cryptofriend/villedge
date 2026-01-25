import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'visitor' | 'resident' | 'host';

interface UsePermissionsResult {
  role: UserRole;
  isHost: (villageId: string) => boolean;
  isOwner: (villageId: string) => boolean;
  canEdit: boolean;
  canDelete: (villageId: string) => boolean;
  canCreate: boolean;
  loading: boolean;
  hostedVillages: string[];
  ownedVillages: string[];
}

export const usePermissions = (): UsePermissionsResult => {
  const { user, loading: authLoading } = useAuth();
  const [hostedVillages, setHostedVillages] = useState<string[]>([]);
  const [ownedVillages, setOwnedVillages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostedVillages = async () => {
      if (!user) {
        setHostedVillages([]);
        setOwnedVillages([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch villages the user owns
        const { data: villagesData, error: villagesError } = await supabase
          .from('villages')
          .select('id, created_by');
        
        if (villagesError) throw villagesError;
        
        const owned = (villagesData as any[])
          ?.filter((v) => v.created_by === user.id)
          .map((v) => v.id) || [];
        setOwnedVillages(owned);

        // Fetch villages where user is a co-host (from village_hosts table)
        const { data: coHostData, error: coHostError } = await supabase
          .from('village_hosts')
          .select('village_id')
          .eq('user_id', user.id);

        if (coHostError) throw coHostError;

        const coHostedIds = (coHostData || []).map(h => h.village_id);
        
        // Combine owned and co-hosted villages (unique)
        const allHosted = [...new Set([...owned, ...coHostedIds])];
        setHostedVillages(allHosted);
      } catch (err) {
        console.error('Error fetching hosted villages:', err);
        setHostedVillages([]);
        setOwnedVillages([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchHostedVillages();
    }
  }, [user, authLoading]);

  const isHost = useCallback((villageId: string): boolean => {
    return hostedVillages.includes(villageId);
  }, [hostedVillages]);

  const isOwner = useCallback((villageId: string): boolean => {
    return ownedVillages.includes(villageId);
  }, [ownedVillages]);

  // Determine base role
  const role: UserRole = user 
    ? (hostedVillages.length > 0 ? 'host' : 'resident')
    : 'visitor';

  return {
    role,
    isHost,
    isOwner,
    canEdit: !!user, // residents and hosts can edit (their own content)
    canDelete: (villageId: string) => isHost(villageId), // hosts and co-hosts can delete in their village
    canCreate: !!user, // residents and hosts can create
    loading: authLoading || loading,
    hostedVillages,
    ownedVillages,
  };
};

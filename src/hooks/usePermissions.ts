import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'visitor' | 'resident' | 'host';

interface UsePermissionsResult {
  role: UserRole;
  isHost: (villageId: string) => boolean;
  canEdit: boolean;
  canDelete: (villageId: string) => boolean;
  canCreate: boolean;
  loading: boolean;
  hostedVillages: string[];
}

export const usePermissions = (): UsePermissionsResult => {
  const { user, loading: authLoading } = useAuth();
  const [hostedVillages, setHostedVillages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostedVillages = async () => {
      if (!user) {
        setHostedVillages([]);
        setLoading(false);
        return;
      }

      try {
        // Query villages and filter by created_by in JS to avoid type issues
        const { data: villagesData, error } = await supabase
          .from('villages')
          .select('id, created_by');
        
        if (error) throw error;
        
        const hosted = (villagesData as any[])
          ?.filter((v) => v.created_by === user.id)
          .map((v) => v.id) || [];
        setHostedVillages(hosted);
      } catch (err) {
        console.error('Error fetching hosted villages:', err);
        setHostedVillages([]);
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

  // Determine base role
  const role: UserRole = user 
    ? (hostedVillages.length > 0 ? 'host' : 'resident')
    : 'visitor';

  return {
    role,
    isHost,
    canEdit: !!user, // residents and hosts can edit (their own content)
    canDelete: (villageId: string) => isHost(villageId), // only hosts can delete in their village
    canCreate: !!user, // residents and hosts can create
    loading: authLoading || loading,
    hostedVillages,
  };
};

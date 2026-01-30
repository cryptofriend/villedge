import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface InvitationCode {
  id: string;
  code: string;
  owner_id: string;
  max_uses: number;
  used_count: number;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  invitation_code_id: string | null;
  created_at: string;
  referred_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export function useInvitationCodes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invitation-codes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InvitationCode[];
    },
    enabled: !!user?.id,
  });
}

export function useReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get referrals where user is the referrer
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for referred users
      if (referrals && referrals.length > 0) {
        const referredIds = referrals.map(r => r.referred_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', referredIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        return referrals.map(r => ({
          ...r,
          referred_profile: profileMap.get(r.referred_id) || null,
        })) as Referral[];
      }

      return referrals as Referral[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateInvitationCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { customCode?: string; maxUses?: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      let codeToUse: string;
      
      if (options?.customCode) {
        // Use custom code (for special users like Booga)
        codeToUse = options.customCode.toUpperCase().trim();
        
        // Validate custom code format
        if (!/^[A-Z0-9]{3,16}$/.test(codeToUse)) {
          throw new Error('Code must be 3-16 alphanumeric characters');
        }
        
        // Check if code already exists
        const { data: existing } = await supabase
          .from('invitation_codes')
          .select('id')
          .eq('code', codeToUse)
          .maybeSingle();
          
        if (existing) {
          throw new Error('This code is already taken');
        }
      } else {
        // Generate code using database function
        const { data: code, error: codeError } = await supabase
          .rpc('generate_invitation_code');

        if (codeError) throw codeError;
        codeToUse = code;
      }

      // Insert the code
      const { data, error } = await supabase
        .from('invitation_codes')
        .insert({
          code: codeToUse,
          owner_id: user.id,
          max_uses: options?.maxUses ?? 2,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InvitationCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-codes'] });
      toast.success('Invitation code created!');
    },
    onError: (error) => {
      console.error('Error creating invitation code:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create invitation code. Make sure your account is verified.');
    },
  });
}

export function useReferrerInfo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referrer-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if current user was referred by someone
      const { data, error } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_id', user.id)
        .maybeSingle();

      if (error || !data) return null;

      // Get referrer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', data.referrer_id)
        .single();

      return profile;
    },
    enabled: !!user?.id,
  });
}

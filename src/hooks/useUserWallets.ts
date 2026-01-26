import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type WalletType = 'porto' | 'ethereum' | 'solana' | 'ton';

export interface UserWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  wallet_type: WalletType;
  is_primary: boolean;
  display_name: string | null;
  created_at: string;
}

export const useUserWallets = (userId?: string) => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;

  const fetchWallets = useCallback(async () => {
    if (!targetUserId) {
      setWallets([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', targetUserId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Cast the wallet_type from string to our enum type
      setWallets((data || []).map(w => ({
        ...w,
        wallet_type: w.wallet_type as WalletType
      })));
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const linkWallet = async (
    walletAddress: string, 
    walletType: WalletType,
    isPrimary: boolean = false,
    displayName?: string
  ) => {
    if (!user) {
      toast.error('Please sign in to link a wallet');
      return { error: new Error('Not authenticated') };
    }

    try {
      // Check if wallet is already linked to another user
      const { data: existing } = await supabase
        .from('user_wallets')
        .select('user_id')
        .eq('wallet_address', walletAddress)
        .eq('wallet_type', walletType)
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        toast.error('This wallet is already linked to another account');
        return { error: new Error('Wallet already linked to another account') };
      }

      if (existing && existing.user_id === user.id) {
        toast.info('This wallet is already linked to your account');
        return { error: null };
      }

      const { error } = await supabase
        .from('user_wallets')
        .insert({
          user_id: user.id,
          wallet_address: walletAddress,
          wallet_type: walletType,
          is_primary: isPrimary,
          display_name: displayName,
        });

      if (error) throw error;

      toast.success('Wallet linked successfully');
      await fetchWallets();
      return { error: null };
    } catch (error) {
      console.error('Error linking wallet:', error);
      toast.error('Failed to link wallet');
      return { error };
    }
  };

  const unlinkWallet = async (walletId: string) => {
    if (!user) {
      toast.error('Please sign in to unlink a wallet');
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('user_wallets')
        .delete()
        .eq('id', walletId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Wallet unlinked successfully');
      await fetchWallets();
      return { error: null };
    } catch (error) {
      console.error('Error unlinking wallet:', error);
      toast.error('Failed to unlink wallet');
      return { error };
    }
  };

  const setPrimaryWallet = async (walletId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('user_wallets')
        .update({ is_primary: true })
        .eq('id', walletId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Primary wallet updated');
      await fetchWallets();
      return { error: null };
    } catch (error) {
      console.error('Error setting primary wallet:', error);
      toast.error('Failed to update primary wallet');
      return { error };
    }
  };

  return {
    wallets,
    loading,
    linkWallet,
    unlinkWallet,
    setPrimaryWallet,
    refetch: fetchWallets,
    isOwnWallets: user?.id === targetUserId,
  };
};

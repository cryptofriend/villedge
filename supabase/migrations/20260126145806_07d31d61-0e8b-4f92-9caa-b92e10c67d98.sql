-- Create enum for wallet types
CREATE TYPE public.wallet_type AS ENUM ('porto', 'ethereum', 'solana', 'ton');

-- Create table for storing linked wallets
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  wallet_type wallet_type NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each wallet address can only be linked once
  UNIQUE (wallet_address, wallet_type)
);

-- Create index for faster lookups
CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON public.user_wallets(wallet_address);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Anyone can view wallets (for public profile display)
CREATE POLICY "Anyone can view wallets"
  ON public.user_wallets FOR SELECT
  USING (true);

-- Users can insert their own wallets
CREATE POLICY "Users can insert their own wallets"
  ON public.user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own wallets
CREATE POLICY "Users can update their own wallets"
  ON public.user_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own wallets
CREATE POLICY "Users can delete their own wallets"
  ON public.user_wallets FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one primary wallet per user
CREATE OR REPLACE FUNCTION public.ensure_single_primary_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.user_wallets
    SET is_primary = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce single primary wallet
CREATE TRIGGER ensure_single_primary_wallet_trigger
  AFTER INSERT OR UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_wallet();
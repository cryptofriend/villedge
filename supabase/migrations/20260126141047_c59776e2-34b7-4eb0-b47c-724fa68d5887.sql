-- Add fields for account linking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_id text,
ADD COLUMN IF NOT EXISTS wallet_address text;

-- Create unique indexes for these identifiers
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles (telegram_id) WHERE telegram_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles (wallet_address) WHERE wallet_address IS NOT NULL;
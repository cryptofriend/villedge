-- Add solana wallet address and website URL to villages table
ALTER TABLE public.villages 
ADD COLUMN IF NOT EXISTS solana_wallet_address text,
ADD COLUMN IF NOT EXISTS website_url text;
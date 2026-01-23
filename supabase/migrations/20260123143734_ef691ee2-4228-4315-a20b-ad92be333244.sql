-- Add wallet_address column to villages table
ALTER TABLE public.villages 
ADD COLUMN wallet_address TEXT;
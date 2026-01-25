-- Add user_id column to stays table to link stays to authenticated users
ALTER TABLE public.stays 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
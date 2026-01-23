-- Add missing profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS offerings text,
ADD COLUMN IF NOT EXISTS asks text,
ADD COLUMN IF NOT EXISTS project_description text,
ADD COLUMN IF NOT EXISTS project_url text;
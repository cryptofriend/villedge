-- Add thumbnail_url column to villages table for custom OG images
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS thumbnail_url text;
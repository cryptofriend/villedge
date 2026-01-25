-- Add status column to stays table for planning/confirmed status
ALTER TABLE public.stays 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed'));
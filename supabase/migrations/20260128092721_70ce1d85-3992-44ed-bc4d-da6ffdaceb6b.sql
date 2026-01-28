-- Add village_type column to villages table
ALTER TABLE public.villages 
ADD COLUMN village_type text NOT NULL DEFAULT 'popup' 
CHECK (village_type IN ('popup', 'permanent'));
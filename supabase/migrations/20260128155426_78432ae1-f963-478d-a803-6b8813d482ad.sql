-- Remove display_name column from profiles table (migrating to username as sole identifier)
-- First, copy any display_name values to username where username is null
UPDATE public.profiles 
SET username = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE username IS NULL AND display_name IS NOT NULL;

-- Drop the display_name column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS display_name;
-- Add username column to profiles for URL-friendly profile addresses
ALTER TABLE public.profiles 
ADD COLUMN username TEXT UNIQUE;

-- Create index for fast username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Create function to generate URL-safe username from display_name
CREATE OR REPLACE FUNCTION public.generate_username(display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_username := lower(regexp_replace(
    regexp_replace(display_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Trim to max 30 chars
  base_username := left(base_username, 30);
  
  -- Handle empty result
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  
  final_username := base_username;
  
  -- Check for uniqueness and add suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '-' || counter;
  END LOOP;
  
  RETURN final_username;
END;
$$;
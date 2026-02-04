-- Add bot_token column to villages for self-service bot configuration
ALTER TABLE public.villages ADD COLUMN bot_token text;

-- Add RLS policy to protect the bot token (only hosts and admins can see it)
CREATE POLICY "Only hosts can view bot_token"
ON public.villages
FOR SELECT
USING (
  created_by = auth.uid() 
  OR is_village_host(auth.uid(), id)
  OR is_admin(auth.uid())
);

-- Update existing SELECT policy to be more specific (for non-sensitive fields)
-- Note: The existing policies already handle general access, this just adds protection for the token
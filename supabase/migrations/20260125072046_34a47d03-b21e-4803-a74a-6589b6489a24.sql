-- Create village_hosts table for tracking co-hosts
CREATE TABLE public.village_hosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id text NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'co-host' CHECK (role IN ('owner', 'co-host')),
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (village_id, user_id)
);

-- Enable RLS
ALTER TABLE public.village_hosts ENABLE ROW LEVEL SECURITY;

-- Anyone can view village hosts
CREATE POLICY "Anyone can view village hosts"
ON public.village_hosts
FOR SELECT
USING (true);

-- Only village owners can manage co-hosts
CREATE POLICY "Owners can insert co-hosts"
ON public.village_hosts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.villages
    WHERE id = village_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Owners can delete co-hosts"
ON public.village_hosts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.villages
    WHERE id = village_id AND created_by = auth.uid()
  )
  OR user_id = auth.uid() -- Co-hosts can remove themselves
);

-- Update is_village_host function to check both owner and co-hosts
CREATE OR REPLACE FUNCTION public.is_village_host(_user_id uuid, _village_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.villages
    WHERE id = _village_id
      AND created_by = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.village_hosts
    WHERE village_id = _village_id
      AND user_id = _user_id
  )
$$;

-- Migrate existing village owners to village_hosts table
INSERT INTO public.village_hosts (village_id, user_id, role, invited_by)
SELECT id, created_by, 'owner', created_by
FROM public.villages
WHERE created_by IS NOT NULL
ON CONFLICT (village_id, user_id) DO NOTHING;
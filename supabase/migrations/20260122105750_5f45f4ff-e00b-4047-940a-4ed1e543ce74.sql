-- Add created_by column to villages table to track who created (hosts) each village
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create a security definer function to check if user is host of a village
CREATE OR REPLACE FUNCTION public.is_village_host(_user_id uuid, _village_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.villages
    WHERE id = _village_id
      AND created_by = _user_id
  )
$$;

-- Update villages policies
DROP POLICY IF EXISTS "Anyone can create villages" ON public.villages;
DROP POLICY IF EXISTS "Anyone can update villages" ON public.villages;
DROP POLICY IF EXISTS "Anyone can delete villages" ON public.villages;
DROP POLICY IF EXISTS "Anyone can view villages" ON public.villages;

-- Anyone can view villages (visitors, residents, hosts)
CREATE POLICY "Anyone can view villages" ON public.villages
FOR SELECT USING (true);

-- Only authenticated users can create villages (they become hosts)
CREATE POLICY "Authenticated users can create villages" ON public.villages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Only host can update their village
CREATE POLICY "Hosts can update their villages" ON public.villages
FOR UPDATE TO authenticated
USING (public.is_village_host(auth.uid(), id));

-- Only host can delete their village
CREATE POLICY "Hosts can delete their villages" ON public.villages
FOR DELETE TO authenticated
USING (public.is_village_host(auth.uid(), id));

-- Update bulletin policies (residents can create, hosts can delete)
DROP POLICY IF EXISTS "Anyone can create bulletin messages" ON public.bulletin;
DROP POLICY IF EXISTS "Anyone can delete bulletin messages" ON public.bulletin;

CREATE POLICY "Authenticated users can create bulletin messages" ON public.bulletin
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Hosts can delete bulletin messages" ON public.bulletin
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.villages 
    WHERE id = village_id AND created_by = auth.uid()
  )
);

-- Update bulletin_reactions policies
DROP POLICY IF EXISTS "Anyone can add reactions" ON public.bulletin_reactions;
DROP POLICY IF EXISTS "Anyone can delete reactions" ON public.bulletin_reactions;

CREATE POLICY "Authenticated users can add reactions" ON public.bulletin_reactions
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their reactions" ON public.bulletin_reactions
FOR DELETE TO authenticated
USING (true);

-- Update comments policies
-- TABLE DOES NOT EXIST IN MIGRATIONS (Temporary Fix)
-- DROP POLICY IF EXISTS "Anyone can create comments" ON public.comments;
-- DROP POLICY IF EXISTS "Anyone can delete comments" ON public.comments;

-- CREATE POLICY "Authenticated users can create comments" ON public.comments
-- FOR INSERT TO authenticated
-- WITH CHECK (true);

-- CREATE POLICY "Authenticated users can delete comments" ON public.comments
-- FOR DELETE TO authenticated
-- USING (true);

-- Update spots policies
DROP POLICY IF EXISTS "Anyone can create spots" ON public.spots;
DROP POLICY IF EXISTS "Anyone can update spots" ON public.spots;
DROP POLICY IF EXISTS "Anyone can delete spots" ON public.spots;

CREATE POLICY "Authenticated users can create spots" ON public.spots
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update spots" ON public.spots
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Hosts can delete spots in their village" ON public.spots
FOR DELETE TO authenticated
USING (
  village_id IS NULL OR EXISTS (
    SELECT 1 FROM public.villages 
    WHERE id = village_id AND created_by = auth.uid()
  )
);

-- Update stays policies
DROP POLICY IF EXISTS "Anyone can create stays" ON public.stays;
DROP POLICY IF EXISTS "Anyone can update stays" ON public.stays;
DROP POLICY IF EXISTS "Anyone can delete stays" ON public.stays;

CREATE POLICY "Authenticated users can create stays" ON public.stays
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update stays" ON public.stays
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete stays" ON public.stays
FOR DELETE TO authenticated
USING (true);

-- Update events policies
DROP POLICY IF EXISTS "Anyone can create events" ON public.events;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.events;

CREATE POLICY "Authenticated users can create events" ON public.events
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Hosts can delete events in their village" ON public.events
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.villages 
    WHERE id = village_id AND created_by = auth.uid()
  )
);

-- Update proposals policies
DROP POLICY IF EXISTS "Anyone can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Anyone can delete proposals" ON public.proposals;

CREATE POLICY "Authenticated users can create proposals" ON public.proposals
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Hosts can delete proposals in their village" ON public.proposals
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.villages 
    WHERE id = village_id AND created_by = auth.uid()
  )
);

-- Update proposal_reactions policies
DROP POLICY IF EXISTS "Anyone can add proposal reactions" ON public.proposal_reactions;
DROP POLICY IF EXISTS "Anyone can delete proposal reactions" ON public.proposal_reactions;

CREATE POLICY "Authenticated users can add proposal reactions" ON public.proposal_reactions
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete proposal reactions" ON public.proposal_reactions
FOR DELETE TO authenticated
USING (true);

-- Update scenius policies
DROP POLICY IF EXISTS "Anyone can create scenius" ON public.scenius;
DROP POLICY IF EXISTS "Anyone can update scenius" ON public.scenius;
DROP POLICY IF EXISTS "Anyone can delete scenius" ON public.scenius;

CREATE POLICY "Authenticated users can create scenius" ON public.scenius
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenius" ON public.scenius
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Hosts can delete scenius in their village" ON public.scenius
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.villages 
    WHERE id = village_id AND created_by = auth.uid()
  )
);

-- Update residents policies
DROP POLICY IF EXISTS "Anyone can create residents" ON public.residents;
DROP POLICY IF EXISTS "Anyone can update residents" ON public.residents;
DROP POLICY IF EXISTS "Anyone can delete residents" ON public.residents;

CREATE POLICY "Authenticated users can create residents" ON public.residents
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update residents" ON public.residents
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Hosts can delete residents in their village" ON public.residents
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.villages 
    WHERE id = village_id AND created_by = auth.uid()
  )
);
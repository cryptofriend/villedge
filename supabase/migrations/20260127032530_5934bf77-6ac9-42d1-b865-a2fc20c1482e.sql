-- Update spots policy: Only hosts can update spots in their village
DROP POLICY IF EXISTS "Authenticated users can update spots" ON public.spots;
CREATE POLICY "Hosts can update spots in their village"
ON public.spots FOR UPDATE
TO authenticated
USING (
  village_id IS NULL OR public.is_village_host(auth.uid(), village_id)
);

-- Update residents policy: Only hosts can update residents in their village
DROP POLICY IF EXISTS "Authenticated users can update residents" ON public.residents;
CREATE POLICY "Hosts can update residents in their village"
ON public.residents FOR UPDATE
TO authenticated
USING (public.is_village_host(auth.uid(), village_id));

-- Update stays policy: Hosts can update any stay in their village, OR users can update their own stays
DROP POLICY IF EXISTS "Authenticated users can update stays" ON public.stays;
CREATE POLICY "Hosts or owners can update stays"
ON public.stays FOR UPDATE
TO authenticated
USING (
  public.is_village_host(auth.uid(), village_id) OR user_id = auth.uid()
);
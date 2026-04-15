DROP POLICY IF EXISTS "Hosts can update their villages" ON public.villages;

CREATE POLICY "Hosts and admins can update villages"
ON public.villages
FOR UPDATE
TO authenticated
USING (
  is_village_host(auth.uid(), id)
  OR
  is_admin(auth.uid())
);
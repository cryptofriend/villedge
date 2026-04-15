DROP POLICY IF EXISTS "Hosts can insert co-hosts" ON public.village_hosts;
DROP POLICY IF EXISTS "Owners can insert co-hosts" ON public.village_hosts;
DROP POLICY IF EXISTS "Hosts and admins can insert co-hosts" ON public.village_hosts;

CREATE POLICY "Hosts and admins can insert co-hosts"
ON public.village_hosts
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR is_village_host(auth.uid(), village_id)
);
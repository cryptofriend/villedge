DROP POLICY IF EXISTS "Owners can insert co-hosts" ON public.village_hosts;

CREATE POLICY "Hosts can insert co-hosts"
ON public.village_hosts
FOR INSERT
TO public
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM villages
    WHERE villages.id = village_hosts.village_id
      AND villages.created_by = auth.uid()
  ))
  OR
  is_village_host(auth.uid(), village_id)
);
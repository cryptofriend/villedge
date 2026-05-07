DROP POLICY IF EXISTS "Hosts can delete spots in their village" ON public.spots;

CREATE POLICY "Hosts can delete spots in their village"
ON public.spots
FOR DELETE
TO authenticated
USING (
  (village_id IS NULL AND created_by = auth.uid())
  OR (village_id IS NOT NULL AND public.is_village_host(auth.uid(), village_id))
  OR public.is_admin(auth.uid())
);
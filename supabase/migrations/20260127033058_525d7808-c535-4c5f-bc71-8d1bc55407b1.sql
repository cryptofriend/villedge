-- Update stays delete policy: Only hosts can delete stays in their village, OR users can delete their own stays
DROP POLICY IF EXISTS "Authenticated users can delete stays" ON public.stays;
CREATE POLICY "Hosts or owners can delete stays"
ON public.stays FOR DELETE
TO authenticated
USING (
  public.is_village_host(auth.uid(), village_id) OR user_id = auth.uid()
);
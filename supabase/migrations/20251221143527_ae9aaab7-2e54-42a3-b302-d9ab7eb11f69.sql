-- Allow anyone to update spots (for adjusting coordinates)
CREATE POLICY "Anyone can update spots"
ON public.spots
FOR UPDATE
USING (true)
WITH CHECK (true);
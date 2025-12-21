-- Allow anyone to delete spots
CREATE POLICY "Anyone can delete spots" 
ON public.spots 
FOR DELETE 
USING (true);
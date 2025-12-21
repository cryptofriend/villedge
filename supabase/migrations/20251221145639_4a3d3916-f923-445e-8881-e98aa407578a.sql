-- Add google_maps_url column to spots table
ALTER TABLE public.spots 
ADD COLUMN google_maps_url text;
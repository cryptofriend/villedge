-- Create storage bucket for village thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('village-thumbnails', 'village-thumbnails', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view village thumbnails (public bucket)
CREATE POLICY "Anyone can view village thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'village-thumbnails');

-- Allow hosts to upload their village thumbnails
CREATE POLICY "Hosts can upload village thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'village-thumbnails' 
  AND auth.uid() IS NOT NULL
);

-- Allow hosts to update their village thumbnails
CREATE POLICY "Hosts can update village thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'village-thumbnails' 
  AND auth.uid() IS NOT NULL
);

-- Allow hosts to delete their village thumbnails
CREATE POLICY "Hosts can delete village thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'village-thumbnails' 
  AND auth.uid() IS NOT NULL
);
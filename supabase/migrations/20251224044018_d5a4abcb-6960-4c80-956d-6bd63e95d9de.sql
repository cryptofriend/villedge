-- Create storage bucket for spot images
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-images', 'spot-images', true);

-- Allow anyone to view spot images
CREATE POLICY "Anyone can view spot images"
ON storage.objects FOR SELECT
USING (bucket_id = 'spot-images');

-- Allow anyone to upload spot images
CREATE POLICY "Anyone can upload spot images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'spot-images');

-- Allow anyone to update spot images
CREATE POLICY "Anyone can update spot images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'spot-images');

-- Allow anyone to delete spot images
CREATE POLICY "Anyone can delete spot images"
ON storage.objects FOR DELETE
USING (bucket_id = 'spot-images');
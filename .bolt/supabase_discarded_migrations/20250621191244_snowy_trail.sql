/*
  # Create parking-spots storage bucket

  1. Storage Setup
    - Create 'parking-spots' bucket for storing parking spot images
    - Set up public access policy for uploaded images
    - Configure bucket settings for optimal performance

  2. Security
    - Allow public read access to uploaded images
    - Restrict upload access to authenticated users only
    - Set file size and type restrictions
*/

-- Create the parking-spots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parking-spots',
  'parking-spots',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to images
CREATE POLICY "Public read access for parking spot images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'parking-spots');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload parking spot images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'parking-spots');

-- Allow users to update their own uploaded images
CREATE POLICY "Users can update own parking spot images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'parking-spots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete own parking spot images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'parking-spots' AND auth.uid()::text = (storage.foldername(name))[1]);
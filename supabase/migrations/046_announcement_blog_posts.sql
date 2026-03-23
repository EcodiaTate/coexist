-- ============================================================
-- 046: Upgrade announcements to blog-post style
-- Adds image_urls (array) for multi-image support
-- ============================================================

-- Add image_urls column (text array for multiple images)
ALTER TABLE public.global_announcements
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Migrate existing single image_url data into image_urls array
UPDATE public.global_announcements
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR image_urls = '{}');

-- Note: keeping image_url column for backward compat; frontend will use image_urls going forward

-- Allow admin staff to upload images to the announcements storage bucket
-- (Previously only service-role could upload; now admin users can upload from frontend)
CREATE POLICY "announcements: admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcements'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('national_admin', 'super_admin')
    )
  );

CREATE POLICY "announcements: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'announcements'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('national_admin', 'super_admin')
    )
  );

CREATE POLICY "announcements: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcements'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('national_admin', 'super_admin')
    )
  );

-- Allow admin/staff to upload, update, and delete merch product images.
-- The merch-images bucket previously only had a public read policy;
-- admins could not upload from the client (only via service-role key).

CREATE POLICY "merch-images: admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'merch-images'
    AND is_admin_or_staff(auth.uid())
  );

CREATE POLICY "merch-images: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'merch-images'
    AND is_admin_or_staff(auth.uid())
  );

CREATE POLICY "merch-images: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'merch-images'
    AND is_admin_or_staff(auth.uid())
  );

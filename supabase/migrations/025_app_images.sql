-- ============================================================
-- Migration 025: App Images (admin-configurable branding images)
-- Key-value store for image URLs used across the app.
-- ============================================================

-- App images table (key-value: slot name → image URL)
create table if not exists app_images (
  key text primary key,
  url text not null,
  label text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- RLS
alter table app_images enable row level security;

-- Anyone authenticated can read (images are public-facing)
create policy app_images_select_all on app_images
  for select to authenticated using (true);

-- Only admin/staff can manage
create policy app_images_manage_admin on app_images
  for all using (is_admin_or_staff(auth.uid()));

-- Storage bucket for app branding images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('app-images', 'app-images', true, 5 * 1024 * 1024,
    ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, admin write
CREATE POLICY "app-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-images');

CREATE POLICY "app-images: admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'app-images'
    AND is_admin_or_staff(auth.uid())
  );

CREATE POLICY "app-images: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'app-images'
    AND is_admin_or_staff(auth.uid())
  );

CREATE POLICY "app-images: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'app-images'
    AND is_admin_or_staff(auth.uid())
  );

-- Seed default image slots with empty URLs (admin fills these in)
INSERT INTO app_images (key, url, label) VALUES
  ('home_hero',           '', 'Home page hero banner'),
  ('placeholder_event',   '', 'Default event cover image'),
  ('placeholder_merch',   '', 'Default merch product image'),
  ('hero_welcome',        '', 'Welcome/login page hero'),
  ('hero_download',       '', 'Download page hero'),
  ('placeholder_collective', '', 'Default collective cover image'),
  ('onboarding_bg',       '', 'Onboarding background image'),
  ('email_header',        '', 'Email template header image')
ON CONFLICT (key) DO NOTHING;

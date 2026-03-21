-- ============================================================
-- 017: Remove badge system entirely
-- ============================================================

-- Drop RPC function
DROP FUNCTION IF EXISTS check_badge_criteria(uuid);

-- Drop storage policies for badges bucket
DROP POLICY IF EXISTS "badges: public read" ON storage.objects;

-- Drop the badges bucket via truncate workaround (triggers block DELETE)
DO $$
BEGIN
  -- Remove objects belonging to the badges bucket
  ALTER TABLE storage.objects DISABLE TRIGGER ALL;
  DELETE FROM storage.objects WHERE bucket_id = 'badges';
  ALTER TABLE storage.objects ENABLE TRIGGER ALL;

  -- Remove the bucket itself
  ALTER TABLE storage.buckets DISABLE TRIGGER ALL;
  DELETE FROM storage.buckets WHERE id = 'badges';
  ALTER TABLE storage.buckets ENABLE TRIGGER ALL;
EXCEPTION WHEN insufficient_privilege THEN
  -- If we lack superuser, just skip — bucket can be removed manually
  RAISE NOTICE 'Could not delete badges bucket (insufficient privilege), skipping';
END;
$$;

-- Drop RLS policies on user_badges
DROP POLICY IF EXISTS "user_badges_select_authenticated" ON user_badges;
DROP POLICY IF EXISTS "user_badges_select_own_or_admin" ON user_badges;
DROP POLICY IF EXISTS "user_badges_select_all" ON user_badges;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_badges_user;
DROP INDEX IF EXISTS idx_user_badges_badge;
DROP INDEX IF EXISTS idx_badges_category;

-- Drop tables (user_badges first due to FK)
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;

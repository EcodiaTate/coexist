-- ============================================================
-- 017: Remove badge system entirely
-- ============================================================

-- Drop RPC function
DROP FUNCTION IF EXISTS check_badge_criteria(uuid);

-- Drop storage policies for badges bucket
DROP POLICY IF EXISTS "badges: public read" ON storage.objects;

-- Drop the badges storage bucket
DELETE FROM storage.buckets WHERE id = 'badges';

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

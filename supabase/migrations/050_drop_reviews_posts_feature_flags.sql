-- 050: Drop product_reviews, posts/feed, and feature_flags
-- These features have been removed from the application code.

-- =====================================================================
-- 1. Product Reviews
-- =====================================================================

DROP TABLE IF EXISTS product_reviews CASCADE;

-- Remove review columns from merch_products (if they exist)
ALTER TABLE merch_products DROP COLUMN IF EXISTS avg_rating;
ALTER TABLE merch_products DROP COLUMN IF EXISTS review_count;

-- =====================================================================
-- 2. Community Feed / Posts
-- =====================================================================

DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Remove 'post' and 'comment' from content_reports constraint (if exists).
-- content_reports is shared with chat moderation so we keep the table,
-- just tighten the allowed content_type values.
DO $$
BEGIN
  -- Drop old constraint if it exists, then recreate without post/comment
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_reports_content_type_check'
      AND table_name = 'content_reports'
  ) THEN
    ALTER TABLE content_reports DROP CONSTRAINT content_reports_content_type_check;
    ALTER TABLE content_reports ADD CONSTRAINT content_reports_content_type_check
      CHECK (content_type IN ('photo', 'chat_message', 'user'));
  END IF;
END $$;

-- Remove posts from realtime publication (if still listed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE posts;
  END IF;
END $$;

-- =====================================================================
-- 3. Feature Flags
-- =====================================================================

DROP TABLE IF EXISTS feature_flags CASCADE;

-- Remove feature_flags from the admin stats RPC (if it references it)
-- We recreate the function without the feature_flags count.
CREATE OR REPLACE FUNCTION get_admin_system_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profiles',             (SELECT COUNT(*) FROM profiles),
    'collectives',          (SELECT COUNT(*) FROM collectives),
    'collective_members',   (SELECT COUNT(*) FROM collective_members),
    'events',               (SELECT COUNT(*) FROM events),
    'event_registrations',  (SELECT COUNT(*) FROM event_registrations),
    'event_impact',         (SELECT COUNT(*) FROM event_impact),
    'chat_messages',        (SELECT COUNT(*) FROM chat_messages),
    'notifications',        (SELECT COUNT(*) FROM notifications),
    'donations',            (SELECT COUNT(*) FROM donations),
    'merch_products',       (SELECT COUNT(*) FROM merch_products),
    'merch_orders',         (SELECT COUNT(*) FROM merch_orders),
    'content_reports',      (SELECT COUNT(*) FROM content_reports),
    'audit_log',            (SELECT COUNT(*) FROM audit_log),
    'surveys',              (SELECT COUNT(*) FROM surveys),
    'survey_responses',     (SELECT COUNT(*) FROM survey_responses),
    'challenges',           (SELECT COUNT(*) FROM challenges)
  ) INTO result;

  RETURN result;
END;
$$;

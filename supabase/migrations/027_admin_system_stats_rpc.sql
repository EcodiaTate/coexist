-- RPC for admin system page: counts all rows bypassing RLS
-- Only callable by admin/staff (checked inside function)

CREATE OR REPLACE FUNCTION get_admin_system_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Guard: only admin/staff
  IF NOT is_admin_or_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'profiles',            (SELECT COUNT(*) FROM profiles),
    'collectives',         (SELECT COUNT(*) FROM collectives),
    'collective_members',  (SELECT COUNT(*) FROM collective_members),
    'events',              (SELECT COUNT(*) FROM events),
    'event_registrations', (SELECT COUNT(*) FROM event_registrations),
    'event_impact',        (SELECT COUNT(*) FROM event_impact),
    'posts',               (SELECT COUNT(*) FROM posts),
    'post_comments',       (SELECT COUNT(*) FROM post_comments),
    'post_likes',          (SELECT COUNT(*) FROM post_likes),
    'chat_messages',       (SELECT COUNT(*) FROM chat_messages),
    'notifications',       (SELECT COUNT(*) FROM notifications),
    'donations',           (SELECT COUNT(*) FROM donations),
    'recurring_donations', (SELECT COUNT(*) FROM recurring_donations),
    'merch_orders',        (SELECT COUNT(*) FROM merch_orders),
    'surveys',             (SELECT COUNT(*) FROM surveys),
    'survey_responses',    (SELECT COUNT(*) FROM survey_responses),
    'feature_flags',       (SELECT COUNT(*) FROM feature_flags),
    'content_reports',     (SELECT COUNT(*) FROM content_reports),
    'audit_log',           (SELECT COUNT(*) FROM audit_log),
    'push_tokens',         (SELECT COUNT(*) FROM push_tokens),
    'global_announcements',(SELECT COUNT(*) FROM global_announcements),
    'impact_species',      (SELECT COUNT(*) FROM impact_species),
    'impact_areas',        (SELECT COUNT(*) FROM impact_areas),
    'organisations',       (SELECT COUNT(*) FROM organisations),
    'challenges',          (SELECT COUNT(*) FROM challenges),
    'partner_offers',      (SELECT COUNT(*) FROM partner_offers),
    'invites',             (SELECT COUNT(*) FROM invites),
    'merch_products',      (SELECT COUNT(*) FROM merch_products),
    'promo_codes',         (SELECT COUNT(*) FROM promo_codes),
    'event_series',        (SELECT COUNT(*) FROM event_series)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

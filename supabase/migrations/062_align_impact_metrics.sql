-- ============================================================================
-- 062: Align impact metric RPCs — drop leaders_trained from aggregations
--
-- "Leaders Trained" is derived from collective_members role assignments,
-- not from event_impact logging. Remove it from RPC sums so all scopes
-- (personal, collective, national) are consistent.
-- ============================================================================

-- 1. Update get_user_impact_stats — drop leaders_trained, add coastline_cleaned_m
CREATE OR REPLACE FUNCTION get_user_impact_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'events_attended', COUNT(DISTINCT er.event_id),
    'trees_planted', COALESCE(SUM(ei.trees_planted), 0),
    'rubbish_kg', COALESCE(SUM(ei.rubbish_kg), 0),
    'coastline_cleaned_m', COALESCE(SUM(ei.coastline_cleaned_m), 0),
    'hours_volunteered', COALESCE(SUM(ei.hours_total), 0),
    'area_restored_sqm', COALESCE(SUM(ei.area_restored_sqm), 0),
    'native_plants', COALESCE(SUM(ei.native_plants), 0),
    'wildlife_sightings', COALESCE(SUM(ei.wildlife_sightings), 0),
    'invasive_weeds_pulled', COALESCE(SUM(ei.invasive_weeds_pulled), 0)
  ) INTO result
  FROM event_registrations er
  JOIN events e ON e.id = er.event_id
  LEFT JOIN event_impact ei ON ei.event_id = e.id
  WHERE er.user_id = p_user_id AND er.status = 'attended';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Update get_collective_stats — add invasive_weeds_pulled (was missing)
CREATE OR REPLACE FUNCTION get_collective_stats(p_collective_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'member_count', (SELECT COUNT(*) FROM collective_members WHERE collective_id = p_collective_id AND status = 'active'),
    'event_count', (SELECT COUNT(*) FROM events WHERE collective_id = p_collective_id AND status IN ('published', 'completed')),
    'trees_planted', COALESCE(SUM(ei.trees_planted), 0),
    'rubbish_kg', COALESCE(SUM(ei.rubbish_kg), 0),
    'coastline_cleaned_m', COALESCE(SUM(ei.coastline_cleaned_m), 0),
    'hours_total', COALESCE(SUM(ei.hours_total), 0),
    'area_restored_sqm', COALESCE(SUM(ei.area_restored_sqm), 0),
    'native_plants', COALESCE(SUM(ei.native_plants), 0),
    'wildlife_sightings', COALESCE(SUM(ei.wildlife_sightings), 0),
    'invasive_weeds_pulled', COALESCE(SUM(ei.invasive_weeds_pulled), 0),
    'attendance_rate', CASE
      WHEN (SELECT COUNT(*) FROM event_registrations er2 JOIN events e2 ON e2.id = er2.event_id WHERE e2.collective_id = p_collective_id AND er2.status IN ('registered', 'attended')) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*)::numeric FROM event_registrations er3 JOIN events e3 ON e3.id = er3.event_id WHERE e3.collective_id = p_collective_id AND er3.status = 'attended')
        / (SELECT COUNT(*)::numeric FROM event_registrations er4 JOIN events e4 ON e4.id = er4.event_id WHERE e4.collective_id = p_collective_id AND er4.status IN ('registered', 'attended')),
        2
      )
    END
  ) INTO result
  FROM events e
  LEFT JOIN event_impact ei ON ei.event_id = e.id
  WHERE e.collective_id = p_collective_id AND e.status IN ('published', 'completed');

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

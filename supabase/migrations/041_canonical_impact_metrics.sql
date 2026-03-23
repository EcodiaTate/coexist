-- Migration: Add canonical impact metrics columns
-- Adds invasive_weeds_pulled and leaders_trained to event_impact table
-- Updates get_user_impact_stats RPC to include new fields

-- Step 1: Add new columns to event_impact
ALTER TABLE event_impact
  ADD COLUMN IF NOT EXISTS invasive_weeds_pulled integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leaders_trained integer DEFAULT 0;

-- Step 2: Update get_user_impact_stats RPC to return canonical metrics
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
    'invasive_weeds_pulled', COALESCE(SUM(ei.invasive_weeds_pulled), 0),
    'leaders_trained', COALESCE(SUM(ei.leaders_trained), 0)
  ) INTO result
  FROM event_registrations er
  JOIN events e ON e.id = er.event_id
  LEFT JOIN event_impact ei ON ei.event_id = e.id
  WHERE er.user_id = p_user_id AND er.status = 'attended';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

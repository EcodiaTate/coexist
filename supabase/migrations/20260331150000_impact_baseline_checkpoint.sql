-- ============================================================================
-- Impact Baseline Checkpoint — 2025-12-31
--
-- The organisation's website was updated at the start of 2026 with verified
-- cumulative totals. We freeze those as baseline numbers and sum event_impact
-- rows logged on or after 2026-01-01 on top of them.
--
-- Baseline figures (as of end of 2025, from published website):
--   Volunteers           : 5,500
--   Trees planted        : 35,000
--   Rubbish removed (kg) : 4,900 (4.9t)
-- ============================================================================

INSERT INTO app_settings (key, value)
VALUES
  ('impact_baseline_date',      '"2025-12-31"'::jsonb),
  ('impact_baseline_attendees', '{"count": 5500}'::jsonb),
  ('impact_baseline_trees',     '{"count": 35000}'::jsonb),
  ('impact_baseline_rubbish_kg','{"count": 4900}'::jsonb)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;

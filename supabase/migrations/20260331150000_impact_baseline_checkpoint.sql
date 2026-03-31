-- ============================================================================
-- Impact Baseline Checkpoint — 2026-03-31
--
-- As of today (31 March 2026), the organisation's historical records
-- are authoritative. We freeze those totals as baseline numbers and
-- going forward only sum event_impact rows logged on or after this date.
--
-- Baseline figures taken from the master spreadsheet:
--   Attendees/Volunteers : 6,164
--   Events held          : 388
--   Trees planted        : 23,419
--   Rubbish removed (kg) : 5,403.6
--   Collectives          : 14
--   Beach clean-up events: 166
--   Tree planting events : 34
--   Nature hike events   : 92
-- ============================================================================

INSERT INTO app_settings (key, value)
VALUES
  ('impact_baseline_date',      '"2026-03-31"'::jsonb),
  ('impact_baseline_attendees', '{"count": 6164}'::jsonb),
  ('impact_baseline_events',    '{"count": 388}'::jsonb),
  ('impact_baseline_trees',     '{"count": 23419}'::jsonb),
  ('impact_baseline_rubbish_kg','{"count": 5403.6}'::jsonb)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;

-- ============================================================================
-- Fix trees_planted double-counting on survey-synced legacy rows.
--
-- Context:
--   20260401000000 cleared `notes` on rows that had "Legacy import:%" AND
--   custom_metrics->>'survey_synced' = 'true'. Once notes were cleared,
--   those rows are counted in the live (non-legacy) sum. But their
--   trees_planted values came from the historical backfill, which is already
--   covered by the BASELINE_TREES constant (35,000).
--
--   Additionally, the attendees backfill (20260401010000) only set attendees —
--   it did not touch trees_planted — so any non-zero trees on those rows
--   are still legacy backfill values.
--
-- Fix: null out trees_planted on all non-legacy rows (notes IS NULL or not
--   starting with 'Legacy import:') whose trees_planted value came from
--   a legacy backfill event (i.e. the event title is 'Historical Data Backfill'
--   or 'Historical Data Correction', or the event was created before 2026).
-- ============================================================================

-- Null out trees_planted on backfill event rows that now have notes = NULL
-- (were survey-synced, meaning their legacy trees are already in the baseline).
UPDATE event_impact ei
SET trees_planted = NULL
FROM events e
WHERE ei.event_id = e.id
  AND (ei.notes IS NULL OR ei.notes NOT LIKE 'Legacy import:%')
  AND ei.trees_planted IS NOT NULL
  AND ei.trees_planted > 0
  AND e.date_start < '2026-01-01';

-- Verify: count non-legacy rows with trees_planted > 0 (should be only real 2026 events)
SELECT
  COUNT(*) AS rows_with_trees,
  SUM(ei.trees_planted) AS total_trees,
  MIN(e.date_start) AS earliest_event,
  MAX(e.date_start) AS latest_event
FROM event_impact ei
JOIN events e ON e.id = ei.event_id
WHERE (ei.notes IS NULL OR ei.notes NOT LIKE 'Legacy import:%')
  AND ei.trees_planted IS NOT NULL
  AND ei.trees_planted > 0;

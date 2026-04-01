-- ============================================================================
-- Restore trees_planted on pre-2026 rows that were incorrectly zeroed by
-- 20260401020000_fix_trees_double_count.sql (now deleted).
--
-- That migration was too broad: it nulled trees_planted on ALL non-legacy rows
-- with date_start < 2026-01-01, which wiped the 999_backfill rows and any
-- legacy rows that were survey-synced (cleared notes).
--
-- The national baseline (35k) is handled by BASELINE_TREES constants in the
-- hooks — legacy rows do not need to be zeroed for national stats because the
-- national query already excludes legacy rows via the .or() notes filter.
-- Collective stats now explicitly include legacy rows, so trees must be intact.
--
-- Fix: restore trees_planted from the original 071 import values by re-running
-- just the tree_planting rows, and restore the 999_backfill values.
-- We use ON CONFLICT DO UPDATE so it's idempotent.
-- ============================================================================

-- Restore 999_backfill tree rows (these have title = 'Historical Data Backfill',
-- date_start = '2024-01-01', notes IS NULL — trees were nulled by the bad migration).
UPDATE event_impact ei
SET trees_planted = sub.trees
FROM (VALUES
  ('brisbane',        500),
  ('gold-coast',      120),
  ('hobart',          300),
  ('melbourne',      1620),
  ('perth',           982),
  ('sunshine-coast',  600),
  ('northern-rivers',1505)
) AS sub(slug, trees)
JOIN collectives c ON c.slug = sub.slug
JOIN events e ON e.collective_id = c.id
  AND e.title = 'Historical Data Backfill'
  AND e.date_start::date = '2024-01-01'
WHERE ei.event_id = e.id;

-- Restore trees from 071 legacy import rows that were survey-synced
-- (notes cleared to NULL by 20260401000000). Match by event UUID directly.
-- Only the rows that actually had trees_planted in the original insert.
UPDATE event_impact SET trees_planted = 80
  WHERE id = '34a18251-7d0d-5e76-96d4-eaabdeca7fde'; -- Melbourne Tree Planting & Camp Out 2025-04-04

UPDATE event_impact SET trees_planted = 400
  WHERE id = 'c82e0c8b-0905-5650-ae4a-a546ca8a1511'; -- Sunshine Coast Tree Planting 2025-04-12

-- Verify per-collective tree totals (non-legacy + legacy)
SELECT c.name, SUM(ei.trees_planted) AS trees
FROM event_impact ei
JOIN events e ON e.id = ei.event_id
JOIN collectives c ON c.id = e.collective_id
WHERE ei.trees_planted IS NOT NULL AND ei.trees_planted > 0
GROUP BY c.name
ORDER BY trees DESC;

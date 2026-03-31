-- ============================================================================
-- Backfill hours_total on all event_impact rows
--
-- Currently hours_total is NULL everywhere. The app computes "Est. Vol Hours"
-- client-side via computeEstimatedHours() using legacy notes + event duration.
-- This migration bakes those hours into the DB so stats are consistent.
--
-- Two passes:
--   1. Set hours on the 2024 backfill events (attendees × 4 hrs from spreadsheet)
--   2. Set hours on all other events using legacy notes attendance × duration
-- ============================================================================

-- ============================================================================
-- PASS 1: 2024 backfill events (title = 'Historical Data Backfill' or 'Correction')
-- These have no legacy notes, so we set hours from spreadsheet attendance data.
-- Formula: total_2024_attendees_per_collective × 4 hrs avg event duration
-- ============================================================================

UPDATE event_impact ei
SET hours_total = sub.hours
FROM (
  SELECT ei2.id AS impact_id,
    CASE c.name
      WHEN 'Brisbane'              THEN 132    -- 33 att × 4
      WHEN 'Gold Coast'            THEN 532    -- 133 att × 4
      WHEN 'Hobart'                THEN 392    -- 98 att × 4
      WHEN 'Melbourne'             THEN 648    -- 162 att × 4
      WHEN 'Perth'                 THEN 2756   -- 689 att × 4
      WHEN 'Sunshine Coast'        THEN 2100   -- 525 att × 4
      WHEN 'Northern Rivers'       THEN 104    -- 26 att × 4
      WHEN 'Townsville'            THEN 152    -- 38 att × 4
      WHEN 'Cairns'                THEN 456    -- 114 att × 4
      ELSE 0
    END AS hours
  FROM event_impact ei2
  JOIN events e ON e.id = ei2.event_id
  JOIN collectives c ON c.id = e.collective_id
  WHERE e.title IN ('Historical Data Backfill', 'Historical Data Correction')
    AND EXTRACT(YEAR FROM e.date_start) = 2024
) sub
WHERE ei.id = sub.impact_id;


-- ============================================================================
-- PASS 2: All other events — parse attendance from legacy notes × duration
--
-- Legacy notes format: "Legacy import: XX attendees"
-- Duration: date_end - date_start, fallback to 3 hours if missing/same
-- Only update where hours_total IS NULL or 0 (don't overwrite real data)
-- ============================================================================

UPDATE event_impact ei
SET hours_total = sub.estimated_hours
FROM (
  SELECT
    ei2.id AS impact_id,
    ROUND(
      (REGEXP_REPLACE(ei2.notes, '.*Legacy import:\s*(\d+)\s*attendees.*', '\1'))::numeric
      * CASE
          WHEN e.date_end IS NOT NULL AND e.date_end > e.date_start
          THEN EXTRACT(EPOCH FROM (e.date_end - e.date_start)) / 3600.0
          ELSE 3.0
        END
    ) AS estimated_hours
  FROM event_impact ei2
  JOIN events e ON e.id = ei2.event_id
  WHERE ei2.notes ~ 'Legacy import:\s*\d+\s*attendees'
    AND (ei2.hours_total IS NULL OR ei2.hours_total = 0)
) sub
WHERE ei.id = sub.impact_id
  AND sub.estimated_hours > 0;


-- ============================================================================
-- PASS 3: Events with event_registrations (attended) but no legacy notes
-- attendance × duration for any stragglers
-- ============================================================================

UPDATE event_impact ei
SET hours_total = sub.estimated_hours
FROM (
  SELECT
    ei2.id AS impact_id,
    ROUND(
      att.cnt::numeric
      * CASE
          WHEN e.date_end IS NOT NULL AND e.date_end > e.date_start
          THEN EXTRACT(EPOCH FROM (e.date_end - e.date_start)) / 3600.0
          ELSE 4.0
        END
    ) AS estimated_hours
  FROM event_impact ei2
  JOIN events e ON e.id = ei2.event_id
  JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM event_registrations er
    WHERE er.event_id = e.id AND er.status = 'attended'
  ) att ON att.cnt > 0
  WHERE (ei2.hours_total IS NULL OR ei2.hours_total = 0)
    AND (ei2.notes IS NULL OR ei2.notes !~ 'Legacy import')
) sub
WHERE ei.id = sub.impact_id
  AND sub.estimated_hours > 0;

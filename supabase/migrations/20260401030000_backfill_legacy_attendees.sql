-- ============================================================================
-- Backfill attendees column on legacy import rows from notes text.
--
-- All legacy rows have notes like 'Legacy import: X attendees ...'
-- The count is already correct in the notes (sourced from both spreadsheets,
-- with Master Impact Sheet values taking precedence for 2025 conflicts).
--
-- This extracts the number and sets attendees = X on every legacy row
-- that doesn't already have attendees set.
-- ============================================================================

UPDATE event_impact
SET attendees = (
  REGEXP_REPLACE(notes, '^Legacy import:\s*(\d+)\s*attendees.*$', '\1')
)::integer
WHERE notes LIKE 'Legacy import:%'
  AND notes ~ 'Legacy import:\s*\d+\s*attendees'
  AND (attendees IS NULL OR attendees = 0);

-- Verify: total attendees across all legacy rows
SELECT
  COUNT(*)            AS legacy_rows_updated,
  SUM(attendees)      AS total_legacy_attendees
FROM event_impact
WHERE notes LIKE 'Legacy import:%'
  AND attendees IS NOT NULL
  AND attendees > 0;

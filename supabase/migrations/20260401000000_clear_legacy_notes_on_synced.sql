-- ============================================================================
-- Clear legacy notes on event_impact rows that have been survey-synced.
--
-- When a leader fills a survey for an event that previously had a legacy
-- bulk-import row, the upsert preserved the old "Legacy import: X attendees"
-- notes. This caused the row to be excluded from post-baseline impact sums.
-- ============================================================================

UPDATE event_impact
SET notes = NULL,
    logged_by = COALESCE(
      (SELECT er.user_id FROM event_registrations er
       WHERE er.event_id = event_impact.event_id
       AND er.status = 'attended'
       LIMIT 1),
      logged_by
    )
WHERE notes LIKE 'Legacy import:%'
  AND custom_metrics->>'survey_synced' = 'true';

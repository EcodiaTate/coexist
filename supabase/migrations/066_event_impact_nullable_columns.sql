-- ============================================================================
-- 066: Drop DEFAULT 0 from event_impact builtin metric columns
--
-- NULL means "not measured at this event" (no survey question was wired,
-- or the leader didn't fill that field).  0 means "measured and was zero".
-- The old DEFAULT 0 caused every column to show 0 in aggregates even when
-- the metric was never logged, making it impossible to distinguish "zero
-- trees planted" from "no tree data collected".
--
-- After this migration the application code (log-impact.tsx) passes null
-- for any builtin column it didn't receive a value for, which is the
-- intended behaviour.  The sumMetric() helper uses `Number(x) || 0` so
-- JavaScript aggregation is unaffected.  The Postgres RPCs use COALESCE
-- so SQL aggregation is also unaffected.
-- ============================================================================

ALTER TABLE event_impact
  ALTER COLUMN trees_planted        DROP DEFAULT,
  ALTER COLUMN rubbish_kg           DROP DEFAULT,
  ALTER COLUMN coastline_cleaned_m  DROP DEFAULT,
  ALTER COLUMN hours_total          DROP DEFAULT,
  ALTER COLUMN area_restored_sqm    DROP DEFAULT,
  ALTER COLUMN native_plants        DROP DEFAULT,
  ALTER COLUMN wildlife_sightings   DROP DEFAULT,
  ALTER COLUMN invasive_weeds_pulled DROP DEFAULT;

-- Migration 079: Add is_impact_form flag to surveys
--
-- Impact forms are admin-configured surveys sent to collective LEADERS
-- (not attendees) after events. They're assigned as shared tasks —
-- any leader/co-leader/assist-leader can fill one out on behalf of
-- the collective. Answers tagged with impact_metric flow into
-- event_impact via syncSurveyImpact().
--
-- This is distinct from auto_send_after_event, which sends attendee
-- feedback surveys. A survey cannot be both.

-- 1. Add the flag
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS is_impact_form boolean NOT NULL DEFAULT false;

-- 2. Ensure only one impact form per activity type
--    (same pattern as the existing surveys_activity_type_unique index)
CREATE UNIQUE INDEX IF NOT EXISTS surveys_impact_form_activity_type_unique
  ON surveys (activity_type)
  WHERE is_impact_form = true AND activity_type IS NOT NULL AND status = 'active';

-- 3. Add a check: is_impact_form and auto_send_after_event are mutually exclusive
ALTER TABLE surveys
  ADD CONSTRAINT surveys_form_type_exclusive
  CHECK (NOT (is_impact_form = true AND auto_send_after_event = true));

-- 4. Add impact_form_config to app_settings (parallel to auto_survey_config)
--    Controls: enabled, auto-create task on event completion, deadline hours
INSERT INTO app_settings (key, value)
VALUES (
  'impact_form_config',
  '{"enabled": true, "auto_task_enabled": true, "deadline_hours": 48}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

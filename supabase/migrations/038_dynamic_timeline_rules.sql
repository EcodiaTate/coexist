-- ============================================================
-- 038: Dynamic Timeline Rules
-- ============================================================
-- Allows task templates to have dynamic due dates that are
-- computed relative to per-collective events. Instead of a
-- single fixed offset, admins define timeline rules that
-- anchor deadlines to each collective's upcoming events.
-- ============================================================

-- Timeline anchor type: what the deadline is relative to
CREATE TYPE timeline_anchor AS ENUM (
  'next_event',           -- Next upcoming event for the collective
  'next_event_of_type',   -- Next event matching a specific activity_type
  'event_series'          -- Next event in a specific series
);

-- Timeline rules table
CREATE TABLE timeline_rules (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,

  -- What the deadline anchors to
  anchor          timeline_anchor NOT NULL DEFAULT 'next_event',

  -- Optional filter: only match events of this activity type
  -- (used when anchor = 'next_event_of_type')
  activity_type_filter  activity_type,

  -- Optional filter: only match events in this series
  -- (used when anchor = 'event_series')
  series_id_filter      uuid REFERENCES event_series(id) ON DELETE SET NULL,

  -- Offset from the anchor event date (negative = before, positive = after)
  offset_days     integer NOT NULL DEFAULT -3,

  -- How far ahead to look for matching events (prevents generating
  -- tasks for events months away). Default 60 days.
  lookahead_days  integer NOT NULL DEFAULT 60,

  -- Whether to generate a task for EVERY matching event in the
  -- lookahead window, or just the next one
  match_all_events boolean NOT NULL DEFAULT false,

  -- Human-readable label auto-generated for display
  -- e.g. "3 days before each event" or "7 days after next beach cleanup"
  display_label   text,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  -- One rule per template (could extend to multiple later)
  UNIQUE(template_id)
);

-- Index for fast lookups
CREATE INDEX idx_timeline_rules_template ON timeline_rules(template_id);

-- RLS: same access as task_templates
ALTER TABLE timeline_rules ENABLE ROW LEVEL SECURITY;

-- Staff can read timeline rules (via template access)
CREATE POLICY "Staff can read timeline rules"
  ON timeline_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('national_staff', 'national_admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM collective_members
      WHERE collective_members.user_id = auth.uid()
      AND collective_members.role IN ('leader', 'co_leader', 'assist_leader')
    )
  );

-- Admins can manage timeline rules
CREATE POLICY "Admins can manage timeline rules"
  ON timeline_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('national_staff', 'national_admin', 'super_admin')
    )
  );

-- Add dynamic_timeline flag to task_templates so we know which
-- templates use the new system vs the legacy event_offset_days
ALTER TABLE task_templates
  ADD COLUMN use_dynamic_timeline boolean NOT NULL DEFAULT false;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_timeline_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timeline_rules_updated_at
  BEFORE UPDATE ON timeline_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_rules_updated_at();

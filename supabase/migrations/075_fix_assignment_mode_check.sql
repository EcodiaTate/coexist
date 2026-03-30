-- 075: Fix task_templates assignment_mode CHECK constraint
-- Migration 039 created the constraint with only ('collective', 'individual')
-- but migration 059 added 'assigned' mode without updating the constraint.

ALTER TABLE task_templates
  DROP CONSTRAINT IF EXISTS task_templates_assignment_mode_check;

ALTER TABLE task_templates
  ADD CONSTRAINT task_templates_assignment_mode_check
    CHECK (assignment_mode IN ('collective', 'individual', 'assigned'));

-- ============================================================
-- Migration 039: Task Assignment Mode (Individual vs Collective)
-- Adds assignment_mode to task_templates so admin can choose
-- whether a task is completed once for the whole collective
-- or individually per staff member.
-- ============================================================

-- Add assignment_mode column: 'collective' (default) or 'individual'
-- collective = one instance per collective per period, any staff can complete
-- individual = one instance per user per collective per period
alter table task_templates
  add column if not exists assignment_mode text not null default 'collective'
    check (assignment_mode in ('collective', 'individual'));

-- Add completer profile join support: include display_name on task_instances
-- (completed_by already references profiles, we just need the join in queries)

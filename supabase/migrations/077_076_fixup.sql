-- ============================================================
-- Migration: 077_076_fixup.sql
-- Applies the parts of 076 that failed due to assigned_tasks
-- table not existing on remote.
-- ============================================================

-- The assigned_tasks table doesn't exist — the original policy
-- from 059 was on leader_todos (already handled in 076).
-- Nothing to do for assigned_tasks.

-- managed_collectives column (skipped when 076 errored out)
ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS managed_collectives uuid[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_staff_roles_managed_collectives
  ON staff_roles USING GIN (managed_collectives);

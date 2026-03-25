-- ============================================================
-- 052: Add last_sort_order to dev_user_module_progress
-- The existing last_content_id FK breaks when admins re-save
-- module content (delete + re-insert gives new UUIDs, FK goes NULL).
-- last_sort_order is a stable resume position.
-- ============================================================

ALTER TABLE dev_user_module_progress
  ADD COLUMN IF NOT EXISTS last_sort_order integer;

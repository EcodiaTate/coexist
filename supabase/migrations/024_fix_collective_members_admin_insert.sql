-- ============================================================
-- Migration 021: Allow admin/staff to insert collective_members
-- The existing policy only allows self-insert (user_id = auth.uid()).
-- Admin needs to be able to add users to collectives.
-- ============================================================

-- Add admin insert policy
CREATE POLICY "collective_members_insert_admin"
  ON collective_members FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_staff(auth.uid())
  );

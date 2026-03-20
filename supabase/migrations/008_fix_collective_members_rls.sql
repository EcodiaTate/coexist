-- ============================================================
-- Migration: 008_fix_collective_members_rls.sql
-- Fix: collective_members INSERT (upsert) fails during onboarding
--   because the SELECT policy requires is_collective_member() which
--   returns false for users who aren't yet members — but upsert
--   needs SELECT to check for conflict. Also, users should be able
--   to see their own membership row even before the circular
--   is_collective_member() check passes.
-- ============================================================

-- Drop the restrictive SELECT policy that uses is_collective_member()
DROP POLICY IF EXISTS "collective_members_select_member" ON collective_members;

-- New SELECT policy: users can see their own memberships + admins see all
CREATE POLICY "collective_members_select_own_or_admin"
  ON collective_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_staff(auth.uid())
  );

-- Allow members of a collective to see other members in the same collective
CREATE POLICY "collective_members_select_fellow_members"
  ON collective_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collective_members cm
      WHERE cm.collective_id = collective_members.collective_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

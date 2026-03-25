-- 051: Donor wall RLS fix + recurring_donations status alignment
--
-- The donor wall query needs to read public donations from ALL users,
-- but the existing RLS policy only allows users to see their own donations.
-- Add a policy that allows any authenticated user to SELECT public, succeeded donations.

-- Allow any authenticated user to read public donations (for donor wall)
CREATE POLICY "donations_select_public"
  ON donations FOR SELECT TO authenticated
  USING (is_public = true AND status = 'succeeded');

-- Add 'past_due' to the recurring_donations status CHECK constraint
-- so the type system and webhook can use it directly instead of 'paused' as a proxy.
ALTER TABLE recurring_donations DROP CONSTRAINT IF EXISTS recurring_donations_status_check;
ALTER TABLE recurring_donations ADD CONSTRAINT recurring_donations_status_check
  CHECK (status IN ('active', 'cancelled', 'paused', 'past_due'));

-- ============================================================================
-- 067: Fix event_impact update RLS policy
--
-- The old policy only allowed the original logger (logged_by = auth.uid())
-- or staff to update an impact row.  This blocked other leaders in the
-- same collective from correcting impact data within the 48-hour edit
-- window.  The insert policy already allowed any leader/co_leader/
-- assist_leader of the event's collective, so the update policy should
-- mirror that.
-- ============================================================================

DROP POLICY IF EXISTS "event_impact_update_leader" ON event_impact;

CREATE POLICY "event_impact_update_leader"
  ON event_impact FOR UPDATE TO authenticated
  USING (
    -- Original logger can always update their own row
    logged_by = auth.uid()
    -- Any leader/co_leader/assist_leader of the event's collective
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN collective_members cm
        ON cm.collective_id = e.collective_id
       AND cm.user_id = auth.uid()
       AND cm.role IN ('leader', 'co_leader', 'assist_leader')
      WHERE e.id = event_impact.event_id
    )
    -- Staff/admin override
    OR is_admin_or_staff(auth.uid())
  );

-- Add missing DELETE and UPDATE policies for surveys table.
-- Without these, RLS silently blocks deletes/updates even though the
-- Supabase client reports success (0 rows affected).

CREATE POLICY "surveys_delete_owner_or_admin"
  ON surveys FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin_or_staff(auth.uid())
    OR (
      event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_id AND is_collective_leader_or_above(auth.uid(), e.collective_id)
      )
    )
  );

CREATE POLICY "surveys_update_owner_or_admin"
  ON surveys FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR is_admin_or_staff(auth.uid())
    OR (
      event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_id AND is_collective_leader_or_above(auth.uid(), e.collective_id)
      )
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR is_admin_or_staff(auth.uid())
    OR (
      event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_id AND is_collective_leader_or_above(auth.uid(), e.collective_id)
      )
    )
  );

-- Fix: adds policies that failed in 034 due to staff_roles.capability typo
-- Uses DO blocks to skip policies that already exist

-- Drop the broken policy if it somehow got created
DROP POLICY IF EXISTS "membership_plans_manage_staff" ON membership_plans;

-- Staff can manage plans (permissions is a JSONB column on staff_roles)
CREATE POLICY "membership_plans_manage_staff"
  ON membership_plans FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN staff_roles sr ON sr.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'national_staff'
        AND (sr.permissions->>'manage_membership')::boolean = true
    )
  );

-- Remaining policies from 034 that were never applied (statements after the failure)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'membership_rewards_select') THEN
    CREATE POLICY "membership_rewards_select"
      ON membership_rewards FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'membership_rewards_manage_admin') THEN
    CREATE POLICY "membership_rewards_manage_admin"
      ON membership_rewards FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('national_admin', 'super_admin'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memberships_select_own') THEN
    CREATE POLICY "memberships_select_own"
      ON memberships FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memberships_select_admin') THEN
    CREATE POLICY "memberships_select_admin"
      ON memberships FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('national_admin', 'super_admin'))
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memberships_service_insert') THEN
    CREATE POLICY "memberships_service_insert"
      ON memberships FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memberships_service_update') THEN
    CREATE POLICY "memberships_service_update"
      ON memberships FOR UPDATE TO service_role
      USING (true);
  END IF;
END $$;

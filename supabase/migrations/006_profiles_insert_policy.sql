-- Allow authenticated users to insert their own profile row.
-- The auth trigger (handle_new_user) normally creates the row, but if it
-- hasn't fired yet the onboarding upsert needs INSERT permission.
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

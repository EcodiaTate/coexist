-- 010: Add charity_settings table and admin_list_users RPC
-- Fixes PGRST205 (missing charity_settings table) and PGRST202 (missing admin_list_users function)

-- ============================================================
-- 1. charity_settings — key/value store for ACNC charity config
-- ============================================================
CREATE TABLE charity_settings (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

ALTER TABLE charity_settings ENABLE ROW LEVEL SECURITY;

-- Only national_admin+ can read/write charity settings
CREATE POLICY "charity_settings_select"
  ON charity_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('national_admin', 'super_admin')
    )
  );

CREATE POLICY "charity_settings_insert"
  ON charity_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('national_admin', 'super_admin')
    )
  );

CREATE POLICY "charity_settings_update"
  ON charity_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('national_admin', 'super_admin')
    )
  );

CREATE POLICY "charity_settings_delete"
  ON charity_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('national_admin', 'super_admin')
    )
  );

-- ============================================================
-- 2. admin_list_users — RPC for admin user management page
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_users(
  search_term  text DEFAULT '',
  role_filter  text DEFAULT 'all',
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  id             uuid,
  display_name   text,
  avatar_url     text,
  role           text,
  email          text,
  is_suspended   boolean,
  created_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow national_staff+ to call this
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('national_staff', 'national_admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.role::text,
    u.email::text,
    p.is_suspended,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE
    -- role filter
    (role_filter = 'all' OR p.role::text = role_filter)
    -- search by name or email (case-insensitive)
    AND (
      search_term = ''
      OR p.display_name ILIKE '%' || search_term || '%'
      OR u.email ILIKE '%' || search_term || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

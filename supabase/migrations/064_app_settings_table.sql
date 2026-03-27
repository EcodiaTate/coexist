-- ============================================================================
-- 064: Generic app_settings key/value store
--
-- Used for app-wide configuration (e.g. auto_survey_config).
-- Staff/admins can read and write; participants can read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_public_read"
  ON app_settings FOR SELECT
  USING (true);

CREATE POLICY "app_settings_staff_write"
  ON app_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('national_staff', 'national_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('national_staff', 'national_admin', 'super_admin')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_app_settings_timestamp();

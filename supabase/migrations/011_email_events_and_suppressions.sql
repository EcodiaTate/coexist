-- 011: Email delivery tracking tables
-- Used by Admin > Email & Delivery page to show bounces, complaints, and suppressions.
-- These are populated by SendGrid webhooks or manual imports.

-- Email events: bounces, complaints, deliveries from SendGrid
CREATE TABLE IF NOT EXISTS email_events (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  text NOT NULL CHECK (event_type IN ('bounce', 'complaint', 'delivered', 'dropped', 'deferred')),
  email       text NOT NULL,
  reason      text,
  sg_event_id text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_email_events_type ON email_events (event_type);
CREATE INDEX idx_email_events_email ON email_events (email);
CREATE INDEX idx_email_events_created ON email_events (created_at DESC);

-- Email suppressions: addresses that should not receive emails
CREATE TABLE IF NOT EXISTS email_suppressions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       text NOT NULL UNIQUE,
  reason      text NOT NULL DEFAULT 'bounce' CHECK (reason IN ('bounce', 'complaint', 'manual')),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_email_suppressions_email ON email_suppressions (email);

-- RLS policies
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admin read email_events"
  ON email_events FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin read email_suppressions"
  ON email_suppressions FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

-- Service role can insert (from webhooks)
CREATE POLICY "Service insert email_events"
  ON email_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service insert email_suppressions"
  ON email_suppressions FOR INSERT
  WITH CHECK (true);

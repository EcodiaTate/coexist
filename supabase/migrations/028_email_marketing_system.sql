-- ============================================================
--  028: Email Marketing System
--  Subscribers, tags, templates, campaigns, stats
-- ============================================================

-- ---- Subscriber tags ----
CREATE TABLE email_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  colour text NOT NULL DEFAULT '#6B7280',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can manage tags"
  ON email_tags FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- ---- Profile ↔ Tag junction ----
CREATE TABLE profile_tags (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES email_tags(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, tag_id)
);

ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can manage profile tags"
  ON profile_tags FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- ---- Email templates (saved in-app, not SendGrid templates) ----
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  thumbnail_url text,
  category text NOT NULL DEFAULT 'general',
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can manage templates"
  ON email_templates FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- ---- Campaigns ----
CREATE TABLE email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  -- Audience targeting
  target_all boolean NOT NULL DEFAULT false,
  target_tag_ids uuid[] DEFAULT '{}',
  target_collective_ids uuid[] DEFAULT '{}',
  -- Schedule
  scheduled_at timestamptz,
  sent_at timestamptz,
  -- Stats (denormalised for fast reads)
  total_recipients integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_opened integer NOT NULL DEFAULT 0,
  total_clicked integer NOT NULL DEFAULT 0,
  total_bounced integer NOT NULL DEFAULT 0,
  total_unsubscribed integer NOT NULL DEFAULT 0,
  -- Meta
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can manage campaigns"
  ON email_campaigns FOR ALL
  USING (is_admin_or_staff(auth.uid()));

CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_created ON email_campaigns(created_at DESC);

-- ---- Campaign recipients (per-user send log) ----
CREATE TABLE campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can view recipients"
  ON campaign_recipients FOR ALL
  USING (is_admin_or_staff(auth.uid()));

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_profile ON campaign_recipients(profile_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);

-- ---- Ensure marketing_opt_in exists on profiles ----
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT true;

-- ---- Ensure profiles has notification_preferences for later use ----
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}';

-- ---- Helper: count opted-in subscribers ----
CREATE OR REPLACE FUNCTION email_subscriber_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT count(*)::integer
  FROM profiles
  WHERE marketing_opt_in = true
    AND deleted_at IS NULL;
$$;

-- ---- Helper: resolve campaign audience ----
CREATE OR REPLACE FUNCTION resolve_campaign_audience(
  p_target_all boolean,
  p_tag_ids uuid[],
  p_collective_ids uuid[]
)
RETURNS TABLE(profile_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT p.id AS profile_id, u.email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.marketing_opt_in = true
    AND p.deleted_at IS NULL
    AND u.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM email_suppressions es WHERE es.email = u.email
    )
    AND (
      p_target_all = true
      OR p.id IN (
        SELECT pt.profile_id FROM profile_tags pt WHERE pt.tag_id = ANY(p_tag_ids)
      )
      OR p.id IN (
        SELECT cm.user_id FROM collective_members cm WHERE cm.collective_id = ANY(p_collective_ids)
      )
    );
$$;

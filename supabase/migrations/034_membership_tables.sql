-- Membership system tables: plans, rewards, and subscriptions
-- Supports configurable pricing (monthly/yearly) managed by admin

-- ── membership_plans ──
CREATE TABLE membership_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly  numeric(10,2) NOT NULL DEFAULT 0,
  stripe_product_id  text,          -- optional Stripe product link
  stripe_price_monthly text,        -- Stripe price ID for monthly
  stripe_price_yearly  text,        -- Stripe price ID for yearly
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ── membership_rewards ──
CREATE TABLE membership_rewards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text,
  partner_name      text,
  partner_logo_url  text,
  discount_code     text,
  discount_percent  numeric(5,2),
  category          text DEFAULT 'other',
  is_active         boolean DEFAULT true,
  plans             text[] DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

-- ── memberships (user subscriptions) ──
CREATE TABLE memberships (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id                 uuid NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  stripe_subscription_id  text UNIQUE,
  stripe_customer_id      text,
  interval                text NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'yearly')),
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  created_at              timestamptz DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX idx_membership_plans_active ON membership_plans (is_active, sort_order);
CREATE INDEX idx_membership_rewards_active ON membership_rewards (is_active, category);
CREATE INDEX idx_memberships_user ON memberships (user_id, status);
CREATE INDEX idx_memberships_stripe ON memberships (stripe_subscription_id);

-- ── RLS ──
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Plans: anyone authenticated can read active plans
CREATE POLICY "membership_plans_select"
  ON membership_plans FOR SELECT TO authenticated
  USING (true);

-- Plans: admin can manage
CREATE POLICY "membership_plans_manage_admin"
  ON membership_plans FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('national_admin', 'super_admin'))
  );

-- Staff can also manage plans (permissions is a JSONB column)
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

-- Rewards: anyone authenticated can read active rewards
CREATE POLICY "membership_rewards_select"
  ON membership_rewards FOR SELECT TO authenticated
  USING (true);

-- Rewards: admin can manage
CREATE POLICY "membership_rewards_manage_admin"
  ON membership_rewards FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('national_admin', 'super_admin'))
  );

-- Memberships: users can read their own
CREATE POLICY "memberships_select_own"
  ON memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Memberships: service role inserts/updates (via Edge Functions)
-- Admin can read all memberships
CREATE POLICY "memberships_select_admin"
  ON memberships FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('national_admin', 'super_admin'))
  );

-- Service role bypass for Edge Functions (insert/update from webhooks)
CREATE POLICY "memberships_service_insert"
  ON memberships FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "memberships_service_update"
  ON memberships FOR UPDATE TO service_role
  USING (true);

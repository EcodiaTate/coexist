-- 012: Schema fixes to match admin UI requirements
-- Fixes: partner_offers columns, challenges status, feature_flags.value,
--         surveys event_id nullable, surveys columns, missing tables/columns

-- ---- Recreate admin_list_users with SET search_path for PostgREST ----
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
    (role_filter = 'all' OR p.role::text = role_filter)
    AND (
      search_term = ''
      OR p.display_name ILIKE '%' || search_term || '%'
      OR u.email ILIKE '%' || search_term || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- ---- partner_offers: add missing columns ----
ALTER TABLE partner_offers ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE partner_offers ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL;
ALTER TABLE partner_offers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE partner_offers ADD COLUMN IF NOT EXISTS terms_and_conditions text;

-- Backfill: use partner_name as title for existing rows
UPDATE partner_offers SET title = partner_name WHERE title IS NULL;

-- Create index for the FK
CREATE INDEX IF NOT EXISTS idx_partner_offers_org ON partner_offers (organisation_id);

-- ---- challenges: add status column ----
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'ended', 'draft'));

-- Backfill: convert is_active to status
UPDATE challenges SET status = CASE WHEN is_active THEN 'active' ELSE 'ended' END WHERE status IS NULL;

-- ---- feature_flags: add value and created_at columns ----
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS value text;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ---- surveys: make event_id and created_by nullable for global surveys ----
ALTER TABLE surveys ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE surveys ALTER COLUMN created_by DROP NOT NULL;

-- Add columns the admin page uses
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS auto_send_after_event boolean DEFAULT false;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft'));

-- ---- shipping_config: key-value store for merch shipping settings ----
CREATE TABLE IF NOT EXISTS shipping_config (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

-- Seed defaults
INSERT INTO shipping_config (key, value) VALUES
  ('flat_rate_cents', '995'),
  ('free_shipping_threshold_cents', '7500')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE shipping_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_config_select"
  ON shipping_config FOR SELECT
  USING (true);

CREATE POLICY "shipping_config_admin_update"
  ON shipping_config FOR UPDATE
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "shipping_config_admin_insert"
  ON shipping_config FOR INSERT
  WITH CHECK (is_admin_or_staff(auth.uid()));

-- ---- merch_products: add missing columns for admin UI ----
ALTER TABLE merch_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE merch_products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE merch_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived'));
ALTER TABLE merch_products ADD COLUMN IF NOT EXISTS base_price_cents integer;

-- Backfill: convert price (numeric dollars) to base_price_cents
UPDATE merch_products SET base_price_cents = (price * 100)::integer WHERE base_price_cents IS NULL AND price IS NOT NULL;

-- Backfill: generate slug from name
UPDATE merch_products SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_merch_products_slug ON merch_products (slug);

-- ---- merch_orders: add structured shipping and cents columns ----
ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS total_cents integer;
ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS gst_cents integer DEFAULT 0;
ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS shipping_name text;
ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS shipping_city text;
ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS shipping_state text;
ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS shipping_postcode text;

-- Backfill total_cents from total (numeric dollars)
UPDATE merch_orders SET total_cents = (total * 100)::integer WHERE total_cents IS NULL AND total IS NOT NULL;

-- Backfill shipping fields from jsonb shipping_address
UPDATE merch_orders SET
  shipping_name = shipping_address->>'name',
  shipping_city = shipping_address->>'city',
  shipping_state = shipping_address->>'state',
  shipping_postcode = shipping_address->>'postcode'
WHERE shipping_name IS NULL AND shipping_address IS NOT NULL AND shipping_address != '{}'::jsonb;

-- ---- donations: add missing columns for exports ----
ALTER TABLE donations ADD COLUMN IF NOT EXISTS amount_cents integer;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_name text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_email text;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_number text;

-- Backfill amount_cents from amount (numeric dollars)
UPDATE donations SET amount_cents = (amount * 100)::integer WHERE amount_cents IS NULL AND amount IS NOT NULL;

-- ---- payments: create table for reconciliation export ----
CREATE TABLE IF NOT EXISTS payments (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_payment_id text,
  amount_cents      integer NOT NULL,
  status            text NOT NULL DEFAULT 'succeeded',
  type              text NOT NULL DEFAULT 'one_time' CHECK (type IN ('one_time', 'recurring', 'merch')),
  user_id           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  donation_id       uuid REFERENCES donations(id) ON DELETE SET NULL,
  order_id          uuid REFERENCES merch_orders(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_admin_select"
  ON payments FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "payments_service_insert"
  ON payments FOR INSERT
  WITH CHECK (true);

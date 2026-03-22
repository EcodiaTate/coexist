-- ============================================================
-- Migration: Cart stock reservations
-- Temporarily reserves stock when items are added to cart,
-- preventing overselling of limited inventory.
-- ============================================================

-- Table: holds temporary stock reservations per user/variant
CREATE TABLE IF NOT EXISTS cart_reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES merch_products(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  quantity    integer NOT NULL CHECK (quantity > 0),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  -- One reservation per user per variant
  UNIQUE (user_id, variant_key)
);

ALTER TABLE cart_reservations ENABLE ROW LEVEL SECURITY;

-- Users can see and manage their own reservations
CREATE POLICY "cart_reservations_select_own"
  ON cart_reservations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cart_reservations_insert_own"
  ON cart_reservations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cart_reservations_update_own"
  ON cart_reservations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cart_reservations_delete_own"
  ON cart_reservations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admins can see all (for debugging)
CREATE POLICY "cart_reservations_admin_select"
  ON cart_reservations FOR SELECT TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- Indexes
CREATE INDEX idx_cart_reservations_user ON cart_reservations(user_id);
CREATE INDEX idx_cart_reservations_variant ON cart_reservations(variant_key);
CREATE INDEX idx_cart_reservations_expires ON cart_reservations(expires_at);

-- Enable realtime on merch_inventory so clients get live stock updates
ALTER PUBLICATION supabase_realtime ADD TABLE merch_inventory;

-- Enable realtime on cart_reservations so clients see reservation changes
ALTER PUBLICATION supabase_realtime ADD TABLE cart_reservations;

-- ============================================================
-- RPC: Reserve stock for a cart item
-- Atomically checks available stock (total - active reservations)
-- and creates/updates a reservation. Returns the reservation or
-- raises an error if insufficient stock.
-- ============================================================
CREATE OR REPLACE FUNCTION reserve_stock(
  p_user_id     uuid,
  p_product_id  uuid,
  p_variant_key text,
  p_quantity    integer,
  p_duration_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock   integer;
  v_reserved      integer;
  v_own_reserved  integer;
  v_available     integer;
  v_expires_at    timestamptz;
  v_result        jsonb;
BEGIN
  -- Lock the inventory row to prevent concurrent reservation races
  SELECT stock_count INTO v_total_stock
  FROM merch_inventory
  WHERE product_id = p_product_id AND variant_key = p_variant_key
  FOR UPDATE;

  IF v_total_stock IS NULL THEN
    RAISE EXCEPTION 'Variant not found in inventory';
  END IF;

  -- Count all active reservations for this variant (excluding this user's existing one)
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
  FROM cart_reservations
  WHERE variant_key = p_variant_key
    AND product_id = p_product_id
    AND user_id != p_user_id
    AND expires_at > now();

  -- Get user's current reservation quantity (if any) — they're replacing it
  SELECT COALESCE(quantity, 0) INTO v_own_reserved
  FROM cart_reservations
  WHERE user_id = p_user_id AND variant_key = p_variant_key;

  v_available := v_total_stock - v_reserved;

  IF p_quantity > v_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_stock',
      'available', v_available,
      'requested', p_quantity
    );
  END IF;

  v_expires_at := now() + (p_duration_minutes || ' minutes')::interval;

  -- Upsert the reservation
  INSERT INTO cart_reservations (user_id, product_id, variant_key, quantity, expires_at, updated_at)
  VALUES (p_user_id, p_product_id, p_variant_key, p_quantity, v_expires_at, now())
  ON CONFLICT (user_id, variant_key) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    expires_at = EXCLUDED.expires_at,
    product_id = EXCLUDED.product_id,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', v_expires_at,
    'available', v_available - p_quantity,
    'reserved', p_quantity
  );
END;
$$;

-- ============================================================
-- RPC: Release a reservation (user removes item from cart)
-- ============================================================
CREATE OR REPLACE FUNCTION release_reservation(
  p_user_id     uuid,
  p_variant_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM cart_reservations
  WHERE user_id = p_user_id AND variant_key = p_variant_key;
END;
$$;

-- ============================================================
-- RPC: Release all reservations for a user (after checkout)
-- ============================================================
CREATE OR REPLACE FUNCTION release_all_reservations(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM cart_reservations WHERE user_id = p_user_id;
END;
$$;

-- ============================================================
-- RPC: Clean up expired reservations (called periodically)
-- Returns count of cleaned rows for observability.
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM cart_reservations WHERE expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- RPC: Get available stock for a variant (total - active reservations)
-- Optionally excludes a specific user's reservations (so they
-- see stock available TO THEM).
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_stock(
  p_product_id  uuid,
  p_variant_key text,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock integer;
  v_reserved    integer;
BEGIN
  SELECT stock_count INTO v_total_stock
  FROM merch_inventory
  WHERE product_id = p_product_id AND variant_key = p_variant_key;

  IF v_total_stock IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
  FROM cart_reservations
  WHERE variant_key = p_variant_key
    AND product_id = p_product_id
    AND expires_at > now()
    AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id);

  RETURN GREATEST(0, v_total_stock - v_reserved);
END;
$$;

-- ============================================================
-- RPC: Get available stock for ALL variants of a product
-- Returns a JSON array of {variant_key, total_stock, reserved, available}
-- ============================================================
CREATE OR REPLACE FUNCTION get_product_available_stock(
  p_product_id      uuid,
  p_exclude_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(row_data) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'variant_key', i.variant_key,
      'total_stock', i.stock_count,
      'reserved', COALESCE(r.reserved_qty, 0),
      'available', GREATEST(0, i.stock_count - COALESCE(r.reserved_qty, 0))
    ) AS row_data
    FROM merch_inventory i
    LEFT JOIN (
      SELECT variant_key, SUM(quantity) AS reserved_qty
      FROM cart_reservations
      WHERE product_id = p_product_id
        AND expires_at > now()
        AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id)
      GROUP BY variant_key
    ) r ON r.variant_key = i.variant_key
    WHERE i.product_id = p_product_id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- Scheduled cleanup: pg_cron job to purge expired reservations
-- every 2 minutes. If pg_cron is not available, the frontend
-- cleanup_expired_reservations() RPC can be called instead.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-expired-cart-reservations',
      '*/2 * * * *',
      'SELECT cleanup_expired_reservations()'
    );
  END IF;
END;
$$;

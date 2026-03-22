-- Unified stock adjustment that updates BOTH merch_inventory AND
-- the JSONB variants array in merch_products atomically.
-- This replaces the need to call increment_stock/decrement_stock
-- separately and then manually sync.

CREATE OR REPLACE FUNCTION adjust_variant_stock(
  p_product_id uuid,
  p_variant_key text,
  p_adjustment integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_stock integer;
BEGIN
  -- 1. Upsert into merch_inventory
  INSERT INTO merch_inventory (product_id, variant_key, stock_count, updated_at)
  VALUES (p_product_id, p_variant_key, GREATEST(0, p_adjustment), now())
  ON CONFLICT (product_id, variant_key) DO UPDATE
  SET
    stock_count = GREATEST(0, merch_inventory.stock_count + p_adjustment),
    updated_at = now();

  -- 2. Read the new stock value
  SELECT stock_count INTO v_new_stock
  FROM merch_inventory
  WHERE product_id = p_product_id AND variant_key = p_variant_key;

  -- 3. Update the JSONB variants array in merch_products
  UPDATE merch_products
  SET
    variants = (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'id' = p_variant_key OR elem->>'sku' = p_variant_key
          THEN jsonb_set(elem, '{stock}', to_jsonb(v_new_stock))
          ELSE elem
        END
      )
      FROM jsonb_array_elements(variants) AS elem
    ),
    updated_at = now()
  WHERE id = p_product_id;
END;
$$;

-- Ensure variant creation also creates merch_inventory rows.
-- Called after batch-setting variants to sync inventory rows.
CREATE OR REPLACE FUNCTION sync_variant_inventory(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert inventory rows for any variants that don't have one yet.
  -- Uses the variant id as the variant_key, and seeds stock from
  -- the JSONB stock field.
  INSERT INTO merch_inventory (product_id, variant_key, stock_count, low_stock_threshold, updated_at)
  SELECT
    p_product_id,
    elem->>'id',
    COALESCE((elem->>'stock')::integer, 0),
    COALESCE((elem->>'low_stock_threshold')::integer, 5),
    now()
  FROM merch_products, jsonb_array_elements(variants) AS elem
  WHERE merch_products.id = p_product_id
  ON CONFLICT (product_id, variant_key) DO UPDATE
  SET
    low_stock_threshold = EXCLUDED.low_stock_threshold,
    updated_at = now();

  -- Clean up inventory rows for variants that no longer exist
  DELETE FROM merch_inventory
  WHERE product_id = p_product_id
    AND variant_key NOT IN (
      SELECT elem->>'id'
      FROM merch_products, jsonb_array_elements(variants) AS elem
      WHERE merch_products.id = p_product_id
    );
END;
$$;

-- =============================================================================
-- Event Ticketing System
-- Adds paid ticket support to events via Stripe Checkout
-- =============================================================================

-- 1. Add ticketing flag to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_ticketed boolean DEFAULT false;

-- 2. Ticket types (tiers) per event
CREATE TABLE event_ticket_types (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            text NOT NULL,              -- e.g. "Early Bird", "General", "Member"
  description     text,
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  capacity        integer,                    -- NULL = unlimited
  sale_start      timestamptz,                -- NULL = immediately on publish
  sale_end        timestamptz,                -- NULL = until event starts
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_ticket_types_event ON event_ticket_types(event_id);

-- 3. Purchased tickets (booking records)
CREATE TABLE event_tickets (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id                    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id              uuid NOT NULL REFERENCES event_ticket_types(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                      text NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'checked_in')),
  price_cents                 integer NOT NULL,
  quantity                    integer NOT NULL DEFAULT 1,
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  ticket_code                 text UNIQUE,    -- short alphanumeric for QR
  checked_in_at               timestamptz,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX idx_tickets_event ON event_tickets(event_id);
CREATE INDEX idx_tickets_user ON event_tickets(user_id);
CREATE INDEX idx_tickets_status ON event_tickets(event_id, status);
CREATE UNIQUE INDEX idx_tickets_stripe_session ON event_tickets(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- 4. Generate short ticket codes
CREATE OR REPLACE FUNCTION generate_ticket_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Atomic ticket capacity check + purchase RPC
CREATE OR REPLACE FUNCTION reserve_event_ticket(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_user_id uuid,
  p_quantity integer DEFAULT 1,
  p_stripe_session_id text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_ticket_type event_ticket_types;
  v_sold integer;
  v_ticket_id uuid;
  v_code text;
  v_attempts integer := 0;
BEGIN
  -- Lock the ticket type row
  SELECT * INTO v_ticket_type
  FROM event_ticket_types
  WHERE id = p_ticket_type_id AND event_id = p_event_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket type not found or inactive';
  END IF;

  -- Check sale window
  IF v_ticket_type.sale_start IS NOT NULL AND now() < v_ticket_type.sale_start THEN
    RAISE EXCEPTION 'Tickets not on sale yet';
  END IF;
  IF v_ticket_type.sale_end IS NOT NULL AND now() > v_ticket_type.sale_end THEN
    RAISE EXCEPTION 'Ticket sales have ended';
  END IF;

  -- Check capacity (count confirmed + pending, not cancelled/refunded)
  IF v_ticket_type.capacity IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_sold
    FROM event_tickets
    WHERE ticket_type_id = p_ticket_type_id
      AND status IN ('pending', 'confirmed', 'checked_in');

    IF v_sold + p_quantity > v_ticket_type.capacity THEN
      RAISE EXCEPTION 'Sold out — only % tickets remaining', v_ticket_type.capacity - v_sold;
    END IF;
  END IF;

  -- Generate unique ticket code
  LOOP
    v_code := generate_ticket_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM event_tickets WHERE ticket_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique ticket code';
    END IF;
  END LOOP;

  -- Insert ticket
  INSERT INTO event_tickets (
    event_id, ticket_type_id, user_id, status, price_cents, quantity,
    stripe_checkout_session_id, ticket_code
  ) VALUES (
    p_event_id, p_ticket_type_id, p_user_id, 'pending',
    v_ticket_type.price_cents * p_quantity, p_quantity,
    p_stripe_session_id, v_code
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- 6. PostGIS distance filter for event discovery
CREATE OR REPLACE FUNCTION get_events_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 500,
  p_limit integer DEFAULT 20
) RETURNS SETOF events AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM events e
  WHERE e.status = 'published'
    AND e.is_public = true
    AND e.date_start >= now()
    AND e.location_point IS NOT NULL
    AND ST_DWithin(
      e.location_point,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000  -- metres
    )
  ORDER BY e.date_start ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. RLS policies
ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

-- Ticket types: anyone authenticated can read (needed to show prices)
CREATE POLICY "ticket_types_select" ON event_ticket_types
  FOR SELECT TO authenticated USING (true);

-- Ticket types: admins and event creators can manage
CREATE POLICY "ticket_types_manage" ON event_ticket_types
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
        AND (e.created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'national_leader')
        ))
    )
  );

-- Tickets: users can read their own
CREATE POLICY "tickets_select_own" ON event_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Tickets: admins can read all
CREATE POLICY "tickets_select_admin" ON event_tickets
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'national_leader'))
  );

-- Tickets: service role handles inserts/updates via RPC and webhooks
-- (No direct insert policy for regular users — they go through the RPC)

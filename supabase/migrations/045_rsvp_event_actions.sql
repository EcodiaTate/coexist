-- ============================================================================
-- 045: RSVP Event Actions
-- "Going" registers for event, "Not Going" cancels, "Maybe" schedules reminder
-- ============================================================================

-- Table for "maybe" reminders - cron picks these up 3 days before event
CREATE TABLE IF NOT EXISTS event_maybe_reminders (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  remind_at  timestamptz NOT NULL,
  sent       boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_maybe_reminders_remind ON event_maybe_reminders(remind_at) WHERE NOT sent;
CREATE INDEX idx_maybe_reminders_event ON event_maybe_reminders(event_id);

ALTER TABLE event_maybe_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maybe_reminders_own"
  ON event_maybe_reminders FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "maybe_reminders_admin"
  ON event_maybe_reminders FOR ALL TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- RPC: Handle RSVP response from chat announcement
-- Handles "going" (register), "not_going" (cancel), "maybe" (schedule reminder)
CREATE OR REPLACE FUNCTION handle_announcement_rsvp(
  p_event_id uuid,
  p_response text
)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_existing record;
  v_result jsonb;
BEGIN
  -- Get event info
  SELECT id, title, date_start, capacity INTO v_event
  FROM events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check existing registration
  SELECT * INTO v_existing
  FROM event_registrations
  WHERE event_id = p_event_id AND user_id = auth.uid();

  IF p_response = 'going' THEN
    -- Register or re-register
    IF v_existing IS NULL THEN
      INSERT INTO event_registrations (event_id, user_id, status, registered_at)
      VALUES (p_event_id, auth.uid(), 'registered', now());
    ELSIF v_existing.status != 'registered' THEN
      UPDATE event_registrations
      SET status = 'registered', registered_at = now()
      WHERE event_id = p_event_id AND user_id = auth.uid();
    END IF;

    -- Remove any maybe reminder
    DELETE FROM event_maybe_reminders
    WHERE event_id = p_event_id AND user_id = auth.uid();

    v_result := jsonb_build_object(
      'action', 'registered',
      'event_title', v_event.title
    );

  ELSIF p_response = 'not_going' THEN
    -- Cancel registration if exists
    IF v_existing IS NOT NULL AND v_existing.status IN ('registered', 'invited', 'waitlisted') THEN
      UPDATE event_registrations
      SET status = 'cancelled'
      WHERE event_id = p_event_id AND user_id = auth.uid();
    END IF;

    -- Remove any maybe reminder
    DELETE FROM event_maybe_reminders
    WHERE event_id = p_event_id AND user_id = auth.uid();

    v_result := jsonb_build_object(
      'action', 'cancelled',
      'event_title', v_event.title
    );

  ELSIF p_response = 'maybe' THEN
    -- Schedule a reminder 3 days before the event (or immediately if <3 days away)
    INSERT INTO event_maybe_reminders (event_id, user_id, remind_at)
    VALUES (
      p_event_id,
      auth.uid(),
      GREATEST(v_event.date_start - INTERVAL '3 days', now() + INTERVAL '1 hour')
    )
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET remind_at = GREATEST(v_event.date_start - INTERVAL '3 days', now() + INTERVAL '1 hour'),
                  sent = false;

    v_result := jsonb_build_object(
      'action', 'maybe',
      'event_title', v_event.title,
      'remind_at', GREATEST(v_event.date_start - INTERVAL '3 days', now() + INTERVAL '1 hour')
    );

  ELSE
    RAISE EXCEPTION 'Invalid response: %', p_response;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job: send "maybe" reminders (runs hourly)
-- Sends push + in-app notification to users who said "maybe"
SELECT cron.schedule(
  'maybe-event-reminders',
  '0 * * * *',
  $$
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    mr.user_id,
    'event_reminder',
    'Still thinking about "' || e.title || '"?',
    'The event is coming up soon - time to decide! Tap to RSVP.',
    jsonb_build_object('event_id', mr.event_id)
  FROM event_maybe_reminders mr
  JOIN events e ON e.id = mr.event_id
  WHERE mr.remind_at <= now()
    AND NOT mr.sent
    AND e.status = 'published'
    AND e.date_start > now();

  UPDATE event_maybe_reminders
  SET sent = true
  WHERE remind_at <= now() AND NOT sent;
  $$
);

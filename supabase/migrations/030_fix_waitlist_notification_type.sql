-- Fix: waitlist promotion notification type mismatch
-- The trigger used 'waitlist_promoted' but the frontend NotificationType union
-- expects 'waitlist_promotion'. This caused deep-link routing to fall through
-- to the default '/' route instead of navigating to the event page.

CREATE OR REPLACE FUNCTION handle_registration_cancel()
RETURNS trigger AS $$
DECLARE
  next_waitlisted uuid;
BEGIN
  IF OLD.status = 'registered' AND NEW.status = 'cancelled' THEN
    SELECT id INTO next_waitlisted
    FROM event_registrations
    WHERE event_id = OLD.event_id AND status = 'waitlisted'
    ORDER BY registered_at ASC
    LIMIT 1;

    IF next_waitlisted IS NOT NULL THEN
      UPDATE event_registrations
      SET status = 'registered'
      WHERE id = next_waitlisted;

      -- Notify the promoted user (fixed type: 'waitlist_promotion' matches frontend)
      INSERT INTO notifications (user_id, type, title, body, data)
      SELECT user_id, 'waitlist_promotion',
        'You''re in!',
        'A spot opened up for an event you were waitlisted for.',
        jsonb_build_object('event_id', OLD.event_id)
      FROM event_registrations WHERE id = next_waitlisted;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix any existing notifications with the wrong type
UPDATE notifications
SET type = 'waitlist_promotion'
WHERE type = 'waitlist_promoted';

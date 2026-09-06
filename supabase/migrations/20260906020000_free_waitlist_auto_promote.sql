-- Free-event waitlist: seats recycle to the queue automatically.
--
-- WHY (Anthea Sheriff via Tate, 2026-09-06, Merri Mornings on the ground):
-- "is there a way to remove people who have registered but not showed up? We
-- have a lot of people on the waitlist but they can't sign in."
--
-- What was true when she asked (all probed live on tjutlbzekfouwsiaplbr):
--   * Merri Mornings 6208301f sat frozen (registrations_closed = true, the
--     2026-09-02 "keep the 149, nobody new" instruction) with 74 waitlisted.
--     An organiser lifted events.capacity to NULL at 2026-09-06 00:22Z trying
--     to let them in, and NOTHING promoted: no path re-evaluates the waitlist
--     when capacity rises or a freeze lifts. The freeze also has zero UI, so
--     the organiser could not see why their change did nothing.
--   * handle_registration_cancel DOES backfill one seat per cancellation, but
--     it is the only promoting path, it sends no email (in-app notification
--     only), and a seat freed any other way (row DELETE, attended->cancelled,
--     capacity raised, freeze lifted) strands the queue forever.
--
-- WHAT THIS ADDS (mirrors the ticketed drain's sweep design one-to-one; see
-- 20260905120000_event_waitlist.sql for why a sweep and not per-path hooks):
--   1. promote_free_event_waitlist(p_limit): FIFO-promotes waitlisted
--      registrations into free seats across all eligible events. The capacity
--      trigger stays the arbiter: each flip is re-read after the write and a
--      demotion stops that event's drain, so this function can never overshoot
--      even if its own arithmetic is wrong.
--   2. cron_free_waitlist_promote(): pg_cron entrypoint posting to the
--      free-waitlist-promote edge function every 5 minutes (emails ride with
--      the promotion there; the DB cannot send mail).
--   3. Queue priority in handle_event_registration: a NEW claim on a capped
--      event with a non-empty waitlist is demoted behind the queue even when a
--      seat is momentarily free, so a fresh signup cannot jump 23 people in
--      the window between a seat freeing and the sweep firing. A row being
--      promoted OUT of the waitlist (OLD.status = 'waitlisted') is exempt --
--      that IS the queue moving.
--
-- Unlike the ticketed drain there is NO 24h offer-hold: a free RSVP promotion
-- is a grant, not a purchase offer. The email is a notification, so the seat
-- stands even if Resend fails (promote-then-email, the opposite stamp order).
--
-- Applied direct to live per project convention.

-- ---------------------------------------------------------------------------
-- 1. Queue priority: freed seats belong to the waitlist, not the next click
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_event_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_capacity integer;
  v_is_ticketed  boolean;
  v_closed       boolean;
  v_collective   uuid;
  v_privileged   boolean;
  current_count  integer;
BEGIN
  -- Nothing that could enter the going set (GOING_REGISTRATION_STATUSES).
  IF NEW.status NOT IN ('registered', 'attended') THEN
    RETURN NEW;
  END IF;

  -- Already holds its seat. This is an edit of some other column (check-in
  -- time, a repair), not a new claim, so it must never be demoted. 'attended'
  -- is in the set because a checked-in member is already going: an un-check-in
  -- or a repair moving attended -> registered would otherwise be read as a
  -- fresh claim and waitlisted on a full or frozen event.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('registered', 'attended') THEN
    RETURN NEW;
  END IF;

  SELECT capacity, is_ticketed, registrations_closed, collective_id
    INTO event_capacity, v_is_ticketed, v_closed, v_collective
  FROM events WHERE id = NEW.event_id;

  -- Ticketed events: the ticket gate owns capacity. Never auto-waitlist here.
  -- The freeze sits AFTER this deliberately, so a ticket-derived registration
  -- can never be demoted away from the ticket that backs it.
  IF v_is_ticketed IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Registrations frozen. Nobody who is not already in the going set may enter
  -- it, by any status and any path, INDEPENDENT of the count, so a cancellation
  -- cannot reopen a seat and the promotion in handle_registration_cancel cannot
  -- land. Staff are exempt: a leader recording a door walk-in is physical
  -- ground truth and outranks a registration policy, and service_role /
  -- postgres keeps the manual-repair door open.
  IF v_closed IS TRUE THEN
    v_privileged := auth.role() IS NULL
                 OR auth.role() = 'service_role'
                 OR public.is_collective_leader_or_above(auth.uid(), v_collective)
                 OR public.is_admin_or_staff(auth.uid());
    IF NOT v_privileged THEN
      NEW.status := 'waitlisted';
      RETURN NEW;
    END IF;
    RETURN NEW;
  END IF;

  -- Only a row entering 'registered' consumes a seat against the numeric cap.
  -- A direct 'attended' write is a door walk-in and is deliberately ungated.
  IF NEW.status IS DISTINCT FROM 'registered' THEN
    RETURN NEW;
  END IF;

  IF event_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  -- Serialise seat claims for THIS event so two concurrent registrations
  -- cannot both read the same stale count and both take the last spot. An
  -- advisory transaction lock is used rather than SELECT ... FOR UPDATE on the
  -- events row so that an organiser editing the event does not block sign-ups.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 0));

  -- QUEUE PRIORITY (2026-09-06). On a capped event a freed seat belongs to the
  -- earliest waitlisted person, not to whoever clicks Register next. A fresh
  -- claim arriving while anyone is queued goes behind them; the sweep or the
  -- cancel-backfill then promotes strictly FIFO. The exemption is a row being
  -- promoted OUT of the waitlist (the sweep, the cancel-backfill, a leader's
  -- Promote, the day-of self-promote): that is the queue itself moving, and
  -- demoting it here would make promotion impossible.
  IF (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'waitlisted')
     AND EXISTS (
       SELECT 1 FROM event_registrations w
       WHERE w.event_id = NEW.event_id
         AND w.status = 'waitlisted'
         AND (TG_OP = 'INSERT' OR w.id <> NEW.id)
     )
  THEN
    NEW.status := 'waitlisted';
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM event_registrations
  WHERE event_id = NEW.event_id
    AND status IN ('registered', 'attended')   -- GOING_REGISTRATION_STATUSES
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF current_count >= event_capacity THEN
    NEW.status := 'waitlisted';
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. The promoter. FIFO, per-event advisory lock, trigger-arbitered flips.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_free_event_waitlist(p_limit integer DEFAULT 50)
RETURNS TABLE (
  out_event_id     uuid,
  out_user_id      uuid,
  out_display_name text,
  out_email        text,
  out_event_title  text,
  out_event_date   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event     record;
  v_row       record;
  v_landed    registration_status;
  v_promoted  integer := 0;
BEGIN
  FOR v_event IN
    SELECT e.id, e.title, e.date_start
    FROM events e
    WHERE e.is_ticketed IS NOT TRUE                    -- ticket gate owns those
      AND e.status = 'published'
      AND COALESCE(e.registrations_closed, false) = false  -- a frozen event does
          -- not drain. Load-bearing: this function runs privileged, so the
          -- freeze branch in handle_event_registration would NOT demote its
          -- flips; the filter is the only thing honouring the freeze here.
      -- Promote until the event ENDS, not until it starts: morning-of
      -- cancellations are the peak real-world moment a waitlisted person needs
      -- the seat (they are deciding whether to drive over), and day-of
      -- walk-up-from-waitlist is already sanctioned product behaviour. The 2h
      -- fallback mirrors generateIcsFile's default event length. Never promote
      -- after the event has ended: "you're in!" for a finished event is noise.
      AND COALESCE(e.date_end, e.date_start + interval '2 hours') > now()
      AND EXISTS (
        SELECT 1 FROM event_registrations r
        WHERE r.event_id = e.id AND r.status = 'waitlisted'
      )
    ORDER BY e.date_start ASC
  LOOP
    EXIT WHEN v_promoted >= p_limit;

    -- Same lock key as handle_event_registration, so a drain and a live claim
    -- on the same event serialise instead of racing.
    PERFORM pg_advisory_xact_lock(hashtextextended(v_event.id::text, 0));

    FOR v_row IN
      SELECT r.id, r.user_id
      FROM event_registrations r
      WHERE r.event_id = v_event.id AND r.status = 'waitlisted'
      -- FIFO on registered_at (when they joined the queue), NULLS LAST so a
      -- row that never got a stamp cannot starve everyone behind it, id as the
      -- deterministic tiebreak.
      ORDER BY r.registered_at ASC NULLS LAST, r.id ASC
    LOOP
      EXIT WHEN v_promoted >= p_limit;

      UPDATE event_registrations
      SET status = 'registered'
      WHERE id = v_row.id AND status = 'waitlisted';

      -- The trigger is the arbiter: re-read what actually landed. A demotion
      -- back to 'waitlisted' means the event is full again; stop draining it.
      -- The failed flip changed nothing (status and registered_at untouched),
      -- so the person keeps their exact queue position.
      SELECT status INTO v_landed FROM event_registrations WHERE id = v_row.id;
      IF v_landed IS DISTINCT FROM 'registered' THEN
        EXIT;
      END IF;

      -- Same in-app notification shape as handle_registration_cancel, so a
      -- promotion reads identically to the member whichever path granted it.
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        v_row.user_id, 'waitlist_promoted', 'You''re in!',
        'A spot opened up for an event you were waitlisted for.',
        jsonb_build_object('event_id', v_event.id)
      );

      v_promoted := v_promoted + 1;

      RETURN QUERY
      SELECT v_event.id, v_row.user_id,
             p.display_name, p.email,
             v_event.title, v_event.date_start
      FROM profiles p WHERE p.id = v_row.user_id;
    END LOOP;
  END LOOP;
END;
$function$;

-- Cron/edge entrypoint only. Matching the 2026-09-05 definer hardening: an
-- anon or member caller must not be able to fire promotions (or the emails
-- that ride on them) off-schedule.
REVOKE ALL ON FUNCTION public.promote_free_event_waitlist(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_free_event_waitlist(integer) FROM anon;
REVOKE ALL ON FUNCTION public.promote_free_event_waitlist(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_free_event_waitlist(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. pg_cron entrypoint -> edge function (emails live there, the DB can't send)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_free_waitlist_promote()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  edge_url text := 'https://tjutlbzekfouwsiaplbr.supabase.co/functions/v1/free-waitlist-promote';
  svc_key  text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1);
BEGIN
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || svc_key),
    body := '{}'::jsonb
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_free_waitlist_promote() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cron_free_waitlist_promote() FROM anon;
REVOKE ALL ON FUNCTION public.cron_free_waitlist_promote() FROM authenticated;

-- Job scheduled at apply time (idempotent):
--   SELECT cron.schedule('free-waitlist-promote', '*/5 * * * *',
--                        'SELECT public.cron_free_waitlist_promote()');

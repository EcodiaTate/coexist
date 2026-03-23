-- ============================================================================
-- 044: Collective Collaborations
-- Allows collectives to formally collaborate on events, giving staff from
-- invited collectives visibility and reference to shared events.
-- ============================================================================

-- Track formal collaboration relationships between collectives for events
CREATE TABLE collective_event_collaborators (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collective_id   uuid NOT NULL REFERENCES collectives(id) ON DELETE CASCADE,
  invited_by_collective_id uuid NOT NULL REFERENCES collectives(id) ON DELETE CASCADE,
  invited_by_user uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message         text,
  created_at      timestamptz DEFAULT now(),
  responded_at    timestamptz,
  UNIQUE (event_id, collective_id)
);

-- Indexes
CREATE INDEX idx_collab_event ON collective_event_collaborators(event_id);
CREATE INDEX idx_collab_collective ON collective_event_collaborators(collective_id);
CREATE INDEX idx_collab_invited_by ON collective_event_collaborators(invited_by_collective_id);
CREATE INDEX idx_collab_status ON collective_event_collaborators(status);

-- RLS
ALTER TABLE collective_event_collaborators ENABLE ROW LEVEL SECURITY;

-- Leaders of either collective (host or invited) can view collaborations
CREATE POLICY "collab_select_involved"
  ON collective_event_collaborators FOR SELECT TO authenticated
  USING (
    is_collective_member(auth.uid(), collective_id)
    OR is_collective_member(auth.uid(), invited_by_collective_id)
    OR is_admin_or_staff(auth.uid())
  );

-- Leaders of the host collective can create collaboration invites
CREATE POLICY "collab_insert_leader"
  ON collective_event_collaborators FOR INSERT TO authenticated
  WITH CHECK (
    is_collective_leader_or_above(auth.uid(), invited_by_collective_id)
    OR is_admin_or_staff(auth.uid())
  );

-- Leaders of the invited collective can accept/decline
CREATE POLICY "collab_update_invited_leader"
  ON collective_event_collaborators FOR UPDATE TO authenticated
  USING (
    is_collective_leader_or_above(auth.uid(), collective_id)
    OR is_admin_or_staff(auth.uid())
  );

-- Leaders of host collective can delete (withdraw invite)
CREATE POLICY "collab_delete_leader"
  ON collective_event_collaborators FOR DELETE TO authenticated
  USING (
    is_collective_leader_or_above(auth.uid(), invited_by_collective_id)
    OR is_admin_or_staff(auth.uid())
  );

-- RPC: Invite a collective to collaborate on an event
-- Creates collaboration record + event_invite + notifications to invited collective leaders
CREATE OR REPLACE FUNCTION invite_collective_to_collaborate(
  p_event_id uuid,
  p_collective_id uuid,
  p_host_collective_id uuid,
  p_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_collab_id uuid;
  v_event_title text;
  v_host_name text;
BEGIN
  -- Get event and host info
  SELECT title INTO v_event_title FROM events WHERE id = p_event_id;
  SELECT name INTO v_host_name FROM collectives WHERE id = p_host_collective_id;

  -- Create collaboration record
  INSERT INTO collective_event_collaborators (event_id, collective_id, invited_by_collective_id, invited_by_user, message)
  VALUES (p_event_id, p_collective_id, p_host_collective_id, auth.uid(), p_message)
  ON CONFLICT (event_id, collective_id) DO NOTHING
  RETURNING id INTO v_collab_id;

  -- Also create the event_invite record so members get visibility
  INSERT INTO event_invites (event_id, collective_id, invited_by, message)
  VALUES (p_event_id, p_collective_id, auth.uid(), p_message)
  ON CONFLICT (event_id, collective_id) DO NOTHING;

  -- Notify leaders of the invited collective
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT cm.user_id, 'event_invite',
    v_host_name || ' wants to collaborate!',
    'You''ve been invited to collaborate on "' || v_event_title || '"',
    jsonb_build_object('event_id', p_event_id, 'collective_id', p_collective_id, 'collaboration_id', v_collab_id)
  FROM collective_members cm
  WHERE cm.collective_id = p_collective_id
    AND cm.role IN ('leader', 'co_leader')
    AND cm.status = 'active';

  RETURN v_collab_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Accept or decline a collaboration invite
CREATE OR REPLACE FUNCTION respond_to_collaboration(
  p_collaboration_id uuid,
  p_accept boolean
)
RETURNS void AS $$
DECLARE
  v_collab record;
  v_event_title text;
  v_collective_name text;
BEGIN
  SELECT * INTO v_collab FROM collective_event_collaborators WHERE id = p_collaboration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaboration not found'; END IF;

  SELECT title INTO v_event_title FROM events WHERE id = v_collab.event_id;
  SELECT name INTO v_collective_name FROM collectives WHERE id = v_collab.collective_id;

  -- Update status
  UPDATE collective_event_collaborators
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
      responded_at = now()
  WHERE id = p_collaboration_id;

  IF p_accept THEN
    -- Register all active members of the invited collective for the event
    INSERT INTO event_registrations (event_id, user_id, status, invited_at)
    SELECT v_collab.event_id, cm.user_id, 'invited', now()
    FROM collective_members cm
    WHERE cm.collective_id = v_collab.collective_id AND cm.status = 'active'
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- Notify all members of the invited collective
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT cm.user_id, 'event_invite',
      'You''re invited to a collaborative event!',
      v_collective_name || ' is collaborating on "' || v_event_title || '"',
      jsonb_build_object('event_id', v_collab.event_id)
    FROM collective_members cm
    WHERE cm.collective_id = v_collab.collective_id AND cm.status = 'active';
  END IF;

  -- Notify the host collective leaders of the response
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT cm.user_id, 'general',
    v_collective_name || CASE WHEN p_accept THEN ' accepted' ELSE ' declined' END || ' the collaboration',
    'For event "' || v_event_title || '"',
    jsonb_build_object('event_id', v_collab.event_id, 'collaboration_id', p_collaboration_id)
  FROM collective_members cm
  WHERE cm.collective_id = v_collab.invited_by_collective_id
    AND cm.role IN ('leader', 'co_leader')
    AND cm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

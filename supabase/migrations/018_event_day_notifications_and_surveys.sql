-- ============================================================================
-- 018: Event Day Notifications Tracking + Post-Event Survey Templates
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tracking table for event-day push notifications (prevents duplicates)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_day_notifications_sent (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('starting_soon', 'happening_now', 'proximity_check_in')),
  sent_at           timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id, notification_type)
);

-- RLS: service role only (Edge Functions)
ALTER TABLE event_day_notifications_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON event_day_notifications_sent
  FOR ALL USING (false);

-- Index for quick lookups during notification sends
CREATE INDEX idx_event_day_notif_event ON event_day_notifications_sent (event_id, notification_type);

-- ---------------------------------------------------------------------------
-- 2. Post-event survey templates per activity type
--    These are auto-generated survey questions that vary based on the
--    event's activity_type. Leaders see these after marking an event complete.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS post_event_survey_templates (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type text NOT NULL,
  question_key  text NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('number', 'rating', 'free_text', 'yes_no', 'multiple_choice')),
  unit          text,
  options       jsonb,         -- for multiple_choice questions
  sort_order    integer NOT NULL DEFAULT 0,
  is_required   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (activity_type, question_key)
);

ALTER TABLE post_event_survey_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read templates
CREATE POLICY "Authenticated can read templates" ON post_event_survey_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 3. Post-event survey responses (per attendee, per event)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS post_event_survey_responses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers     jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE post_event_survey_responses ENABLE ROW LEVEL SECURITY;

-- Users can read and submit their own responses
CREATE POLICY "Users manage own responses" ON post_event_survey_responses
  FOR ALL USING (auth.uid() = user_id);

-- Leaders can read all responses for events in their collectives
CREATE POLICY "Leaders read event responses" ON post_event_survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN collective_members cm ON cm.collective_id = e.collective_id
      WHERE e.id = post_event_survey_responses.event_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('co_leader', 'leader')
        AND cm.status = 'active'
    )
  );

-- Index
CREATE INDEX idx_post_event_survey_event ON post_event_survey_responses (event_id);

-- ---------------------------------------------------------------------------
-- 4. Seed default survey templates per activity type
-- ---------------------------------------------------------------------------

INSERT INTO post_event_survey_templates (activity_type, question_key, question_text, question_type, unit, sort_order, is_required) VALUES
  -- Tree Planting
  ('tree_planting', 'trees_count',      'How many trees did you help plant?',              'number', 'trees',      1, true),
  ('tree_planting', 'experience',       'How would you rate the experience?',              'rating',  NULL,         2, true),
  ('tree_planting', 'learned_something','Did you learn something new about native plants?','yes_no',  NULL,         3, false),
  ('tree_planting', 'highlights',       'What was the highlight of the day?',              'free_text', NULL,       4, false),

  -- Beach Cleanup
  ('beach_cleanup', 'rubbish_estimate', 'Roughly how much rubbish did you personally collect?', 'multiple_choice', NULL, 1, true),
  ('beach_cleanup', 'worst_item',       'What was the worst item you found?',              'free_text', NULL,       2, false),
  ('beach_cleanup', 'experience',       'How would you rate the experience?',              'rating',  NULL,         3, true),
  ('beach_cleanup', 'return_interest',  'Would you come back for another cleanup?',        'yes_no',  NULL,         4, false),

  -- Habitat Restoration
  ('habitat_restoration', 'tasks_done', 'What tasks did you help with?',                   'free_text', NULL,       1, false),
  ('habitat_restoration', 'experience', 'How would you rate the experience?',              'rating',  NULL,         2, true),
  ('habitat_restoration', 'wildlife',   'Did you spot any wildlife?',                      'yes_no',  NULL,         3, false),
  ('habitat_restoration', 'highlights', 'What was the best part?',                         'free_text', NULL,       4, false),

  -- Nature Walk
  ('nature_walk', 'species_seen',       'Roughly how many different species did you spot?','number', 'species',    1, false),
  ('nature_walk', 'experience',         'How would you rate the walk?',                    'rating',  NULL,         2, true),
  ('nature_walk', 'favourite_sighting', 'What was your favourite sighting?',               'free_text', NULL,       3, false),
  ('nature_walk', 'difficulty',         'Was the walk difficulty appropriate?',             'yes_no',  NULL,         4, false),

  -- Wildlife Survey
  ('wildlife_survey', 'species_count',  'How many species did you record?',                'number', 'species',    1, true),
  ('wildlife_survey', 'experience',     'How would you rate the experience?',              'rating',  NULL,         2, true),
  ('wildlife_survey', 'rare_find',      'Did you find anything unexpected or rare?',       'free_text', NULL,       3, false),

  -- Seed Collecting
  ('seed_collecting', 'species_collected','How many species did you collect seeds from?',  'number', 'species',    1, true),
  ('seed_collecting', 'experience',      'How would you rate the experience?',             'rating',  NULL,         2, true),
  ('seed_collecting', 'learned',         'What did you learn about seed collecting?',      'free_text', NULL,       3, false),

  -- Weed Removal
  ('weed_removal', 'area_feeling',      'How much area do you think the group cleared?',   'multiple_choice', NULL, 1, false),
  ('weed_removal', 'experience',        'How would you rate the experience?',              'rating',  NULL,         2, true),
  ('weed_removal', 'hardest_weed',      'What was the toughest weed to deal with?',        'free_text', NULL,       3, false),

  -- Waterway Cleanup
  ('waterway_cleanup', 'rubbish_estimate','Roughly how much rubbish did you personally collect?', 'multiple_choice', NULL, 1, true),
  ('waterway_cleanup', 'experience',      'How would you rate the experience?',            'rating',  NULL,         2, true),
  ('waterway_cleanup', 'worst_item',      'What was the worst thing you found?',           'free_text', NULL,       3, false),
  ('waterway_cleanup', 'water_quality',   'Did the waterway look healthier after?',        'yes_no',  NULL,         4, false),

  -- Community Garden
  ('community_garden', 'tasks_done',    'What did you help with today?',                   'free_text', NULL,       1, false),
  ('community_garden', 'experience',    'How would you rate the experience?',              'rating',  NULL,         2, true),
  ('community_garden', 'takeaway',      'Did you take home any produce or knowledge?',     'yes_no',  NULL,         3, false),

  -- Other / Education
  ('education', 'experience',          'How would you rate the experience?',               'rating',  NULL,         1, true),
  ('education', 'learned',             'What was the most valuable thing you learned?',    'free_text', NULL,       2, false),
  ('other', 'experience',              'How would you rate the experience?',               'rating',  NULL,         1, true),
  ('other', 'feedback',                'Any feedback for the organisers?',                 'free_text', NULL,       2, false)
ON CONFLICT (activity_type, question_key) DO NOTHING;

-- Update multiple_choice options
UPDATE post_event_survey_templates
SET options = '["A small bag", "A few bags", "Half a wheelie bin", "A full wheelie bin or more"]'::jsonb
WHERE question_key = 'rubbish_estimate';

UPDATE post_event_survey_templates
SET options = '["A few square metres", "A decent patch", "A large area", "Hard to tell"]'::jsonb
WHERE question_key = 'area_feeling';

-- ---------------------------------------------------------------------------
-- 5. pg_cron job for event-day notifications (every 15 minutes)
-- ---------------------------------------------------------------------------

-- NOTE: Run this manually in the Supabase SQL editor if pg_cron is available:
-- SELECT cron.schedule(
--   'event-day-notify',
--   '*/15 * * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/event-day-notify',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
--     body := '{}'::jsonb
--   );$$
-- );

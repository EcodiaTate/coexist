-- Migration: Replace activity_type enum with 9 canonical event types
--
-- Old types → new mapping:
--   beach_cleanup       → shore_cleanup
--   tree_planting       → tree_planting       (kept)
--   habitat_restoration → land_regeneration
--   nature_walk         → nature_walk          (kept)
--   education           → workshop
--   wildlife_survey     → nature_walk
--   seed_collecting     → tree_planting
--   weed_removal        → land_regeneration
--   waterway_cleanup    → shore_cleanup
--   community_garden    → land_regeneration
--   other               → workshop
--
-- New types added: shore_cleanup, land_regeneration, camp_out, retreat,
--                  film_screening, marine_restoration, workshop

-- Step 1: Create the new enum type
CREATE TYPE activity_type_new AS ENUM (
  'shore_cleanup',
  'tree_planting',
  'land_regeneration',
  'nature_walk',
  'camp_out',
  'retreat',
  'film_screening',
  'marine_restoration',
  'workshop'
);

-- Step 2: Swap the events.activity_type column, mapping old → new inline
ALTER TABLE events
  ALTER COLUMN activity_type TYPE activity_type_new
  USING (
    CASE activity_type::text
      WHEN 'beach_cleanup'       THEN 'shore_cleanup'
      WHEN 'habitat_restoration' THEN 'land_regeneration'
      WHEN 'weed_removal'        THEN 'land_regeneration'
      WHEN 'community_garden'    THEN 'land_regeneration'
      WHEN 'waterway_cleanup'    THEN 'shore_cleanup'
      WHEN 'education'           THEN 'workshop'
      WHEN 'seed_collecting'     THEN 'tree_planting'
      WHEN 'wildlife_survey'     THEN 'nature_walk'
      WHEN 'other'               THEN 'workshop'
      ELSE activity_type::text
    END
  )::activity_type_new;

-- Step 2b: Also swap timeline_rules.activity_type_filter (same enum)
ALTER TABLE timeline_rules
  ALTER COLUMN activity_type_filter TYPE activity_type_new
  USING (
    CASE activity_type_filter::text
      WHEN 'beach_cleanup'       THEN 'shore_cleanup'
      WHEN 'habitat_restoration' THEN 'land_regeneration'
      WHEN 'weed_removal'        THEN 'land_regeneration'
      WHEN 'community_garden'    THEN 'land_regeneration'
      WHEN 'waterway_cleanup'    THEN 'shore_cleanup'
      WHEN 'education'           THEN 'workshop'
      WHEN 'seed_collecting'     THEN 'tree_planting'
      WHEN 'wildlife_survey'     THEN 'nature_walk'
      WHEN 'other'               THEN 'workshop'
      ELSE activity_type_filter::text
    END
  )::activity_type_new;

-- Step 3: Drop old enum, rename new one
DROP TYPE activity_type;
ALTER TYPE activity_type_new RENAME TO activity_type;

-- Step 4: Migrate profile interests arrays
UPDATE profiles SET interests = array_replace(interests, 'beach_cleanup', 'shore_cleanup');
UPDATE profiles SET interests = array_replace(interests, 'habitat_restoration', 'land_regeneration');
UPDATE profiles SET interests = array_replace(interests, 'weed_removal', 'land_regeneration');
UPDATE profiles SET interests = array_replace(interests, 'community_garden', 'land_regeneration');
UPDATE profiles SET interests = array_replace(interests, 'waterway_cleanup', 'shore_cleanup');
UPDATE profiles SET interests = array_replace(interests, 'education', 'workshop');
UPDATE profiles SET interests = array_replace(interests, 'seed_collecting', 'tree_planting');
UPDATE profiles SET interests = array_replace(interests, 'wildlife_survey', 'nature_walk');
UPDATE profiles SET interests = array_replace(interests, 'other', 'workshop');

-- Note: timeline_rules.activity_type_filter was already migrated in Step 2b

-- ============================================================================
-- Co-Exist App - Seed Data
-- Run after migration: psql -f supabase/seed.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2. Sample Collectives
-- ---------------------------------------------------------------------------

INSERT INTO collectives (id, name, slug, description, region, state, member_count, is_active, location_point) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Byron Bay Collective', 'byron-bay', 'Conservation crew protecting the beautiful Byron Bay coastline and hinterland.', 'Byron Bay', 'NSW', 420, true, ST_SetSRID(ST_MakePoint(153.6150, -28.6474), 4326)),
  ('c0000000-0000-0000-0000-000000000002', 'Sydney Collective', 'sydney', 'Urban conservation in and around Sydney - harbour cleanups, bush regen, and more.', 'Sydney', 'NSW', 850, true, ST_SetSRID(ST_MakePoint(151.2093, -33.8688), 4326)),
  ('c0000000-0000-0000-0000-000000000003', 'Melbourne Collective', 'melbourne', 'Melbourne''s crew for creek restoration, tree planting, and coastal cleanups.', 'Melbourne', 'VIC', 720, true, ST_SetSRID(ST_MakePoint(144.9631, -37.8136), 4326)),
  ('c0000000-0000-0000-0000-000000000004', 'Gold Coast Collective', 'gold-coast', 'Protecting the Gold Coast''s beaches, dunes, and green spaces.', 'Gold Coast', 'QLD', 380, true, ST_SetSRID(ST_MakePoint(153.4000, -28.0167), 4326)),
  ('c0000000-0000-0000-0000-000000000005', 'Sunshine Coast Collective', 'sunshine-coast', 'Hinterland revegetation and coastal care on the Sunshine Coast.', 'Sunshine Coast', 'QLD', 310, true, ST_SetSRID(ST_MakePoint(153.0667, -26.6500), 4326)),
  ('c0000000-0000-0000-0000-000000000006', 'Brisbane Collective', 'brisbane', 'River cleanups, urban greening, and habitat restoration across Brisbane.', 'Brisbane', 'QLD', 540, true, ST_SetSRID(ST_MakePoint(153.0251, -27.4698), 4326)),
  ('c0000000-0000-0000-0000-000000000007', 'Adelaide Collective', 'adelaide', 'Caring for South Australia''s unique landscapes and coastline.', 'Adelaide', 'SA', 280, true, ST_SetSRID(ST_MakePoint(138.6007, -34.9285), 4326)),
  ('c0000000-0000-0000-0000-000000000008', 'Perth Collective', 'perth', 'Western Australia''s conservation community - bushland, wetlands, and coast.', 'Perth', 'WA', 350, true, ST_SetSRID(ST_MakePoint(115.8605, -31.9505), 4326)),
  ('c0000000-0000-0000-0000-000000000009', 'Hobart Collective', 'hobart', 'Tasmania''s conservation crew - old growth, wildlife, and waterways.', 'Hobart', 'TAS', 190, true, ST_SetSRID(ST_MakePoint(147.3272, -42.8821), 4326)),
  ('c0000000-0000-0000-0000-000000000010', 'Cairns Collective', 'cairns', 'Tropical conservation in Far North Queensland - reef-adjacent restoration.', 'Cairns', 'QLD', 260, true, ST_SetSRID(ST_MakePoint(145.7781, -16.9186), 4326)),
  ('c0000000-0000-0000-0000-000000000011', 'Newcastle Collective', 'newcastle', 'Hunter Valley and coastal conservation in Newcastle and surrounds.', 'Newcastle', 'NSW', 220, true, ST_SetSRID(ST_MakePoint(151.7817, -32.9283), 4326)),
  ('c0000000-0000-0000-0000-000000000012', 'Wollongong Collective', 'wollongong', 'Illawarra escarpment and coastline conservation.', 'Wollongong', 'NSW', 180, true, ST_SetSRID(ST_MakePoint(150.8931, -34.4278), 4326)),
  ('c0000000-0000-0000-0000-000000000013', 'Canberra Collective', 'canberra', 'Bush capital conservation - woodland restoration and waterway care.', 'Canberra', 'ACT', 200, true, ST_SetSRID(ST_MakePoint(149.1300, -35.2809), 4326))
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2b. Seed User (needed as created_by FK for events)
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'seed@coexist.local',
  crypt('seed-password-not-real', gen_salt('bf')),
  now(), now(), now(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, display_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Seed Admin',
  'super_admin'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Sample Events (across collectives, various activity types)
-- ---------------------------------------------------------------------------

INSERT INTO events (id, collective_id, created_by, title, description, activity_type, date_start, date_end, capacity, address, is_public, status, location_point) VALUES
  -- Byron Bay events
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Main Beach Cleanup', 'Monthly cleanup of Main Beach - bring sunscreen and a reusable water bottle!',
   'beach_cleanup', '2026-04-05 08:00:00+10', '2026-04-05 11:00:00+10', 40,
   'Main Beach, Byron Bay NSW 2481', true, 'published', ST_SetSRID(ST_MakePoint(153.6190, -28.6430), 4326)),

  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Hinterland Tree Planting', 'Revegetation day in the Byron hinterland - 500 native seedlings ready to go.',
   'tree_planting', '2026-04-12 07:30:00+10', '2026-04-12 12:00:00+10', 30,
   'Broken Head Nature Reserve, Byron Bay NSW', true, 'published', ST_SetSRID(ST_MakePoint(153.6000, -28.6800), 4326)),

  -- Sydney events
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Harbour Foreshore Cleanup', 'Join us for a cleanup along the Sydney Harbour foreshore.',
   'beach_cleanup', '2026-04-06 09:00:00+10', '2026-04-06 12:00:00+10', 60,
   'Barangaroo Reserve, Sydney NSW 2000', true, 'published', ST_SetSRID(ST_MakePoint(151.2015, -33.8600), 4326)),

  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Lane Cove Bush Regen', 'Habitat restoration and weed removal in Lane Cove National Park.',
   'habitat_restoration', '2026-04-19 08:00:00+10', '2026-04-19 13:00:00+10', 25,
   'Lane Cove National Park, Sydney NSW', true, 'published', ST_SetSRID(ST_MakePoint(151.1500, -33.7900), 4326)),

  -- Melbourne events
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Merri Creek Planting Day', 'Autumn planting along Merri Creek - indigenous grasses and shrubs.',
   'tree_planting', '2026-04-13 09:00:00+10', '2026-04-13 13:00:00+10', 50,
   'Merri Creek Trail, Northcote VIC', true, 'published', ST_SetSRID(ST_MakePoint(145.0000, -37.7700), 4326)),

  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'St Kilda Beach Cleanup', 'Coastal cleanup at St Kilda Beach - buckets and gloves provided.',
   'beach_cleanup', '2026-04-20 08:00:00+10', '2026-04-20 11:00:00+10', 45,
   'St Kilda Beach, Melbourne VIC', true, 'published', ST_SetSRID(ST_MakePoint(144.9742, -37.8679), 4326)),

  -- Gold Coast events
  ('e0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Currumbin Wildlife Survey', 'Citizen science - bird and wildlife survey along Currumbin Creek.',
   'wildlife_survey', '2026-04-07 06:30:00+10', '2026-04-07 09:30:00+10', 20,
   'Currumbin Creek, Gold Coast QLD', true, 'published', ST_SetSRID(ST_MakePoint(153.4800, -28.1300), 4326)),

  -- Brisbane events
  ('e0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'Brisbane River Cleanup', 'Kayak-based river cleanup - we provide kayaks! BYO enthusiasm.',
   'waterway_cleanup', '2026-04-14 07:00:00+10', '2026-04-14 11:00:00+10', 20,
   'Kangaroo Point, Brisbane QLD', true, 'published', ST_SetSRID(ST_MakePoint(153.0350, -27.4750), 4326)),

  -- Adelaide
  ('e0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'Botanic Garden Weed Blitz', 'Help the crew remove invasive weeds in the Adelaide Botanic Garden.',
   'weed_removal', '2026-04-21 09:00:00+09:30', '2026-04-21 12:00:00+09:30', 30,
   'Adelaide Botanic Garden, Adelaide SA', true, 'published', ST_SetSRID(ST_MakePoint(138.6100, -34.9180), 4326)),

  -- Perth
  ('e0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'Kings Park Seed Collecting', 'Autumn seed collection for native species propagation.',
   'seed_collecting', '2026-04-22 08:00:00+08', '2026-04-22 11:00:00+08', 15,
   'Kings Park, Perth WA', true, 'published', ST_SetSRID(ST_MakePoint(115.8400, -31.9600), 4326))
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Merch Products
-- ---------------------------------------------------------------------------

INSERT INTO merch_products (id, name, description, price, is_active, images, variants) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Community Tee', 'Organic cotton tee with Co-Exist wordmark. Comfortable, breathable, planet-friendly.', 45.00, true,
   ARRAY['/images/merch/tee-sage.jpg', '/images/merch/tee-white.jpg'],
   '[{"key":"xs","label":"XS"},{"key":"s","label":"S"},{"key":"m","label":"M"},{"key":"l","label":"L"},{"key":"xl","label":"XL"},{"key":"xxl","label":"XXL"}]'::jsonb),

  ('d0000000-0000-0000-0000-000000000002', 'Co-Exist Cap', 'Embroidered cap in earthy tones. Adjustable strap, one size fits most.', 30.00, true,
   ARRAY['/images/merch/cap-sage.jpg', '/images/merch/cap-earth.jpg'],
   '[{"key":"one-size","label":"One Size"}]'::jsonb),

  ('d0000000-0000-0000-0000-000000000003', 'Bucket Hat', 'Wide-brim bucket hat for those sunny planting days. UPF 50+.', 20.00, true,
   ARRAY['/images/merch/bucket-hat.jpg'],
   '[{"key":"s-m","label":"S/M"},{"key":"l-xl","label":"L/XL"}]'::jsonb),

  ('d0000000-0000-0000-0000-000000000004', 'Tote Bag', 'Heavyweight canvas tote with Co-Exist logo. Perfect for farmers markets and beach days.', 15.00, true,
   ARRAY['/images/merch/tote-natural.jpg'],
   '[{"key":"one-size","label":"One Size"}]'::jsonb),

  ('d0000000-0000-0000-0000-000000000005', 'Sticker Pack', 'Set of 5 die-cut vinyl stickers - nature-inspired Co-Exist designs.', 5.00, true,
   ARRAY['/images/merch/stickers.jpg'],
   '[{"key":"one-size","label":"Pack of 5"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Sample Partner Offers
-- ---------------------------------------------------------------------------

INSERT INTO partner_offers (id, partner_name, description, offer_details, code, points_cost, is_active, valid_from, valid_to) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Patagonia Byron Bay', 'Supporting conservation through ethical outdoor gear.', '15% off full-price items', 'COEXIST15', 200, true, '2026-01-01', '2026-12-31'),
  ('d1000000-0000-0000-0000-000000000002', 'Stone & Wood Brewing', 'Craft brewery committed to sustainability and community.', 'Free tasting paddle at the taproom', 'COEXISTBREW', 150, true, '2026-01-01', '2026-12-31'),
  ('d1000000-0000-0000-0000-000000000003', 'The Farm Byron Bay', 'Farm-to-table dining supporting regenerative agriculture.', '10% off lunch', 'COEXISTFARM', 100, true, '2026-01-01', '2026-12-31'),
  ('d1000000-0000-0000-0000-000000000004', 'Keep Cup', 'Reusable cups for a world without single-use waste.', '20% off online orders', 'COEXISTCUP', 100, true, '2026-01-01', '2026-12-31')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Feature Flags
-- ---------------------------------------------------------------------------

INSERT INTO feature_flags (id, key, enabled, description) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'donations_enabled', true, 'Enable the donations / giving feature'),
  ('f0000000-0000-0000-0000-000000000002', 'merch_store_enabled', true, 'Enable the merch shop'),
  ('f0000000-0000-0000-0000-000000000003', 'challenges_enabled', false, 'Enable national challenges feature'),
  ('f0000000-0000-0000-0000-000000000004', 'leaderboard_enabled', true, 'Enable points leaderboard'),
  ('f0000000-0000-0000-0000-000000000005', 'referral_program_enabled', false, 'Enable referral program with rewards'),
  ('f0000000-0000-0000-0000-000000000006', 'push_notifications_enabled', true, 'Enable push notifications'),
  ('f0000000-0000-0000-0000-000000000007', 'dark_mode_enabled', false, 'Enable dark mode toggle'),
  ('f0000000-0000-0000-0000-000000000008', 'sound_effects_enabled', false, 'Enable sound effects for interactions'),
  ('f0000000-0000-0000-0000-000000000009', 'partner_offers_enabled', true, 'Enable partner offers / rewards section'),
  ('f0000000-0000-0000-0000-000000000010', 'impact_photos_required', false, 'Require at least one photo when logging impact')
ON CONFLICT (id) DO NOTHING;

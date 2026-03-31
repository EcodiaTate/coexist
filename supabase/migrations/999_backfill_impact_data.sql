-- ============================================================================
-- Backfill missing event_impact data from spreadsheets
-- Byron Bay = Northern Rivers in the DB.
-- ============================================================================

DO $$
DECLARE
  v_cid uuid;
  v_eid uuid;
  v_uid uuid;
BEGIN

  -- BRISBANE: +500 trees
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Brisbane%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 500, now());

  -- GOLD COAST: +120 trees, +13 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Gold Coast%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 120, 13, now());

  -- HOBART: +300 trees
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Hobart%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 300, now());

  -- MELBOURNE: +1620 trees, -63 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Melbourne%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 1620, -63, now());

  -- PERTH: +982 trees, +26 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Perth%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 982, 26, now());

  -- SUNSHINE COAST: +600 trees
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Sunshine Coast%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 600, now());

  -- NORTHERN RIVERS (formerly Byron Bay): +1505 trees, +284.3 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Northern Rivers%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  IF v_uid IS NULL THEN SELECT id INTO v_uid FROM profiles LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'tree_planting', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, trees_planted, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 1505, 284.3, now());

  -- TOWNSVILLE: +95 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Townsville%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  IF v_uid IS NULL THEN SELECT id INTO v_uid FROM profiles LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'shore_cleanup', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 95, now());

  -- GEELONG: +31 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Geelong%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  IF v_uid IS NULL THEN SELECT id INTO v_uid FROM profiles LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'shore_cleanup', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 31, now());

  -- MORNINGTON PENINSULA: +32 kg rubbish
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Mornington%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  IF v_uid IS NULL THEN SELECT id INTO v_uid FROM profiles LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Backfill', 'shore_cleanup', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, 32, now());

  -- CAIRNS: -95 kg rubbish (DB has 284, spreadsheet says 189)
  SELECT id INTO v_cid FROM collectives WHERE name ILIKE '%Cairns%' LIMIT 1;
  SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid AND cm.role IN ('leader','co_leader','assist_leader') LIMIT 1;
  IF v_uid IS NULL THEN SELECT cm.user_id INTO v_uid FROM collective_members cm WHERE cm.collective_id = v_cid LIMIT 1; END IF;
  INSERT INTO events (id, collective_id, created_by, title, activity_type, status, date_start, date_end, created_at)
  VALUES (gen_random_uuid(), v_cid, v_uid, 'Historical Data Correction', 'shore_cleanup', 'completed', '2024-01-01', '2024-01-01', now())
  RETURNING id INTO v_eid;
  INSERT INTO event_impact (id, event_id, logged_by, rubbish_kg, logged_at)
  VALUES (gen_random_uuid(), v_eid, v_uid, -95, now());

  -- MELBOURNE (rubbish correction already included above as -63)
  -- ADELAIDE: no delta needed
  -- SYDNEY: no delta needed
  -- TAMWORTH: no data in any spreadsheet
  -- TEST: skip

END $$;

-- ============================================================================
-- Add attendees column to event_impact
--
-- Attendance was previously only tracked via event_registrations check-ins,
-- but leaders record attendance counts in their post-event reviews (spreadsheet).
-- This column stores the actual headcount per event.
--
-- Dates are shifted -1 day vs spreadsheet because events are stored in UTC
-- (AEST dates become previous day in UTC).
-- Collective name mapping: Byron Bay → Northern Rivers, Melbourne City → Melbourne
-- ============================================================================

ALTER TABLE event_impact ADD COLUMN IF NOT EXISTS attendees integer;

-- Reset any previous bad data
UPDATE event_impact SET attendees = NULL WHERE attendees IS NOT NULL;

-- Backfill 2026 attendance from Master Impact Data Sheet (corrected dates + names)
UPDATE event_impact ei SET attendees = 17 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-16' AND c.name = 'Sunshine Coast';
UPDATE event_impact ei SET attendees = 43 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-17' AND c.name = 'Perth';
UPDATE event_impact ei SET attendees = 8 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-24' AND c.name = 'Northern Rivers';
UPDATE event_impact ei SET attendees = 12 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-16' AND c.name = 'Cairns';
UPDATE event_impact ei SET attendees = 24 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-30' AND c.name = 'Perth';
UPDATE event_impact ei SET attendees = 27 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-30' AND c.name = 'Adelaide';
UPDATE event_impact ei SET attendees = 38 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-30' AND c.name = 'Brisbane';
UPDATE event_impact ei SET attendees = 30 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-01-31' AND c.name = 'Melbourne';
UPDATE event_impact ei SET attendees = 20 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-06' AND c.name = 'Adelaide';
UPDATE event_impact ei SET attendees = 5 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-10' AND c.name = 'Cairns';
UPDATE event_impact ei SET attendees = 21 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-14' AND c.name = 'Perth';
UPDATE event_impact ei SET attendees = 11 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-14' AND c.name = 'Adelaide';
UPDATE event_impact ei SET attendees = 30 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-14' AND c.name = 'Melbourne' AND LOWER(e.title) LIKE '%clean%';
UPDATE event_impact ei SET attendees = 6 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-07' AND c.name = 'Sydney';
UPDATE event_impact ei SET attendees = 35 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-13' AND c.name = 'Melbourne';
UPDATE event_impact ei SET attendees = 10 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-14' AND c.name = 'Sydney';
UPDATE event_impact ei SET attendees = 19 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-18' AND c.name = 'Brisbane';
UPDATE event_impact ei SET attendees = 3 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-17' AND c.name = 'Northern Rivers';
UPDATE event_impact ei SET attendees = 20 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-20' AND c.name = 'Perth';
UPDATE event_impact ei SET attendees = 7 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-21' AND c.name = 'Brisbane';
UPDATE event_impact ei SET attendees = 10 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-21' AND c.name = 'Melbourne' AND LOWER(e.title) LIKE '%churchill%';
UPDATE event_impact ei SET attendees = 11 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-21' AND c.name = 'Sunshine Coast';
UPDATE event_impact ei SET attendees = 13 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-20' AND c.name = 'Cairns';
UPDATE event_impact ei SET attendees = 5 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-20' AND c.name = 'Geelong';
UPDATE event_impact ei SET attendees = 3 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-21' AND c.name = 'Gold Coast';
UPDATE event_impact ei SET attendees = 8 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-26' AND c.name = 'Sunshine Coast';
UPDATE event_impact ei SET attendees = 22 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Geelong';
UPDATE event_impact ei SET attendees = 40 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Brisbane';
UPDATE event_impact ei SET attendees = 12 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Sydney';
UPDATE event_impact ei SET attendees = 27 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Adelaide';
UPDATE event_impact ei SET attendees = 5 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Gold Coast';
UPDATE event_impact ei SET attendees = 34 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Perth';
UPDATE event_impact ei SET attendees = 17 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Sunshine Coast';
UPDATE event_impact ei SET attendees = 30 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Melbourne' AND LOWER(e.title) LIKE '%catani%';
UPDATE event_impact ei SET attendees = 10 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Northern Rivers';
UPDATE event_impact ei SET attendees = 10 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Mornington Peninsula';
UPDATE event_impact ei SET attendees = 8 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Hobart';
UPDATE event_impact ei SET attendees = 14 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Townsville';
UPDATE event_impact ei SET attendees = 13 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-02-28' AND c.name = 'Cairns';
UPDATE event_impact ei SET attendees = 4 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-06' AND c.name = 'Geelong';
UPDATE event_impact ei SET attendees = 45 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-07' AND c.name = 'Perth';
UPDATE event_impact ei SET attendees = 100 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-13' AND c.name = 'Sydney';
UPDATE event_impact ei SET attendees = 26 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-20' AND c.name = 'Brisbane' AND LOWER(e.title) LIKE '%wildlife%';
UPDATE event_impact ei SET attendees = 12 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-21' AND c.name = 'Melbourne' AND LOWER(e.title) LIKE '%blue lake%';
UPDATE event_impact ei SET attendees = 21 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-20' AND c.name = 'Sunshine Coast';
UPDATE event_impact ei SET attendees = 6 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-21' AND c.name = 'Townsville';
UPDATE event_impact ei SET attendees = 7 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-20' AND c.name = 'Hobart';
UPDATE event_impact ei SET attendees = 13 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-22' AND c.name = 'Mornington Peninsula';
UPDATE event_impact ei SET attendees = 32 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-28' AND c.name = 'Adelaide';
UPDATE event_impact ei SET attendees = 11 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-28' AND c.name = 'Brisbane';
UPDATE event_impact ei SET attendees = 3 FROM events e JOIN collectives c ON c.id = e.collective_id WHERE ei.event_id = e.id AND e.date_start::date = '2026-03-25' AND c.name = 'Northern Rivers';

-- Verify
SELECT COUNT(*) as matched, SUM(attendees) as total_2026_attendees FROM event_impact WHERE attendees IS NOT NULL AND attendees > 0;

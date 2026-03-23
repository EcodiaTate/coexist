-- 042: Extended profile fields
-- Adds first_name, last_name, age, postcode, gender, email, discovery source,
-- accessibility requirements, and emergency contact details to profiles.
-- Also tracks whether the user has completed their detailed profile survey.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS collective_discovery text,
  ADD COLUMN IF NOT EXISTS accessibility_requirements text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS profile_details_completed boolean DEFAULT false;

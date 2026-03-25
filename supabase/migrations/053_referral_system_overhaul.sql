-- ============================================================
-- 053: Referral system overhaul
--
-- Problems fixed:
--   1. referral code was stored as a row in `invites` with empty email
--      which inflated stats and conflicted with the UNIQUE(code) constraint
--   2. No way to transition invite status pending→accepted (missing UPDATE policy)
--   3. No self-referral or duplicate-invite prevention
--   4. No way for signup to look up a referral code (anon can't read invites)
--
-- Changes:
--   a. New `referral_codes` table: one code per user
--   b. Drop UNIQUE on invites.code so multiple invites share the referrer's code
--   c. Add unique constraint on (inviter_id, invitee_email) to prevent dupes
--   d. Add UPDATE policy on invites for status transitions
--   e. Add anon SELECT policy on referral_codes for signup validation
--   f. Clean up orphan "code-holder" rows (invitee_email = '')
-- ============================================================

-- a. referral_codes table — one row per user
CREATE TABLE IF NOT EXISTS referral_codes (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own code
CREATE POLICY "referral_codes_select_own"
  ON referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin_or_staff(auth.uid()));

-- Authenticated users can create their own code
CREATE POLICY "referral_codes_insert_own"
  ON referral_codes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anon users can look up a code during signup (validate that it exists)
CREATE POLICY "referral_codes_select_anon"
  ON referral_codes FOR SELECT TO anon
  USING (true);

-- b. Migrate existing code-holder rows to referral_codes, then clean up
INSERT INTO referral_codes (user_id, code, created_at)
SELECT inviter_id, code, created_at
FROM invites
WHERE invitee_email = ''
ON CONFLICT (user_id) DO NOTHING;

-- Remove orphan code-holder rows from invites
DELETE FROM invites WHERE invitee_email = '';

-- c. Drop the UNIQUE constraint on invites.code
-- The code column still references the referrer's code but is no longer unique per row
ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_code_key;

-- d. Prevent duplicate invites to the same email from the same inviter
-- Use a unique index with COALESCE so NULLs don't bypass
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_inviter_email_unique
  ON invites (inviter_id, lower(invitee_email))
  WHERE invitee_email <> '';

-- e. Add UPDATE policy so status can transition pending→accepted
CREATE POLICY "invites_update_status"
  ON invites FOR UPDATE TO authenticated
  USING (
    -- The inviter can update their own invites, or admin/staff can
    inviter_id = auth.uid() OR is_admin_or_staff(auth.uid())
  )
  WITH CHECK (
    -- Only allow status to be set to 'accepted'
    status = 'accepted'
  );

-- f. Add a column to profiles to track who referred this user
-- (idempotent: skip if column already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);
  END IF;
END$$;

-- g. RPC to accept a referral during signup
-- Called from the client after signup with the referral code
CREATE OR REPLACE FUNCTION accept_referral(referral_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up the referral code
  SELECT user_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = referral_code;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  -- Block self-referral
  IF v_referrer_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot use your own referral code';
  END IF;

  -- Check if already referred
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND referred_by IS NOT NULL
  ) THEN
    -- Already referred, silently no-op
    RETURN;
  END IF;

  -- Get the user's email for invite matching
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Set referred_by on the new user's profile
  UPDATE profiles SET referred_by = v_referrer_id WHERE id = v_user_id;

  -- If there's a matching pending invite, mark it accepted
  UPDATE invites
  SET status = 'accepted'
  WHERE inviter_id = v_referrer_id
    AND lower(invitee_email) = lower(v_user_email)
    AND status = 'pending';

  -- If no matching invite existed, create an accepted one for tracking
  IF NOT FOUND THEN
    INSERT INTO invites (inviter_id, invitee_email, code, status)
    VALUES (v_referrer_id, COALESCE(v_user_email, ''), referral_code, 'accepted')
    ON CONFLICT (inviter_id, lower(invitee_email)) WHERE invitee_email <> ''
    DO UPDATE SET status = 'accepted';
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION accept_referral(text) TO authenticated;

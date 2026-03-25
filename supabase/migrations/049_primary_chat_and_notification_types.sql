-- Add primary_chat_id to profiles so users can choose which chat opens by default
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_chat_id uuid;

-- Add foreign key reference (nullable - if the collective is deleted, reset to null)
-- Note: collective_members may not have a direct FK to collectives from profiles,
-- so we just store the collective_id and validate in the app layer
COMMENT ON COLUMN profiles.primary_chat_id IS 'User-chosen primary collective chat. If null, falls back to highest-role / earliest-joined.';

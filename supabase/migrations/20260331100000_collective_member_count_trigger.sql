-- Migration: Add trigger to keep collectives.member_count in sync
-- The member_count column has been 0 for all collectives because
-- no trigger was maintaining it.

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION update_collective_member_count()
RETURNS TRIGGER AS $$
DECLARE
  target_collective_id uuid;
BEGIN
  -- Determine which collective to update
  IF TG_OP = 'DELETE' THEN
    target_collective_id := OLD.collective_id;
  ELSE
    target_collective_id := NEW.collective_id;
  END IF;

  -- Also handle the old collective on UPDATE if collective_id changed
  IF TG_OP = 'UPDATE' AND OLD.collective_id IS DISTINCT FROM NEW.collective_id THEN
    UPDATE collectives
    SET member_count = (
      SELECT COUNT(*) FROM collective_members
      WHERE collective_id = OLD.collective_id AND status = 'active'
    )
    WHERE id = OLD.collective_id;
  END IF;

  -- Update the target collective's member count
  UPDATE collectives
  SET member_count = (
    SELECT COUNT(*) FROM collective_members
    WHERE collective_id = target_collective_id AND status = 'active'
  )
  WHERE id = target_collective_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger
DROP TRIGGER IF EXISTS trg_update_collective_member_count ON collective_members;
CREATE TRIGGER trg_update_collective_member_count
  AFTER INSERT OR UPDATE OR DELETE ON collective_members
  FOR EACH ROW
  EXECUTE FUNCTION update_collective_member_count();

-- Step 3: Backfill existing counts
UPDATE collectives c
SET member_count = (
  SELECT COUNT(*) FROM collective_members cm
  WHERE cm.collective_id = c.id AND cm.status = 'active'
);

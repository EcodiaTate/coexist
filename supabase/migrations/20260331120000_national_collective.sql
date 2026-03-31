-- =============================================================================
-- National Collective: org-wide events (retreats, campouts, cross-collective)
-- =============================================================================

-- Add is_national flag to collectives
ALTER TABLE collectives ADD COLUMN IF NOT EXISTS is_national boolean DEFAULT false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_collectives_is_national ON collectives (is_national) WHERE is_national = true;

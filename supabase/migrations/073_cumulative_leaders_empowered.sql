-- ============================================================================
-- 073: Cumulative "Leaders Empowered" counter
--
-- Previously, the "leaders empowered" stat was a live COUNT(DISTINCT user_id)
-- on collective_members with a leadership role. That means removing a leader
-- (or deleting their account) decrements the stat — but it should be
-- cumulative (only goes up).
--
-- Approach:
--   1. Seed app_settings with the current count (national + per-collective)
--   2. Add a trigger that increments on new leadership role assignments
--      but only for genuinely new leaders (first time holding any leadership
--      role in that collective, or nationally).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Seed national counter from current data
-- ---------------------------------------------------------------------------
INSERT INTO app_settings (key, value)
VALUES (
  'leaders_empowered_total',
  (SELECT jsonb_build_object('count',
    (SELECT COUNT(DISTINCT user_id) FROM collective_members
     WHERE role IN ('leader', 'co_leader', 'assist_leader'))
  ))
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;

-- ---------------------------------------------------------------------------
-- 2. Seed per-collective counters
--    Stored as: leaders_empowered:<collective_id> → {"count": N}
-- ---------------------------------------------------------------------------
INSERT INTO app_settings (key, value)
SELECT
  'leaders_empowered:' || collective_id,
  jsonb_build_object('count', COUNT(DISTINCT user_id))
FROM collective_members
WHERE role IN ('leader', 'co_leader', 'assist_leader')
GROUP BY collective_id
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;

-- ---------------------------------------------------------------------------
-- 3. Trigger function: increment on new leadership role assignment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_leaders_empowered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when role is a leadership role
  IF NEW.role NOT IN ('leader', 'co_leader', 'assist_leader') THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, skip if old role was already a leadership role (role change, not new leader)
  IF TG_OP = 'UPDATE'
     AND OLD.role IN ('leader', 'co_leader', 'assist_leader') THEN
    RETURN NEW;
  END IF;

  -- Increment per-collective counter (always — even if user leads another collective,
  -- this collective is getting a new leader)
  IF NOT EXISTS (
    SELECT 1 FROM collective_members
    WHERE user_id = NEW.user_id
      AND collective_id = NEW.collective_id
      AND role IN ('leader', 'co_leader', 'assist_leader')
      AND id != NEW.id
  ) THEN
    INSERT INTO app_settings (key, value)
    VALUES ('leaders_empowered:' || NEW.collective_id, '{"count": 1}'::jsonb)
    ON CONFLICT (key) DO UPDATE
      SET value = jsonb_build_object('count',
        COALESCE((app_settings.value->>'count')::int, 0) + 1
      );
  END IF;

  -- Increment national counter only if this user has never held ANY leadership
  -- role in ANY collective before
  IF NOT EXISTS (
    SELECT 1 FROM collective_members
    WHERE user_id = NEW.user_id
      AND role IN ('leader', 'co_leader', 'assist_leader')
      AND id != NEW.id
  ) THEN
    INSERT INTO app_settings (key, value)
    VALUES ('leaders_empowered_total', '{"count": 1}'::jsonb)
    ON CONFLICT (key) DO UPDATE
      SET value = jsonb_build_object('count',
        COALESCE((app_settings.value->>'count')::int, 0) + 1
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. Attach trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_leaders_empowered_increment ON collective_members;

CREATE TRIGGER trg_leaders_empowered_increment
  AFTER INSERT OR UPDATE OF role ON collective_members
  FOR EACH ROW
  EXECUTE FUNCTION increment_leaders_empowered();

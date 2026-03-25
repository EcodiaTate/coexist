-- ============================================================
-- 047: Learning & Development System
-- Modules, sections (pathways), quizzes, assignments, progress
-- ============================================================

-- ── Enums ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE dev_module_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dev_content_type AS ENUM ('text', 'video', 'file', 'slideshow', 'quiz');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dev_category AS ENUM ('learning', 'leadership_development', 'onboarding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dev_question_type AS ENUM ('multiple_choice', 'multi_select', 'true_false', 'short_answer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dev_progress_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dev_assignment_scope AS ENUM ('collective', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Tables ─────────────────────────────────────────────────

-- 1. Quizzes (created before module_content so FK works)
CREATE TABLE IF NOT EXISTS dev_quizzes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  pass_score          integer NOT NULL DEFAULT 70,
  randomize_questions boolean NOT NULL DEFAULT false,
  time_limit_minutes  integer,
  max_attempts        integer NOT NULL DEFAULT 0,
  created_by          uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. Modules
CREATE TABLE IF NOT EXISTS dev_modules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text,
  category          dev_category NOT NULL DEFAULT 'learning',
  thumbnail_url     text,
  estimated_minutes integer NOT NULL DEFAULT 10,
  status            dev_module_status NOT NULL DEFAULT 'draft',
  pass_score        integer,
  -- Targeting: who sees this module (empty = everyone authenticated)
  target_roles      text[] NOT NULL DEFAULT '{}',       -- e.g. {'leader','co_leader','assist_leader','national_staff'}
  target_user_ids   uuid[] NOT NULL DEFAULT '{}',       -- specific individual users
  created_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Patch columns that may be missing if the table was created by a partial earlier run
ALTER TABLE dev_modules ADD COLUMN IF NOT EXISTS target_roles    text[] NOT NULL DEFAULT '{}';
ALTER TABLE dev_modules ADD COLUMN IF NOT EXISTS target_user_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE dev_modules ADD COLUMN IF NOT EXISTS published_at    timestamptz;

-- 3. Module content blocks
CREATE TABLE IF NOT EXISTS dev_module_content (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid NOT NULL REFERENCES dev_modules(id) ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  content_type    dev_content_type NOT NULL,
  -- text
  text_content    text,
  -- video
  video_url       text,
  video_provider  text CHECK (video_provider IN ('youtube', 'vimeo', 'upload')),
  -- file
  file_url        text,
  file_name       text,
  file_size_bytes bigint,
  -- slideshow
  image_urls      text[] NOT NULL DEFAULT '{}',
  image_captions  text[] NOT NULL DEFAULT '{}',
  -- quiz
  quiz_id         uuid REFERENCES dev_quizzes(id) ON DELETE SET NULL,
  -- shared
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dev_module_content_module ON dev_module_content(module_id, sort_order);

-- 4. Sections (pathways)
CREATE TABLE IF NOT EXISTS dev_sections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    text NOT NULL,
  description              text,
  category                 dev_category NOT NULL DEFAULT 'learning',
  thumbnail_url            text,
  status                   dev_module_status NOT NULL DEFAULT 'draft',
  prerequisite_section_id  uuid REFERENCES dev_sections(id) ON DELETE SET NULL,
  target_roles             text[] NOT NULL DEFAULT '{}',
  target_user_ids          uuid[] NOT NULL DEFAULT '{}',
  created_by               uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  published_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dev_sections ADD COLUMN IF NOT EXISTS target_roles    text[] NOT NULL DEFAULT '{}';
ALTER TABLE dev_sections ADD COLUMN IF NOT EXISTS target_user_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE dev_sections ADD COLUMN IF NOT EXISTS published_at    timestamptz;

-- 5. Section ↔ module junction
CREATE TABLE IF NOT EXISTS dev_section_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  uuid NOT NULL REFERENCES dev_sections(id) ON DELETE CASCADE,
  module_id   uuid NOT NULL REFERENCES dev_modules(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  UNIQUE (section_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_dev_section_modules_section ON dev_section_modules(section_id, sort_order);

-- 6. Quiz questions
CREATE TABLE IF NOT EXISTS dev_quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES dev_quizzes(id) ON DELETE CASCADE,
  sort_order     integer NOT NULL DEFAULT 0,
  question_type  dev_question_type NOT NULL,
  question_text  text NOT NULL,
  explanation    text,
  points         integer NOT NULL DEFAULT 1,
  image_url      text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_questions_quiz ON dev_quiz_questions(quiz_id, sort_order);

-- 7. Quiz options
CREATE TABLE IF NOT EXISTS dev_quiz_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES dev_quiz_questions(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  option_text text NOT NULL,
  is_correct  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_options_question ON dev_quiz_options(question_id, sort_order);

-- 8. Assignments
CREATE TABLE IF NOT EXISTS dev_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid REFERENCES dev_modules(id) ON DELETE CASCADE,
  section_id      uuid REFERENCES dev_sections(id) ON DELETE CASCADE,
  scope           dev_assignment_scope NOT NULL DEFAULT 'collective',
  collective_id   uuid REFERENCES collectives(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by     uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  due_date        date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (module_id IS NOT NULL AND section_id IS NULL) OR
    (module_id IS NULL AND section_id IS NOT NULL)
  ),
  CHECK (
    (scope = 'collective' AND collective_id IS NOT NULL) OR
    (scope = 'individual' AND user_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_dev_assignments_collective ON dev_assignments(collective_id);
CREATE INDEX IF NOT EXISTS idx_dev_assignments_user ON dev_assignments(user_id);

-- 9. User module progress
CREATE TABLE IF NOT EXISTS dev_user_module_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id       uuid NOT NULL REFERENCES dev_modules(id) ON DELETE CASCADE,
  status          dev_progress_status NOT NULL DEFAULT 'not_started',
  last_content_id uuid REFERENCES dev_module_content(id) ON DELETE SET NULL,
  progress_pct    integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  time_spent_sec  integer NOT NULL DEFAULT 0,
  started_at      timestamptz,
  completed_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_dev_user_module_progress_user ON dev_user_module_progress(user_id);

-- 10. User section progress
CREATE TABLE IF NOT EXISTS dev_user_section_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  section_id        uuid NOT NULL REFERENCES dev_sections(id) ON DELETE CASCADE,
  status            dev_progress_status NOT NULL DEFAULT 'not_started',
  modules_completed integer NOT NULL DEFAULT 0,
  modules_total     integer NOT NULL DEFAULT 0,
  progress_pct      integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  started_at        timestamptz,
  completed_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_id)
);

-- 11. Quiz attempts
CREATE TABLE IF NOT EXISTS dev_quiz_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id        uuid NOT NULL REFERENCES dev_quizzes(id) ON DELETE CASCADE,
  module_id      uuid REFERENCES dev_modules(id) ON DELETE SET NULL,
  score_pct      integer NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  points_earned  integer NOT NULL DEFAULT 0,
  points_total   integer NOT NULL DEFAULT 0,
  passed         boolean NOT NULL DEFAULT false,
  time_spent_sec integer NOT NULL DEFAULT 0,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_attempts_user ON dev_quiz_attempts(user_id, quiz_id);

-- 12. Quiz responses
CREATE TABLE IF NOT EXISTS dev_quiz_responses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id          uuid NOT NULL REFERENCES dev_quiz_attempts(id) ON DELETE CASCADE,
  question_id         uuid NOT NULL REFERENCES dev_quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids uuid[] NOT NULL DEFAULT '{}',
  text_response       text,
  is_correct          boolean NOT NULL DEFAULT false,
  points_earned       integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_responses_attempt ON dev_quiz_responses(attempt_id);


-- ── Updated-at triggers ────────────────────────────────────

CREATE OR REPLACE FUNCTION dev_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dev_modules_updated ON dev_modules;
CREATE TRIGGER trg_dev_modules_updated BEFORE UPDATE ON dev_modules
  FOR EACH ROW EXECUTE FUNCTION dev_set_updated_at();

DROP TRIGGER IF EXISTS trg_dev_module_content_updated ON dev_module_content;
CREATE TRIGGER trg_dev_module_content_updated BEFORE UPDATE ON dev_module_content
  FOR EACH ROW EXECUTE FUNCTION dev_set_updated_at();

DROP TRIGGER IF EXISTS trg_dev_sections_updated ON dev_sections;
CREATE TRIGGER trg_dev_sections_updated BEFORE UPDATE ON dev_sections
  FOR EACH ROW EXECUTE FUNCTION dev_set_updated_at();

DROP TRIGGER IF EXISTS trg_dev_quizzes_updated ON dev_quizzes;
CREATE TRIGGER trg_dev_quizzes_updated BEFORE UPDATE ON dev_quizzes
  FOR EACH ROW EXECUTE FUNCTION dev_set_updated_at();

DROP TRIGGER IF EXISTS trg_dev_user_module_progress_updated ON dev_user_module_progress;
CREATE TRIGGER trg_dev_user_module_progress_updated BEFORE UPDATE ON dev_user_module_progress
  FOR EACH ROW EXECUTE FUNCTION dev_set_updated_at();

DROP TRIGGER IF EXISTS trg_dev_user_section_progress_updated ON dev_user_section_progress;
CREATE TRIGGER trg_dev_user_section_progress_updated BEFORE UPDATE ON dev_user_section_progress
  FOR EACH ROW EXECUTE FUNCTION dev_set_updated_at();


-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE dev_modules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_module_content       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_sections             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_section_modules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_quizzes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_quiz_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_quiz_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_user_section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_quiz_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_quiz_responses       ENABLE ROW LEVEL SECURITY;

-- ── Modules ──

DROP POLICY IF EXISTS "dev_modules_select" ON dev_modules;
CREATE POLICY "dev_modules_select" ON dev_modules FOR SELECT TO authenticated
  USING (status = 'published' OR is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_modules_insert" ON dev_modules;
CREATE POLICY "dev_modules_insert" ON dev_modules FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_modules_update" ON dev_modules;
CREATE POLICY "dev_modules_update" ON dev_modules FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_modules_delete" ON dev_modules;
CREATE POLICY "dev_modules_delete" ON dev_modules FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Module content ──

DROP POLICY IF EXISTS "dev_module_content_select" ON dev_module_content;
CREATE POLICY "dev_module_content_select" ON dev_module_content FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dev_modules m
      WHERE m.id = module_id AND (m.status = 'published' OR is_admin_or_staff(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "dev_module_content_insert" ON dev_module_content;
CREATE POLICY "dev_module_content_insert" ON dev_module_content FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_module_content_update" ON dev_module_content;
CREATE POLICY "dev_module_content_update" ON dev_module_content FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_module_content_delete" ON dev_module_content;
CREATE POLICY "dev_module_content_delete" ON dev_module_content FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Sections ──

DROP POLICY IF EXISTS "dev_sections_select" ON dev_sections;
CREATE POLICY "dev_sections_select" ON dev_sections FOR SELECT TO authenticated
  USING (status = 'published' OR is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_sections_insert" ON dev_sections;
CREATE POLICY "dev_sections_insert" ON dev_sections FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_sections_update" ON dev_sections;
CREATE POLICY "dev_sections_update" ON dev_sections FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_sections_delete" ON dev_sections;
CREATE POLICY "dev_sections_delete" ON dev_sections FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Section modules ──

DROP POLICY IF EXISTS "dev_section_modules_select" ON dev_section_modules;
CREATE POLICY "dev_section_modules_select" ON dev_section_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dev_sections s
      WHERE s.id = section_id AND (s.status = 'published' OR is_admin_or_staff(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "dev_section_modules_insert" ON dev_section_modules;
CREATE POLICY "dev_section_modules_insert" ON dev_section_modules FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_section_modules_update" ON dev_section_modules;
CREATE POLICY "dev_section_modules_update" ON dev_section_modules FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_section_modules_delete" ON dev_section_modules;
CREATE POLICY "dev_section_modules_delete" ON dev_section_modules FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Quizzes ──

DROP POLICY IF EXISTS "dev_quizzes_select" ON dev_quizzes;
CREATE POLICY "dev_quizzes_select" ON dev_quizzes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_quizzes_insert" ON dev_quizzes;
CREATE POLICY "dev_quizzes_insert" ON dev_quizzes FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_quizzes_update" ON dev_quizzes;
CREATE POLICY "dev_quizzes_update" ON dev_quizzes FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_quizzes_delete" ON dev_quizzes;
CREATE POLICY "dev_quizzes_delete" ON dev_quizzes FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Quiz questions ──

DROP POLICY IF EXISTS "dev_quiz_questions_select" ON dev_quiz_questions;
CREATE POLICY "dev_quiz_questions_select" ON dev_quiz_questions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_quiz_questions_insert" ON dev_quiz_questions;
CREATE POLICY "dev_quiz_questions_insert" ON dev_quiz_questions FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_quiz_questions_update" ON dev_quiz_questions;
CREATE POLICY "dev_quiz_questions_update" ON dev_quiz_questions FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_quiz_questions_delete" ON dev_quiz_questions;
CREATE POLICY "dev_quiz_questions_delete" ON dev_quiz_questions FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Quiz options ──

DROP POLICY IF EXISTS "dev_quiz_options_select" ON dev_quiz_options;
CREATE POLICY "dev_quiz_options_select" ON dev_quiz_options FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_quiz_options_insert" ON dev_quiz_options;
CREATE POLICY "dev_quiz_options_insert" ON dev_quiz_options FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_quiz_options_update" ON dev_quiz_options;
CREATE POLICY "dev_quiz_options_update" ON dev_quiz_options FOR UPDATE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_quiz_options_delete" ON dev_quiz_options;
CREATE POLICY "dev_quiz_options_delete" ON dev_quiz_options FOR DELETE TO authenticated
  USING (is_admin_or_staff(auth.uid()));

-- ── Assignments ──

DROP POLICY IF EXISTS "dev_assignments_select" ON dev_assignments;
CREATE POLICY "dev_assignments_select" ON dev_assignments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM collective_members cm
      WHERE cm.collective_id = dev_assignments.collective_id
        AND cm.user_id = auth.uid()
    )
    OR is_admin_or_staff(auth.uid())
  );

DROP POLICY IF EXISTS "dev_assignments_insert" ON dev_assignments;
CREATE POLICY "dev_assignments_insert" ON dev_assignments FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_staff(auth.uid())
    OR (
      collective_id IS NOT NULL
      AND is_collective_leader_or_above(auth.uid(), collective_id)
    )
  );

DROP POLICY IF EXISTS "dev_assignments_update" ON dev_assignments;
CREATE POLICY "dev_assignments_update" ON dev_assignments FOR UPDATE TO authenticated
  USING (
    is_admin_or_staff(auth.uid())
    OR (
      collective_id IS NOT NULL
      AND is_collective_leader_or_above(auth.uid(), collective_id)
    )
  );

DROP POLICY IF EXISTS "dev_assignments_delete" ON dev_assignments;
CREATE POLICY "dev_assignments_delete" ON dev_assignments FOR DELETE TO authenticated
  USING (
    is_admin_or_staff(auth.uid())
    OR (
      collective_id IS NOT NULL
      AND is_collective_leader_or_above(auth.uid(), collective_id)
    )
  );

-- ── User module progress ──

DROP POLICY IF EXISTS "dev_user_module_progress_select" ON dev_user_module_progress;
CREATE POLICY "dev_user_module_progress_select" ON dev_user_module_progress FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM collective_members cm
      JOIN collective_members leader_cm ON leader_cm.collective_id = cm.collective_id
      WHERE cm.user_id = dev_user_module_progress.user_id
        AND leader_cm.user_id = auth.uid()
        AND leader_cm.role IN ('leader', 'co_leader')
    )
  );

DROP POLICY IF EXISTS "dev_user_module_progress_insert" ON dev_user_module_progress;
CREATE POLICY "dev_user_module_progress_insert" ON dev_user_module_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dev_user_module_progress_update" ON dev_user_module_progress;
CREATE POLICY "dev_user_module_progress_update" ON dev_user_module_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── User section progress ──

DROP POLICY IF EXISTS "dev_user_section_progress_select" ON dev_user_section_progress;
CREATE POLICY "dev_user_section_progress_select" ON dev_user_section_progress FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM collective_members cm
      JOIN collective_members leader_cm ON leader_cm.collective_id = cm.collective_id
      WHERE cm.user_id = dev_user_section_progress.user_id
        AND leader_cm.user_id = auth.uid()
        AND leader_cm.role IN ('leader', 'co_leader')
    )
  );

DROP POLICY IF EXISTS "dev_user_section_progress_insert" ON dev_user_section_progress;
CREATE POLICY "dev_user_section_progress_insert" ON dev_user_section_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dev_user_section_progress_update" ON dev_user_section_progress;
CREATE POLICY "dev_user_section_progress_update" ON dev_user_section_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── Quiz attempts ──

DROP POLICY IF EXISTS "dev_quiz_attempts_select" ON dev_quiz_attempts;
CREATE POLICY "dev_quiz_attempts_select" ON dev_quiz_attempts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM collective_members cm
      JOIN collective_members leader_cm ON leader_cm.collective_id = cm.collective_id
      WHERE cm.user_id = dev_quiz_attempts.user_id
        AND leader_cm.user_id = auth.uid()
        AND leader_cm.role IN ('leader', 'co_leader')
    )
  );

DROP POLICY IF EXISTS "dev_quiz_attempts_insert" ON dev_quiz_attempts;
CREATE POLICY "dev_quiz_attempts_insert" ON dev_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Quiz responses ──

DROP POLICY IF EXISTS "dev_quiz_responses_select" ON dev_quiz_responses;
CREATE POLICY "dev_quiz_responses_select" ON dev_quiz_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dev_quiz_attempts a
      WHERE a.id = attempt_id AND (
        a.user_id = auth.uid()
        OR is_admin_or_staff(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "dev_quiz_responses_insert" ON dev_quiz_responses;
CREATE POLICY "dev_quiz_responses_insert" ON dev_quiz_responses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dev_quiz_attempts a
      WHERE a.id = attempt_id AND a.user_id = auth.uid()
    )
  );


-- ── Storage bucket ─────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dev-assets',
  'dev-assets',
  true,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/x-iwork-keynote-sffkey',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "dev_assets_public_read" ON storage.objects;
CREATE POLICY "dev_assets_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'dev-assets');

DROP POLICY IF EXISTS "dev_assets_staff_insert" ON storage.objects;
CREATE POLICY "dev_assets_staff_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dev-assets' AND is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_assets_staff_update" ON storage.objects;
CREATE POLICY "dev_assets_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dev-assets' AND is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "dev_assets_staff_delete" ON storage.objects;
CREATE POLICY "dev_assets_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dev-assets' AND is_admin_or_staff(auth.uid()));

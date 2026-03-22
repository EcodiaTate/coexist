-- ============================================================
-- Migration 036: One-time tasks + attachments
--
-- 1. Adds 'once' schedule_type for one-time tasks (e.g. "Read the Handbook")
--    - Once tasks use period_key = 'once:{user_id}' so each user gets exactly one instance
--    - Once completed or skipped, no new instance is ever generated for that user
--
-- 2. Adds attachment_url + attachment_label to task_templates so admins
--    can attach a PDF/link to any task (e.g. the onboarding handbook).
-- ============================================================

-- 1. Allow 'once' as a schedule_type
alter table task_templates drop constraint if exists task_templates_schedule_type_check;
alter table task_templates add constraint task_templates_schedule_type_check
  check (schedule_type in ('weekly', 'monthly', 'event_relative', 'once'));

-- 2. Add attachment columns to task_templates
--    attachment_url  = Supabase Storage public URL (uploaded file)
--    attachment_label = original filename or admin-provided label
alter table task_templates add column if not exists attachment_url text;
alter table task_templates add column if not exists attachment_label text;

-- 2b. Storage bucket for task attachment files (PDFs, docs, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments', 'task-attachments', true, 20 * 1024 * 1024,
  ARRAY['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png','image/jpeg','image/webp',
        'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Public read for task attachments
CREATE POLICY "task-attachments: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments');

-- Admin/staff can upload
CREATE POLICY "task-attachments: staff upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND is_admin_or_staff(auth.uid())
  );

-- Admin/staff can delete
CREATE POLICY "task-attachments: staff delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments'
    AND is_admin_or_staff(auth.uid())
  );

-- 3. Add completed_by_user_id to task_instances for per-user once-task tracking
--    (For 'once' tasks, each user gets their own instance with their user_id baked into period_key)
--    We also store the target user explicitly for filtering.
alter table task_instances add column if not exists assigned_user_id uuid references profiles(id);

-- 4. Index for fast per-user once-task lookups
create index if not exists idx_task_instances_assigned_user
  on task_instances(assigned_user_id) where assigned_user_id is not null;

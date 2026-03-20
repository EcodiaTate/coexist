-- ============================================================
-- Migration: Event reminder emails (cron + tracking table)
-- ============================================================

-- Table to track which reminders have been sent (prevents duplicates)
CREATE TABLE IF NOT EXISTS public.email_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '2h')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, reminder_type)
);

-- Index for fast lookups when checking if reminder was already sent
CREATE INDEX IF NOT EXISTS idx_reminders_sent_event_type
  ON public.email_reminders_sent (event_id, reminder_type);

-- Auto-cleanup: remove reminder records for events older than 7 days
-- (keeps the table small over time)
CREATE INDEX IF NOT EXISTS idx_reminders_sent_at
  ON public.email_reminders_sent (sent_at);

-- RLS: only service role can read/write (edge function uses service role key)
ALTER TABLE public.email_reminders_sent ENABLE ROW LEVEL SECURITY;

-- No public access policies — only service_role bypasses RLS

-- ============================================================
-- pg_cron: Schedule event-reminders function every 30 minutes
-- ============================================================
-- Requires the pg_cron extension (enabled by default on Supabase)

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule: run every 30 minutes
-- The cron job calls the event-reminders edge function via pg_net
SELECT cron.schedule(
  'event-reminders-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- Cleanup cron: purge old reminder records weekly
-- ============================================================

SELECT cron.schedule(
  'cleanup-old-reminders',
  '0 3 * * 0',  -- Every Sunday at 3 AM UTC
  $$
  DELETE FROM public.email_reminders_sent
  WHERE sent_at < now() - interval '7 days';
  $$
);

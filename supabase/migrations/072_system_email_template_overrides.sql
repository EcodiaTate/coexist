-- System email template overrides
-- Allows admins to customise the built-in transactional/marketing email templates
-- without touching edge function code. The send-email function checks this table
-- first, falling back to hardcoded defaults when no override exists.

create table if not exists public.system_email_overrides (
  template_type  text primary key,              -- e.g. 'welcome', 'event_confirmation'
  hero_title     text,                           -- override hero banner title
  hero_subtitle  text,                           -- override hero banner subtitle
  hero_emoji     text,                           -- override hero emoji
  body_html      text,                           -- full custom body HTML (replaces default body builder)
  subject        text,                           -- override subject line
  cta_label      text,                           -- override CTA button text
  cta_url        text,                           -- override CTA button URL
  enabled        boolean not null default true,  -- toggle template on/off
  updated_by     uuid references auth.users(id),
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

comment on table public.system_email_overrides is
  'Admin-editable overrides for system email templates (welcome, event_confirmation, etc.)';

-- RLS: only staff+ can read/write
alter table public.system_email_overrides enable row level security;

create policy "Staff can read system email overrides"
  on public.system_email_overrides for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('national_staff', 'national_admin', 'super_admin')
    )
  );

create policy "Admins can manage system email overrides"
  on public.system_email_overrides for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('national_admin', 'super_admin')
    )
  );

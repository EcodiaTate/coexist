-- ============================================================
-- Collective leadership applications + staff notification config
-- ============================================================

-- ---- Application submissions ----
create table if not exists public.collective_applications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Applicant details
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  date_of_birth text,                          -- dd/mm/yyyy string
  phone         text,

  -- Address
  country       text not null default 'Australia',
  address_line1 text not null,
  address_line2 text,
  suburb        text not null,
  state         text not null,
  postcode      text not null,

  -- Application content
  why_volunteer text not null,
  roles         text[] not null default '{}',   -- e.g. {'social_media','collective_leader','assistant_leader','other'}
  time_commitment text not null,               -- e.g. '2-4 hours/week'
  attended_events text,                         -- yes/no/unsure
  skills        text[] default '{}',            -- public_speaking, event_org, etc.
  resume_url    text,
  additional_info text,
  how_heard     text not null,

  -- Signup for news
  news_opt_in   boolean not null default false,

  -- Linked user (if logged in)
  user_id       uuid references public.profiles(id) on delete set null,

  -- Processing
  status        text not null default 'pending' check (status in ('pending','reviewed','accepted','rejected')),
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  notes         text
);

-- Indexes
create index if not exists idx_collective_applications_status on public.collective_applications(status);
create index if not exists idx_collective_applications_created on public.collective_applications(created_at desc);

-- RLS
alter table public.collective_applications enable row level security;

-- Members can insert (apply)
create policy "Anyone authenticated can apply"
  on public.collective_applications for insert
  to authenticated
  with check (true);

-- Staff can read all
create policy "Staff can view applications"
  on public.collective_applications for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('national_staff', 'super_admin')
    )
  );

-- Staff can update (review)
create policy "Staff can update applications"
  on public.collective_applications for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('national_staff', 'super_admin')
    )
  );

-- ---- Notification recipients config ----
-- Stores which staff members receive notifications for specific events
create table if not exists public.notification_recipients (
  id         uuid primary key default gen_random_uuid(),
  event_type text not null,                     -- e.g. 'collective_application'
  user_id    uuid not null references public.profiles(id) on delete cascade,
  notify_email boolean not null default true,
  notify_push  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_type, user_id)
);

alter table public.notification_recipients enable row level security;

-- Only staff can manage
create policy "Staff can manage notification recipients"
  on public.notification_recipients for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('national_staff', 'super_admin')
    )
  );

-- ---- Add email template for collective applications ----
-- (Template ID will be configured as env var SENDGRID_TPL_COLLECTIVE_APPLICATION)

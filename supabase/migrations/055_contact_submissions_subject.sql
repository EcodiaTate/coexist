-- Create contact_submissions table with subject field
create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.contact_submissions enable row level security;

-- Anyone can insert (public contact form)
create policy "Anyone can submit contact form"
  on public.contact_submissions for insert
  with check (true);

-- Only staff/admins can read submissions
create policy "Staff can view contact submissions"
  on public.contact_submissions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('national_staff', 'national_admin', 'super_admin')
    )
  );

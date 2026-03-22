-- Legal pages: stores editable legal/policy content managed by staff
create table if not exists public.legal_pages (
  slug        text primary key,              -- e.g. 'privacy', 'terms', 'about', 'cookies', 'data-policy', 'disclaimer', 'accessibility'
  title       text not null,
  content     text not null default '',       -- HTML content
  summary     text,                           -- Short description for OG meta
  is_published boolean not null default false,
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Public read access (these are public pages)
alter table public.legal_pages enable row level security;

create policy "Anyone can read published legal pages"
  on public.legal_pages for select
  using (is_published = true);

create policy "Staff can read all legal pages"
  on public.legal_pages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('national_staff', 'national_admin', 'super_admin')
    )
  );

create policy "Staff can insert legal pages"
  on public.legal_pages for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('national_staff', 'national_admin', 'super_admin')
    )
  );

create policy "Staff can update legal pages"
  on public.legal_pages for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('national_staff', 'national_admin', 'super_admin')
    )
  );

-- Auto-update updated_at
create or replace function public.legal_pages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger legal_pages_set_updated_at
  before update on public.legal_pages
  for each row
  execute function public.legal_pages_updated_at();

-- Seed default pages so they appear in admin immediately
insert into public.legal_pages (slug, title, summary, content, is_published) values
  ('terms', 'Terms of Service', 'Read the Co-Exist Terms of Service governing your participation in conservation events and community features.', '', false),
  ('privacy', 'Privacy Policy', 'Learn how Co-Exist Australia collects, uses, and safeguards your personal information.', '', false),
  ('about', 'About Co-Exist', 'Learn about Co-Exist Australia — a youth-led conservation movement connecting young Australians with nature.', '', false),
  ('cookies', 'Cookie Policy', 'How Co-Exist uses cookies and similar technologies on our website and app.', '', false),
  ('data-policy', 'Data Policy', 'How Co-Exist handles, stores, and protects your data in compliance with Australian privacy law.', '', false),
  ('disclaimer', 'Disclaimer', 'Legal disclaimers for the Co-Exist platform and conservation activities.', '', false),
  ('accessibility', 'Accessibility Statement', 'Our commitment to making Co-Exist accessible to all Australians.', '', false)
on conflict (slug) do nothing;

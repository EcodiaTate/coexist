-- Emergency contacts directory — fully admin-configurable
-- Replaces hardcoded contact data in the frontend

create table if not exists public.emergency_contacts (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,           -- e.g. 'emergency', 'wildlife', 'marine', 'poison', 'ses', 'internal'
  name          text not null,
  phone         text not null,
  note          text,                    -- optional description/role
  states        text[] not null default '{}',  -- AU state codes this applies to, empty = all states
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast lookups by category
create index idx_emergency_contacts_category on public.emergency_contacts (category, sort_order);
create index idx_emergency_contacts_active on public.emergency_contacts (is_active) where is_active = true;

-- RLS
alter table public.emergency_contacts enable row level security;

-- Anyone authenticated can read active contacts
create policy "Authenticated users can read active contacts"
  on public.emergency_contacts for select
  to authenticated
  using (is_active = true);

-- Staff can do everything
create policy "Staff can manage contacts"
  on public.emergency_contacts for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('national_staff', 'national_admin', 'super_admin')
    )
  );

-- Updated_at trigger
create or replace function public.update_emergency_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_emergency_contacts_updated_at
  before update on public.emergency_contacts
  for each row
  execute function public.update_emergency_contacts_updated_at();

-- Seed default contacts
insert into public.emergency_contacts (category, name, phone, note, states, sort_order) values
  -- Emergency Services (all states)
  ('emergency', 'Police, Fire, Ambulance', '000', 'Life-threatening emergencies', '{}', 0),
  ('emergency', 'Mobile Emergency', '112', 'Works without signal in some cases', '{}', 1),
  ('emergency', 'Text Emergency (Deaf/HoH)', '106', null, '{}', 2),

  -- Wildlife Rescue (state-specific)
  ('wildlife', 'WIRES', '1300094737', 'Wildlife rescue', '{NSW}', 0),
  ('wildlife', 'Wildlife Victoria', '0384007300', null, '{VIC}', 1),
  ('wildlife', 'RSPCA QLD', '1300264625', null, '{QLD}', 2),
  ('wildlife', 'RSPCA NSW', '1300278358', null, '{NSW}', 3),
  ('wildlife', 'RSPCA VIC', '0392242222', null, '{VIC}', 4),
  ('wildlife', 'RSPCA SA', '1300477722', null, '{SA}', 5),
  ('wildlife', 'RSPCA WA', '0892099300', null, '{WA}', 6),
  ('wildlife', 'RSPCA TAS', '1300139947', null, '{TAS}', 7),
  ('wildlife', 'RSPCA NT', '1300264625', null, '{NT}', 8),

  -- Marine Wildlife
  ('marine', 'ORRCA Marine Mammal Rescue', '0294153333', 'National', '{}', 0),
  ('marine', 'Marine Rescue NSW', '0280714848', 'Non-emergency', '{NSW}', 1),
  ('marine', 'Great Barrier Reef Strandings', '1300130372', null, '{QLD}', 2),
  ('marine', 'DBCA Marine Wildlife', '0894749055', null, '{WA}', 3),
  ('marine', 'Parks Victoria Marine', '131963', null, '{VIC}', 4),
  ('marine', 'SA Marine Mammal Rescue', '0427556676', null, '{SA}', 5),

  -- Poisoning & Snakebite
  ('poison', 'Poisons Information Centre', '131126', 'Australia-wide, 24/7', '{}', 0),
  ('poison', 'Cairns Snake Removals', '0408331700', '24/7', '{QLD}', 1),
  ('poison', 'Jeremy''s Reptile Relocations', '0403187712', 'Townsville, 24/7', '{QLD}', 2),
  ('poison', 'Sunshine Coast Snake Catchers', '0409536000', '24/7', '{QLD}', 3),
  ('poison', 'Snake Catchers Brisbane', '0413028981', '24/7', '{QLD}', 4),
  ('poison', 'Rapid Response Snake Catchers', '0423866017', 'Gold Coast, 24/7', '{QLD}', 5),
  ('poison', 'Byron Bay Snake Patrol', '0407965092', '24/7', '{NSW}', 6),
  ('poison', 'Byron Bay Snake Catcher (Kane)', '0475256280', '24/7', '{NSW}', 7),
  ('poison', 'Sydney Snakes & Wildlife', '1300762539', '24/7', '{NSW}', 8),

  -- SES & National Parks
  ('ses', 'SES (Storm, Flood, Rescue)', '132500', null, '{}', 0),
  ('ses', 'QLD Parks & Wildlife', '137468', null, '{QLD}', 1),
  ('ses', 'NSW National Parks', '1300361967', null, '{NSW}', 2),
  ('ses', 'Parks Victoria', '131963', null, '{VIC}', 3),
  ('ses', 'Parks WA (DBCA)', '0892190000', null, '{WA}', 4),

  -- Internal contacts (state-specific)
  ('internal', 'Jess Ditchfield', '0400561751', 'South & West Community Manager', '{VIC,SA,WA,TAS,NT}', 0),
  ('internal', 'Louise Court', '0422370226', 'QLD & NSW Community Manager', '{QLD,NSW,ACT}', 1),
  ('internal', 'Charlie Bennet', '0487000605', 'Exec Core', '{}', 2),
  ('internal', 'Kurt Jones', '0456547961', 'CEO', '{}', 3);

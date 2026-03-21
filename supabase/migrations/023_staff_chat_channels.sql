-- ============================================================
-- Migration 020: Staff Chat Channels
-- Adds chat_channels + chat_channel_members for staff-only chats
-- at collective, state, and national levels.
-- Alters chat_messages and chat_read_receipts for channel support.
-- ============================================================

-- Chat channels (staff-only chat rooms)
create table if not exists chat_channels (
  id uuid primary key default gen_random_uuid(),
  -- Channel type determines scope
  type text not null,
  -- For staff_collective: links to a specific collective
  collective_id uuid references collectives(id) on delete cascade,
  -- For staff_state: Australian state code
  state text,
  -- Human-readable name
  name text not null,
  created_at timestamptz not null default now(),
  -- Constraints: ensure correct fields for each type
  constraint chat_channels_type_check check (
    (type = 'staff_collective' and collective_id is not null) or
    (type = 'staff_state' and state is not null) or
    (type = 'staff_national')
  )
);

-- Unique constraints (partial — only one channel per collective/state/national)
create unique index if not exists idx_chat_channels_collective
  on chat_channels(type, collective_id) where type = 'staff_collective';
create unique index if not exists idx_chat_channels_state
  on chat_channels(type, state) where type = 'staff_state';
create unique index if not exists idx_chat_channels_national
  on chat_channels(type) where type = 'staff_national';

-- Channel membership (auto-managed via triggers)
create table if not exists chat_channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references chat_channels(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (channel_id, user_id)
);

create index if not exists idx_chat_channel_members_user on chat_channel_members(user_id);
create index if not exists idx_chat_channel_members_channel on chat_channel_members(channel_id);

-- Add channel_id to chat_messages (nullable, backward compatible)
alter table chat_messages add column if not exists channel_id uuid references chat_channels(id) on delete cascade;
create index if not exists idx_chat_messages_channel on chat_messages(channel_id) where channel_id is not null;

-- Add channel_id to chat_read_receipts (nullable, backward compatible)
alter table chat_read_receipts add column if not exists channel_id uuid references chat_channels(id) on delete cascade;

-- ============================================================
-- RLS Policies
-- ============================================================

alter table chat_channels enable row level security;
alter table chat_channel_members enable row level security;

-- Channels: users can see channels they're a member of
create policy chat_channels_select on chat_channels
  for select using (
    is_admin_or_staff(auth.uid())
    or exists (
      select 1 from chat_channel_members ccm
      where ccm.channel_id = chat_channels.id
        and ccm.user_id = auth.uid()
    )
  );

-- Channel members: users can see their own memberships
create policy chat_channel_members_select on chat_channel_members
  for select using (
    user_id = auth.uid()
    or is_admin_or_staff(auth.uid())
  );

-- Channel members: admin can manage
create policy chat_channel_members_manage on chat_channel_members
  for all using (is_admin_or_staff(auth.uid()));

-- Chat messages with channel_id: only readable if user is in the channel
-- (existing collective_id policies continue to work for non-channel messages)

-- ============================================================
-- Auto-membership triggers
-- ============================================================

-- Trigger function: sync collective role changes to channel membership
create or replace function sync_collective_staff_channels()
returns trigger as $$
declare
  v_collective_state text;
  v_staff_collective_channel uuid;
  v_staff_state_channel uuid;
begin
  -- Get the collective's state
  select state into v_collective_state
  from collectives where id = coalesce(NEW.collective_id, OLD.collective_id);

  -- Get/create staff_collective channel
  select id into v_staff_collective_channel
  from chat_channels
  where type = 'staff_collective' and collective_id = coalesce(NEW.collective_id, OLD.collective_id);

  -- Get staff_state channel
  if v_collective_state is not null then
    select id into v_staff_state_channel
    from chat_channels
    where type = 'staff_state' and state = v_collective_state;
  end if;

  -- Handle INSERT or UPDATE (promotion)
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    if NEW.status = 'active' and NEW.role in ('assist_leader', 'co_leader', 'leader') then
      -- Add to staff_collective channel
      if v_staff_collective_channel is not null then
        insert into chat_channel_members (channel_id, user_id)
        values (v_staff_collective_channel, NEW.user_id)
        on conflict (channel_id, user_id) do nothing;
      end if;

      -- Add to staff_state channel
      if v_staff_state_channel is not null then
        insert into chat_channel_members (channel_id, user_id)
        values (v_staff_state_channel, NEW.user_id)
        on conflict (channel_id, user_id) do nothing;
      end if;
    end if;

    -- Handle demotion to member
    if NEW.role = 'member' or NEW.status != 'active' then
      if v_staff_collective_channel is not null then
        delete from chat_channel_members
        where channel_id = v_staff_collective_channel and user_id = NEW.user_id;
      end if;

      -- Only remove from state channel if not staff in any other collective in that state
      if v_staff_state_channel is not null then
        if not exists (
          select 1 from collective_members cm
          join collectives c on c.id = cm.collective_id
          where cm.user_id = NEW.user_id
            and cm.status = 'active'
            and cm.role in ('assist_leader', 'co_leader', 'leader')
            and c.state = v_collective_state
            and cm.collective_id != NEW.collective_id
        ) then
          delete from chat_channel_members
          where channel_id = v_staff_state_channel and user_id = NEW.user_id;
        end if;
      end if;
    end if;
  end if;

  -- Handle DELETE (removal from collective)
  if TG_OP = 'DELETE' then
    if v_staff_collective_channel is not null then
      delete from chat_channel_members
      where channel_id = v_staff_collective_channel and user_id = OLD.user_id;
    end if;

    if v_staff_state_channel is not null then
      if not exists (
        select 1 from collective_members cm
        join collectives c on c.id = cm.collective_id
        where cm.user_id = OLD.user_id
          and cm.status = 'active'
          and cm.role in ('assist_leader', 'co_leader', 'leader')
          and c.state = v_collective_state
          and cm.id != OLD.id
      ) then
        delete from chat_channel_members
        where channel_id = v_staff_state_channel and user_id = OLD.user_id;
      end if;
    end if;
  end if;

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

create trigger trg_collective_staff_channels
  after insert or update or delete on collective_members
  for each row execute function sync_collective_staff_channels();

-- Trigger function: sync global role changes to national staff channel
create or replace function sync_national_staff_channel()
returns trigger as $$
declare
  v_national_channel uuid;
begin
  select id into v_national_channel
  from chat_channels where type = 'staff_national' limit 1;

  if v_national_channel is null then return NEW; end if;

  -- Promoted to staff+
  if NEW.role in ('national_staff', 'national_admin', 'super_admin') then
    insert into chat_channel_members (channel_id, user_id)
    values (v_national_channel, NEW.id)
    on conflict (channel_id, user_id) do nothing;
  end if;

  -- Demoted to participant
  if NEW.role = 'participant' and OLD.role in ('national_staff', 'national_admin', 'super_admin') then
    delete from chat_channel_members
    where channel_id = v_national_channel and user_id = NEW.id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_national_staff_channel
  after update of role on profiles
  for each row execute function sync_national_staff_channel();

-- Trigger function: auto-create staff channels when collective is created
create or replace function auto_create_staff_channels()
returns trigger as $$
begin
  -- Create staff_collective channel
  insert into chat_channels (type, collective_id, name)
  values ('staff_collective', NEW.id, NEW.name || ' Staff')
  on conflict do nothing;

  -- Create staff_state channel if state is set and doesn't exist
  if NEW.state is not null then
    insert into chat_channels (type, state, name)
    values ('staff_state', NEW.state, NEW.state || ' Staff')
    on conflict do nothing;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_auto_create_staff_channels
  after insert on collectives
  for each row execute function auto_create_staff_channels();

-- ============================================================
-- Seed initial channels
-- ============================================================

-- National staff channel
insert into chat_channels (type, name)
values ('staff_national', 'National Staff')
on conflict do nothing;

-- State channels for existing states
insert into chat_channels (type, state, name)
select distinct 'staff_state', state, state || ' Staff'
from collectives
where state is not null and is_active = true
on conflict do nothing;

-- Collective staff channels for existing collectives
insert into chat_channels (type, collective_id, name)
select 'staff_collective', id, name || ' Staff'
from collectives
where is_active = true
on conflict do nothing;

-- Seed channel members from existing collective_members with staff roles
insert into chat_channel_members (channel_id, user_id)
select cc.id, cm.user_id
from collective_members cm
join chat_channels cc on cc.type = 'staff_collective' and cc.collective_id = cm.collective_id
where cm.status = 'active'
  and cm.role in ('assist_leader', 'co_leader', 'leader')
on conflict do nothing;

-- Seed state channel members
insert into chat_channel_members (channel_id, user_id)
select distinct cc.id, cm.user_id
from collective_members cm
join collectives c on c.id = cm.collective_id
join chat_channels cc on cc.type = 'staff_state' and cc.state = c.state
where cm.status = 'active'
  and cm.role in ('assist_leader', 'co_leader', 'leader')
  and c.state is not null
on conflict do nothing;

-- Seed national channel members
insert into chat_channel_members (channel_id, user_id)
select cc.id, p.id
from profiles p
cross join chat_channels cc
where cc.type = 'staff_national'
  and p.role in ('national_staff', 'national_admin', 'super_admin')
on conflict do nothing;

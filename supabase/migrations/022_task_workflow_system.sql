-- ============================================================
-- Migration 019: Task/Workflow/KPI System
-- Adds task_templates and task_instances tables for recurring
-- staff workflows and KPI tracking per collective.
-- ============================================================

-- Task templates (admin-configured recurring task definitions)
create table if not exists task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  -- null = applies to ALL active collectives
  collective_id uuid references collectives(id) on delete cascade,
  -- Category for grouping/filtering
  category text not null default 'general'
    check (category in ('social_media', 'outreach', 'admin', 'content', 'follow_up', 'general')),
  -- Schedule type
  schedule_type text not null
    check (schedule_type in ('weekly', 'monthly', 'event_relative')),
  -- For weekly: which day (0=Sunday .. 6=Saturday)
  day_of_week int check (day_of_week between 0 and 6),
  -- For monthly: which day of month
  day_of_month int check (day_of_month between 1 and 28),
  -- For event_relative: offset in days (negative=before, positive=after)
  event_offset_days int,
  -- Minimum collective role required to see/complete this task
  assignee_role text not null default 'assist_leader'
    check (assignee_role in ('leader', 'co_leader', 'assist_leader')),
  -- Display ordering
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Task instances (generated from templates for specific periods)
create table if not exists task_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references task_templates(id) on delete cascade,
  collective_id uuid not null references collectives(id) on delete cascade,
  -- For event-relative tasks
  event_id uuid references events(id) on delete cascade,
  -- When this task is due
  due_date timestamptz not null,
  -- Dedup key: "2026-W12" for weekly, "2026-03" for monthly, "event:{id}" for event-relative
  period_key text not null,
  -- Status
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped')),
  -- Completion tracking
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  completion_notes text,
  created_at timestamptz not null default now(),
  -- Prevent duplicate instances for the same template+collective+period
  unique (template_id, collective_id, period_key)
);

-- Indexes for common queries
create index if not exists idx_task_templates_collective on task_templates(collective_id) where is_active = true;
create index if not exists idx_task_templates_schedule on task_templates(schedule_type) where is_active = true;
create index if not exists idx_task_instances_collective on task_instances(collective_id);
create index if not exists idx_task_instances_due on task_instances(due_date) where status = 'pending';
create index if not exists idx_task_instances_template on task_instances(template_id);
create index if not exists idx_task_instances_status on task_instances(collective_id, status);

-- RLS policies
alter table task_templates enable row level security;
alter table task_instances enable row level security;

-- Task templates: staff can read active templates
create policy task_templates_select_staff on task_templates
  for select using (is_admin_or_staff(auth.uid()));

-- Task templates: admin can manage
create policy task_templates_manage_admin on task_templates
  for all using (is_admin_or_staff(auth.uid()));

-- Task instances: collective leaders+ can read their collective's instances
create policy task_instances_select_member on task_instances
  for select using (
    is_admin_or_staff(auth.uid())
    or is_collective_leader_or_above(auth.uid(), collective_id)
    or exists (
      select 1 from collective_members cm
      where cm.user_id = auth.uid()
        and cm.collective_id = task_instances.collective_id
        and cm.status = 'active'
        and cm.role in ('leader', 'co_leader', 'assist_leader')
    )
  );

-- Task instances: collective staff can insert (for lazy generation)
create policy task_instances_insert_staff on task_instances
  for insert with check (
    is_admin_or_staff(auth.uid())
    or exists (
      select 1 from collective_members cm
      where cm.user_id = auth.uid()
        and cm.collective_id = task_instances.collective_id
        and cm.status = 'active'
        and cm.role in ('leader', 'co_leader', 'assist_leader')
    )
  );

-- Task instances: collective staff can update (mark complete)
create policy task_instances_update_staff on task_instances
  for update using (
    is_admin_or_staff(auth.uid())
    or exists (
      select 1 from collective_members cm
      where cm.user_id = auth.uid()
        and cm.collective_id = task_instances.collective_id
        and cm.status = 'active'
        and cm.role in ('leader', 'co_leader', 'assist_leader')
    )
  );

-- Admin can delete task instances
create policy task_instances_delete_admin on task_instances
  for delete using (is_admin_or_staff(auth.uid()));

-- Enable moddatetime extension (idempotent)
create extension if not exists moddatetime with schema extensions;

-- Updated_at trigger for task_templates
create trigger task_templates_updated_at
  before update on task_templates
  for each row
  execute function moddatetime(updated_at);

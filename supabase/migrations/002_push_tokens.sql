-- Push notification token storage
-- Tracks device tokens for FCM push delivery

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android', 'web')),
  device_info jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint push_tokens_user_token_unique unique (user_id, token)
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                            */
/* ------------------------------------------------------------------ */

create index idx_push_tokens_user_id on public.push_tokens(user_id);
create index idx_push_tokens_token   on public.push_tokens(token);

/* ------------------------------------------------------------------ */
/*  Auto-update updated_at                                             */
/* ------------------------------------------------------------------ */

create trigger set_updated_at
  before update on public.push_tokens
  for each row
  execute function public.update_updated_at();

/* ------------------------------------------------------------------ */
/*  RLS                                                                */
/* ------------------------------------------------------------------ */

alter table public.push_tokens enable row level security;

-- Users can read their own tokens
create policy "Users can view own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

-- Users can insert their own tokens
create policy "Users can insert own push tokens"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

-- Users can update their own tokens
create policy "Users can update own push tokens"
  on public.push_tokens for update
  using (auth.uid() = user_id);

-- Users can delete their own tokens
create policy "Users can delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- Service role bypasses RLS automatically (used by edge functions)

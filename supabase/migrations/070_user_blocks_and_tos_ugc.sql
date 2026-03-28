-- ============================================================
-- Migration 070: User blocks table + TOS UGC update
-- Apple App Store Guideline 1.2 (User Generated Content) compliance
-- ============================================================

-- 1. Create user_blocks table
create table if not exists public.user_blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),

  -- Prevent duplicate blocks
  unique (blocker_id, blocked_id),
  -- Prevent self-blocks
  check (blocker_id <> blocked_id)
);

-- Indexes for fast lookups
create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

-- Enable RLS
alter table public.user_blocks enable row level security;

-- Users can view their own blocks
create policy "Users can view own blocks"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

-- Users can create blocks
create policy "Users can create blocks"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

-- Users can unblock
create policy "Users can delete own blocks"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

-- Staff can view all blocks (for moderation)
create policy "Staff can view all blocks"
  on public.user_blocks for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('national_staff', 'national_admin', 'super_admin')
    )
  );


-- 2. Update the Terms of Service in legal_pages to include UGC policy
-- This inserts/updates the terms page with zero-tolerance UGC language
update public.legal_pages
set content = content || E'

<h2>User-Generated Content Policy</h2>
<p>Co-Exist allows users to share messages, photos, and other content within the app. By using these features, you agree to the following:</p>

<h3>Zero Tolerance for Objectionable Content</h3>
<p>Co-Exist has <strong>zero tolerance</strong> for objectionable content or abusive users. The following content is strictly prohibited:</p>
<ul>
  <li>Content that is offensive, abusive, threatening, or harassing</li>
  <li>Hate speech, discrimination, or content targeting individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic</li>
  <li>Sexually explicit or pornographic content</li>
  <li>Content depicting or promoting violence</li>
  <li>Spam, scams, or misleading content</li>
  <li>Content that infringes on intellectual property rights</li>
  <li>Content that promotes illegal activities</li>
</ul>

<h3>Content Moderation</h3>
<p>All user-generated content is subject to moderation. Co-Exist employs both automated systems and human review to identify and remove objectionable content. Content may be filtered or removed without notice.</p>

<h3>Reporting and Blocking</h3>
<p>Users can report objectionable content and block abusive users at any time using the in-app reporting and blocking features. Reported content is reviewed by our moderation team within 24 hours.</p>

<h3>Enforcement</h3>
<p>Users who violate these guidelines will face consequences including but not limited to:</p>
<ul>
  <li>Immediate removal of the offending content</li>
  <li>Temporary or permanent suspension of the user account</li>
  <li>Reporting to relevant authorities where required by law</li>
</ul>
<p>The developer acts on objectionable content reports within 24 hours by removing the content and ejecting the user who provided the offending content.</p>
',
    updated_at = now()
where slug = 'terms';

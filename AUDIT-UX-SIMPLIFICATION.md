# Co-Exist UX Simplification Audit

> Generated 2026-03-31 | Covers every file in `src/` | ~220 source files, ~67,000 lines

---

## Route Map

### Public Routes (no auth)

| Route | Page Component | Purpose | How User Reaches It |
|-------|---------------|---------|-------------------|
| `/welcome` | `welcome.tsx` | Landing page with sign-up/login CTAs | Direct / unauthenticated redirect / catch-all `*` |
| `/signup` | `sign-up.tsx` | Account creation | Welcome > Sign Up |
| `/login` | `login.tsx` | Email/password + social sign-in | Welcome > Log In |
| `/forgot-password` | `forgot-password.tsx` | Password reset request | Login > Forgot password |
| `/reset-password` | `reset-password.tsx` | Set new password | Email link |
| `/verify-email` | `email-verification.tsx` | Check-inbox confirmation | Post-signup redirect |
| `/auth/callback` | `auth-callback.tsx` | Auth redirect handler | Supabase auth redirect |
| `/suspended` | `suspended-account.tsx` | Suspension notice | Auth guard redirect |
| `/accept-terms` | `accept-terms.tsx` | Force TOS acceptance | Auth guard redirect |
| `/event/:id` | `public/event.tsx` | Public event page | Shareable link |
| `/collective/:slug` | `public/collective.tsx` | Public collective page | Shareable link |
| `/download` | `public/download.tsx` | App download landing | External link |
| `/account-deletion` | `public/account-deletion.tsx` | Account deletion request | App store requirement link |
| `/data-deletion` | `public/data-deletion.tsx` | GDPR data deletion | Privacy page link |
| `/terms` | `legal/terms.tsx` | Terms of Service | Footer / settings |
| `/privacy` | `legal/privacy.tsx` | Privacy Policy | Footer / settings |
| `/about` | `legal/about.tsx` | About page | Footer |
| `/accessibility` | `legal/accessibility.tsx` | Accessibility statement | Footer |
| `/cookies` | `legal/cookies.tsx` | Cookie policy | Footer / consent banner |
| `/data-policy` | `legal/data-policy.tsx` | Data policy | Footer |
| `/disclaimer` | `legal/disclaimer.tsx` | Disclaimer | Footer |
| `/design/events` | `design/event-editorial.tsx` | Dev-only design showcase | Direct URL (dev) |

### Onboarding Routes (auth required, bare shell)

| Route | Page Component | Purpose | How User Reaches It |
|-------|---------------|---------|-------------------|
| `/onboarding` | `onboarding/onboarding.tsx` | 7-step new user wizard | Post-signup redirect |
| `/leader-welcome` | `onboarding/leader-welcome.tsx` | Leader promotion welcome | Role change redirect |
| `/welcome-back` | `onboarding/welcome-back.tsx` | Returning user greeting | Auth guard redirect |
| `/map` | `map.tsx` | Full-screen collective map | More menu / deep link |

### Protected Routes (auth required, app shell)

| Route | Page Component | Purpose | How User Reaches It |
|-------|---------------|---------|-------------------|
| `/` | `home.tsx` | Main feed / dashboard | Bottom tab (Home) |
| `/explore` | `events/index.tsx` | Explore events + collectives | Bottom tab (Explore) |
| `/events` | *redirect* | Redirects to `/explore` | Legacy URL |
| `/events/create` | `events/create-event.tsx` | Create new event | Explore > + button / leader dashboard |
| `/events/:id` | `events/event-detail.tsx` | Event detail page | Tap any event card |
| `/events/:id/check-in` | `events/check-in.tsx` | Self-check-in (QR/code) | Event detail > Check In |
| `/events/:id/profile-survey` | `events/profile-survey.tsx` | First-time profile collection | Post-check-in redirect |
| `/events/:id/day` | `events/event-day.tsx` | Leader day-of dashboard | Event detail > Day-of button |
| `/events/:id/impact` | `events/log-impact.tsx` | Log environmental impact | Event detail > Log Impact |
| `/events/:id/survey` | `events/post-event-survey.tsx` | Post-event feedback | Notification / event detail |
| `/events/:id/edit` | `events/edit-event.tsx` | Edit event | Event detail > Edit |
| `/events/:id/ticket-confirmation` | `events/ticket-confirmation.tsx` | Ticket QR + details | Post-purchase redirect |
| `/collectives` | *redirect* | Redirects to `/explore?tab=collectives` | Legacy URL |
| `/collectives/:slug` | `collectives/collective-detail.tsx` | Collective profile | Tap collective card |
| `/collectives/:slug/manage` | `collectives/manage.tsx` | Leader collective management | Collective detail > Manage |
| `/chat` | `chat/index.tsx` | Chat list | Bottom tab (Chat) |
| `/chat/:collectiveId` | `chat/chat-room.tsx` | Collective chat room | Chat list > tap |
| `/chat/channel/:channelId` | `chat/chat-room.tsx` | Staff channel room | Chat list > tap |
| `/tasks` | `tasks/index.tsx` | My tasks | Bottom tab / More |
| `/profile` | `profile/index.tsx` | Own profile | More > Profile |
| `/profile/edit` | `profile/edit-profile.tsx` | Edit profile | Profile > Edit |
| `/profile/tickets` | `events/my-tickets.tsx` | My ticket history | Profile > Tickets |
| `/profile/:userId` | `profile/view-profile.tsx` | Other user's profile | Tap any avatar |
| `/impact` | *redirect* | Redirects to `/profile` | Legacy URL |
| `/referral` | `referral/index.tsx` | Referral code + stats | Profile / settings |
| `/notifications` | `notifications/index.tsx` | Notification list | Bell icon / More |
| `/updates` | `updates/index.tsx` | Announcements feed | More > Updates |
| `/settings` | `settings/index.tsx` | All settings | More > Settings |
| `/contact` | `contact.tsx` | Contact form | More > Contact |
| `/partners` | `partners.tsx` | Partner organisations | More > Partners |
| `/leadership` | `leadership.tsx` | Leadership info page | More > Leadership |
| `/lead-a-collective` | `lead-a-collective.tsx` | Leadership application form | Leadership > Apply |
| `/donate` | `donate/index.tsx` | Donation page | More > Donate / Home CTA |
| `/donate/thank-you` | `donate/thank-you.tsx` | Post-donation confirmation | Stripe redirect |
| `/donate/donors` | `donate/donor-wall.tsx` | Donor recognition wall | Donate > Donors link |
| `/shop` | `shop/index.tsx` | Product catalog | More > Shop / Home CTA |
| `/shop/cart` | `shop/cart.tsx` | Shopping cart | Shop > cart icon |
| `/shop/checkout` | `shop/checkout.tsx` | Checkout + Stripe | Cart > Checkout |
| `/shop/order-confirmation` | `shop/order-confirmation.tsx` | Post-purchase summary | Stripe redirect |
| `/shop/orders` | `shop/orders.tsx` | Order history | Profile > Orders |
| `/shop/orders/:orderId` | `shop/order-detail.tsx` | Single order view | Orders > tap |
| `/shop/:slug` | `shop/product-detail.tsx` | Product detail | Shop > tap product |
| `/reports` | `reports/index.tsx` | Report generation | Leader/Admin dashboard |
| `/impact/national` | `impact/national.tsx` | National impact dashboard | Admin / explore |
| `/learn` | `learn/index.tsx` | Learning module catalog | More > My Journey |
| `/learn/module/:moduleId` | `learn/module.tsx` | Module sections list | Learn > tap module |
| `/learn/section/:sectionId` | `learn/section.tsx` | Read section content | Module > tap section |
| `/learn/quiz/:quizId` | `learn/quiz.tsx` | Take quiz | Section > quiz CTA |
| `/learn/complete` | `learn/complete.tsx` | Module completion | Post-quiz redirect |

### Leader Routes (requires leader access)

| Route | Page Component | Purpose | How User Reaches It |
|-------|---------------|---------|-------------------|
| `/leader` | `leader/index.tsx` | Leader dashboard | More > Leader Dashboard |
| `/leader/events` | `leader/events.tsx` | Leader event management | Leader sidebar |
| `/leader/tasks` | `leader/tasks.tsx` | Leader tasks + todos | Leader sidebar |
| `/leader/reports` | `reports/index.tsx` | Reports (re-export) | Leader sidebar |

### Admin Routes (requires national_leader+)

| Route | Page Component | Purpose |
|-------|---------------|---------|
| `/admin` | `admin/index.tsx` | Admin dashboard |
| `/admin/collectives` | `admin/collectives.tsx` | Manage collectives |
| `/admin/collectives/:id` | `admin/collective-detail.tsx` | Collective deep-dive |
| `/admin/users` | `admin/users.tsx` | User management |
| `/admin/create` | `admin/create.tsx` | Quick-create hub |
| `/admin/updates` | `admin/updates.tsx` | Manage announcements |
| `/admin/tasks` | `admin/workflows.tsx` | Workflow automation |
| `/admin/events` | `admin/events.tsx` | All events |
| `/admin/events/create` | `events/create-event.tsx` | Create event (shared) |
| `/admin/surveys` | `admin/surveys.tsx` | Survey management |
| `/admin/surveys/create` | `admin/create-survey.tsx` | Survey builder |
| `/admin/surveys/:id/edit` | `admin/create-survey.tsx` | Edit survey (same component) |
| `/admin/applications` | `admin/applications.tsx` | Leadership applications |
| `/admin/reports` | `reports/index.tsx` | Reports (shared) |
| `/admin/national-impact` | `impact/national.tsx` | National impact (shared) |
| `/admin/email` | `admin/email/index.tsx` | Email campaigns |
| `/admin/charity` | `admin/charity.tsx` | Charity settings |
| `/admin/exports` | `admin/exports.tsx` | Data exports |
| `/admin/audit-log` | `admin/audit-log.tsx` | Audit log |
| `/admin/system` | `admin/system.tsx` | System health |
| `/admin/branding` | `admin/branding.tsx` | Brand assets |
| `/admin/impact-metrics` | `admin/impact-metrics.tsx` | Impact metric definitions |
| `/admin/impact` | `admin/impact-observations.tsx` | Impact observations |
| `/admin/shop` | `admin/merch/index.tsx` | Merch management (7 tabs) |
| `/admin/partners` | `admin/partners.tsx` | Partner management |
| `/admin/challenges` | `admin/challenges.tsx` | Challenges/gamification |
| `/admin/moderation` | `admin/moderation/index.tsx` | Content moderation |
| `/admin/contacts` | `admin/contacts.tsx` | Contact submissions |
| `/admin/legal-pages` | `admin/legal-pages.tsx` | Legal page CMS |
| `/admin/dev-tools` | `admin/dev-tools.tsx` | Developer tools |
| `/admin/development` | `admin/development/index.tsx` | L&D module management |
| `/admin/development/modules/new` | `admin/development/create-module.tsx` | Create module |
| `/admin/development/modules/:id` | `admin/development/module-detail.tsx` | Module detail |
| `/admin/development/modules/:id/edit` | `admin/development/edit-module.tsx` | Edit module |
| `/admin/development/sections/new` | `admin/development/create-section.tsx` | Create section |
| `/admin/development/sections/:id/edit` | `admin/development/edit-section.tsx` | Edit section |
| `/admin/development/quizzes/new` | `admin/development/create-quiz.tsx` | Create quiz |
| `/admin/development/quizzes/:id/edit` | `admin/development/edit-quiz.tsx` | Edit quiz |
| `/admin/development/results` | `admin/development/results.tsx` | Quiz analytics |

---

## Duplicate Functionality

### 1. Explore Page -- Two Complete Implementations

**Files:**
- `src/pages/events/index.tsx` (913 lines) -- **ACTIVE** (mounted at `/explore`)
- `src/pages/explore.tsx` (730 lines) -- **DEAD** (not mounted in router)
- `src/pages/explore/explore-list-view.tsx` (809 lines) -- DEAD
- `src/pages/explore/explore-map-view.tsx` (171 lines) -- DEAD
- `src/pages/explore/filter-sheet.tsx` (569 lines) -- DEAD
- `src/pages/explore/date-range-selector.tsx` (153 lines) -- DEAD

**Total dead code: 2,432 lines.** The `explore.tsx` page with its 4 sub-files is an older implementation that was replaced by `events/index.tsx`. The router maps `/explore` to the events version. The old one has richer features (PostGIS proximity, people search) that were never integrated into the replacement.

**Recommendation:** Delete all 5 files in `explore/` + `explore.tsx`. If proximity search is wanted, port the hooks to the active page.

### 2. Collectives Discovery -- Duplicated in Two Places

**Files:**
- `src/pages/events/index.tsx` -- Collectives tab (inline, ~200 lines)
- `src/pages/collectives/discover.tsx` (251 lines)

Both show all collectives with search, state filters, and map view. The route `/collectives` redirects to `/explore?tab=collectives`, orphaning the discover page. However, back-navigation from `collective-detail.tsx` may still reach it.

**Recommendation:** Delete `discover.tsx`. Ensure all links point to `/explore?tab=collectives`.

### 3. Sidebar Navigation -- Three Coexisting Implementations

**Files:**
- `src/components/unified-sidebar.tsx` (940 lines) -- **ACTIVE** (used by AppShell)
- `src/components/sidebar-nav.tsx` (119 lines) -- **DEAD** (old sidebar)
- `src/components/sidebar-shell.tsx` (366 lines) -- **DEAD** (old sidebar shell)

`unified-sidebar.tsx` replaced the other two but they were never deleted. Additionally, `unified-sidebar.tsx` itself contains ~300 lines of dead internal components (`SuiteSwitcher`, `MobileSuiteSwitcher`, `DesktopSuiteSwitcher`) that are defined but never rendered.

**Recommendation:** Delete `sidebar-nav.tsx` and `sidebar-shell.tsx`. Remove 3 unused components from `unified-sidebar.tsx` (~300 lines).

### 4. Image Components -- Two Near-Duplicate Blur-Up Loaders

**Files:**
- `src/components/optimized-image.tsx` (135 lines) -- adds `priority`, `fetchPriority`, `wrapperClassName`
- `src/components/progressive-image.tsx` (110 lines) -- adds shimmer fallback when no placeholder

Both implement: blur-up loading, srcset generation, error fallback ("Image unavailable"). Nearly identical purpose.

**Recommendation:** Merge into a single `OptimizedImage` that incorporates the shimmer fallback. Delete `progressive-image.tsx`.

### 5. Stat Card Components -- Three Competing Systems

**Files:**
- `src/components/stat-card.tsx` (129 lines) -- simple stat card, used by referral page
- `src/components/admin-hero-stat.tsx` (161 lines) -- admin stat card with 13 color presets
- `src/components/bento-stats.tsx` (367 lines) -- bento grid stat system with 18 themes

All three display a number + label + trend indicator. The bento system is the most capable and most used.

**Recommendation:** Consolidate into `BentoStatCard` as the single stat card. Replace `StatCard` and `AdminHeroStat` usage sites (few) with `BentoStatCard`.

### 6. Chat Bubble -- Shared Layout Duplicated

**Files:**
- `src/components/chat-bubble.tsx` (611 lines) -- standard + poll + announcement
- `src/components/html-chat-bubble.tsx` (295 lines) -- HTML document in iframe

Both duplicate: avatar rendering, sender name + role badge, `ROLE_COLORS` map, `formatTime` function, long-press handler. ~60 lines of identical layout code.

**Recommendation:** Extract a `ChatBubbleShell` wrapper with the shared avatar/name/time/action layout. Both bubble types compose it.

### 7. Admin Nav Categories -- Defined Twice

**Files:**
- `src/components/sidebar/admin-nav.ts` (96 lines) -- **ACTIVE** (used by unified sidebar)
- `src/components/admin-layout.tsx` lines 255-309 -- **DEAD** (`_adminNavCategories` never used)

**Recommendation:** Delete `_adminNavCategories` from `admin-layout.tsx`.

### 8. Chat Engine -- Structural Clone for Staff Channels

**Files:**
- `src/hooks/use-chat.ts` (1,277 lines) -- collective chat messages, send/edit/delete/pin, realtime, unread
- `src/hooks/use-staff-channels.ts` (556 lines) -- identical patterns for `channel_id` instead of `collective_id`

The message query, realtime subscription, optimistic send, edit, delete, pin, and unread count patterns are structurally identical. Only the filter column differs.

**Recommendation:** Extract a generic `useChatEngine(scope: { collectiveId?, channelId? })` handling all shared logic. ~400 lines removable.

### 9. Impact Aggregation -- Same Summing Logic in 6+ Hooks

**Files:** `use-impact.ts`, `use-admin-dashboard.ts`, `use-admin-collectives.ts`, `use-collective.ts`, `use-leader-dashboard.ts`, `use-profile.ts`, `use-home-feed.ts`

All independently query `event_impact`, sum the same columns, apply the same transforms.

**Recommendation:** Create `useImpactAggregate(scope, id?)` used by all. ~300 lines removable.

### 10. Nearby Events -- Three Overlapping Hooks

**Files:**
- `use-events.ts` -- `useNearbyEvents(limit)` (date-ordered, no geo)
- `use-nearby.ts` -- `useNearbyEvents(location, radius)` (PostGIS)
- `use-home-feed.ts` -- `useUpcomingNearby()` (copy of use-events version)

**Recommendation:** Keep only `use-nearby.ts` version (has PostGIS). Remove the other two.

### 11. Collective Role Check -- Redundant Network Call

**Files:**
- `use-collective-role.ts` (56 lines) -- fetches `collective_members` per-collective
- `use-auth.ts` -- already fetches ALL user's `collective_members` and stores as `collectiveRoles`

10 consumers make a redundant Supabase query for data already in auth context.

**Recommendation:** Replace `useCollectiveRole` body with a lookup into `useAuth().collectiveRoles`. Zero network calls.

### 12. Collective Events -- Two Definitions

**Files:**
- `use-events.ts` -- `useCollectiveEvents(id)` (upcoming only)
- `use-collective.ts` -- `useCollectiveEvents(id, type)` (upcoming or past)

Different query keys prevent cache sharing.

**Recommendation:** Remove the simpler one from `use-events.ts`.

### 13. Profile Search -- Three Implementations

**Files:**
- `use-admin-collectives.ts` -- `useSearchUsers` (name, instagram)
- `use-admin-user-roles.ts` -- `useAdminUserSearch` (name, email)
- `use-search.ts` -- global search includes profiles

**Recommendation:** Extract `useProfileSearch(query, fields)`.

### 14. Collective Scope Selector -- Copy-Paste

**Files:**
- `use-admin-collective-scope.ts` (124 lines)
- `use-leader-collective-scope.ts` (136 lines)

Identical context/provider/consumer pattern. Only difference: admin allows "all".

**Recommendation:** Merge into `useCollectiveScope(mode: 'admin' | 'leader')`.

### 15. `fromDbProduct` Mapper -- Copy-Pasted

**Files:**
- `use-admin-merch.ts` -- `fromDbProduct()`
- `use-merch.ts` -- identical `fromDbProduct()`

**Recommendation:** Extract to `lib/merch-utils.ts`.

---

## Bandaid Patterns

### Auth System

| Location | Bandaid | Real Fix |
|----------|---------|----------|
| `route-guard.tsx:36-42` | 8-second `profileTimeout` safety timer for when profile "never arrives" | Fix the DB trigger that creates profiles on signup; remove the timeout |
| `route-guard.tsx:83-87` | Legacy role aliases (`national_staff`, `national_admin`, `super_admin`) | Run a data migration to standardize roles; remove aliases |
| `route-guard.tsx` (5 places) | Loading spinner JSX copy-pasted verbatim across all 5 guard components | Extract `<GuardSpinner />` component |
| `use-auth.ts` | 8s timeout + retry + upsert-create fallback for missing profiles | Fix the profile creation trigger; it's masking a real bug |
| `chat/index.tsx:24` | Module-scope mutable `hasRedirectedThisSession` flag | Use sessionStorage or a ref in a context provider |
| `chat/index.tsx:306` | `as unknown as Record<string, unknown>` to access `primary_chat_id` | Add `primary_chat_id` to profile type definition |
| `chat-switcher-dropdown.tsx:106-109` | Same `as unknown as` cast for `primary_chat_id` | Same type fix |
| `sidebar-nav.tsx:106-109` | `profile as Record<string, unknown>` for `collective_name` | Add field to type |

### Direct Supabase Calls Bypassing Hook System

| Location | What | Fix |
|----------|------|-----|
| `sign-up.tsx` | Referral code validation | Move to `useReferral` hook |
| `email-verification.tsx` | `supabase.auth.resend` | Move to `useAuth` hook |
| `check-in-sheet.tsx:93-98` | Registration check | Move to event hooks |
| `chat-room.tsx:562-655` | Channel poll/announcement creation | Use mutation hooks (already exist for collective mode) |
| `chat-message-list.tsx:177` | `supabase.rpc(...)` with `try/catch // RPC might not exist yet` | Deploy the RPC, remove the try/catch |
| `events/index.tsx:45-68` | Inline `useHeroStats()` with direct queries | Use `useNationalImpact` (same data) |
| `use-app-update.ts` | Manual `useState` + `setInterval` polling | Use `useQuery` with `refetchInterval` |

### Dead Props / Dead Code Within Files

| Location | What |
|----------|------|
| `bottom-sheet.tsx` | `snapPoints` and `initialSnap` props accepted but never used (prefixed `_`) |
| `page.tsx` | `swipeBack` prop marked `@deprecated`, still in interface |
| `page-transition.tsx` | `mode` prop declared but never used |
| `message-input.tsx` | `onCreateEventInvite` declared in interface but never destructured |
| `qr-scanner.tsx` | `isOffline` prop accepted as `_isOffline`, never used |
| `og-meta.tsx:85-88` | `Array.isArray(jsonLd) ? jsonLd : jsonLd` -- no-op ternary |
| `chat-bubble.tsx` | `allowMultiple` renamed to `_allowMultiple` (unused) in PollCard |
| `pull-to-refresh.tsx` | **Entire component is a disabled no-op** -- accepts `onRefresh` but does nothing |
| `unified-sidebar.tsx` | 3 internal components (`SuiteSwitcher`, `MobileSuiteSwitcher`, `DesktopSuiteSwitcher`) defined but never rendered (~300 lines) |

### CSS / Styling Bandaids

| Location | What | Fix |
|----------|------|-----|
| `login.tsx`, `sign-up.tsx` | `!rounded-2xl !h-[54px] !text-[15px] !font-bold` overrides on Button | Add a `variant="auth"` to Button or adjust the base |
| `collective-map.tsx`, `map/use-map.ts` | CSS injected via `document.head.appendChild(style)` | Use Tailwind or a proper CSS import |
| `query-error-boundary.tsx` | Uses raw Tailwind colors (`gray-700`, `emerald-600`) instead of design tokens | Use `primary-*`, `error-*` tokens |
| `progress-bar.tsx:137-138` | String manipulation converting `bg-*` to `text-*` for SVG stroke | Use a color value map |
| `globals.css` | `prefers-reduced-motion` block appears 3 times (2 identical) | Merge the 2 identical blocks |
| `globals.css` | `.scrollbar-none` utility alongside global `*` scrollbar hiding | Remove the redundant utility |

### Sentry -- Never Initialized

| Location | What |
|----------|------|
| `lib/sentry.tsx` | `initSentry()` is documented but never called from `main.tsx` |
| `lib/sentry.tsx` | 4 of 6 exports are dead: `initSentry`, `captureException`, `captureMessage`, `addBreadcrumb` |
| `main.tsx` | Only `SentryErrorBoundary` and `setUser` are used; error reporting pipeline is inert |

**Fix:** Either call `initSentry()` in `main.tsx` or remove the entire Sentry setup.

### Other

| Location | What | Fix |
|----------|------|-----|
| `top-nav.tsx:50-53` | State update during render to close dropdown on route change | Move to `useEffect` |
| `offline-indicator.tsx` | `useState(() => Date.now())` captures mount time only; stale after hours | Use `Date.now()` in the render or a ref |
| `like-button.tsx:67` | Liked and unliked states use identical `text-primary-400` class | Fix the unlike color |
| `admin-layout.tsx:74` | `isOptsObject` duck-typing with `$$typeof` to distinguish ReactNode from options | Use two separate function signatures |
| `leader-layout.tsx:60` | Same `isOptsObject` pattern | Same fix |
| `sidebar-shell.tsx` | Module-level mutable state (`mountedSuites`, `anySidebarMounted`) for animation | Use a context or ref |
| `use-admin-merch.ts` | Dual-writes `base_price_cents`+`price` and `status`+`is_active` for migration compat | Complete migration 012, drop legacy columns |
| `accept-terms.tsx` | Hardcoded TOS change summary | Fetch from DB or config |
| `map.tsx` | 13 collectives hardcoded with lat/lng, member counts, events | Fetch from DB |
| `public/download.tsx` | Stats hardcoded (5,500+ volunteers) | Fetch from DB |

---

## Navigation Issues

### 1. Orphaned Discover Collectives Page

`/collectives` redirects to `/explore?tab=collectives`, but `collectives/discover.tsx` (251 lines) still exists and may be reachable via back-navigation from `collective-detail.tsx`.

**Fix:** Delete `discover.tsx`. Update all links to use `/explore?tab=collectives`.

### 2. `/impact` Redirect Is Confusing

`/impact` redirects to `/profile` with no explanation. There's a dedicated `impact/index.tsx` page (595 lines) that isn't mounted in the main nav.

**Fix:** Either mount `/impact` as the personal impact page or remove `impact/index.tsx` if it's dead.

### 3. Two Places to Create Updates

- `updates/create.tsx` (623 lines) -- standalone create page
- `admin/updates.tsx` (1,217 lines) -- contains inline create functionality

**Fix:** Use one path. Route admin create to the standalone page, or inline everything.

### 4. Task Pages Overlap

- `tasks/index.tsx` (452 lines) -- member-facing tasks
- `leader/tasks.tsx` (1,661 lines) -- leader tasks with additional todos

Both render task lists with similar UI. The member page is essentially a subset of the leader page.

**Fix:** Extract shared `<TaskList>` component. Leader page composes it with additional todo management.

### 5. Deep Nesting in Admin Development Routes

`/admin/development/modules/:moduleId/edit` is 4 levels deep. Users must navigate: Admin > Development > Module > Edit.

**Fix:** Consider a flatter URL structure (`/admin/dev/module/:id/edit`) and breadcrumbs for orientation.

### 6. Map Page Is Hidden

`/map` exists (587 lines) but isn't in any nav menu. Only reachable via deep links or direct URL.

**Fix:** Either add to nav (More > Map) or consolidate into the explore page's map view.

### 7. Reports Page Dual-Mounting

`reports/index.tsx` is mounted at both `/reports` (standalone) and inside admin/leader layouts. It detects its context via `useIsAdminLayout`/`useIsLeaderLayout` hooks. This works but means two routes point to the same page with different chrome.

**Fix:** Acceptable pattern, but remove the standalone `/reports` route if it's not linked anywhere.

---

## Inconsistent Patterns

### 1. Stat Cards -- Three Components, Inconsistent Usage

| Pattern | Component | Used By |
|---------|-----------|---------|
| Simple stat | `StatCard` | referral page |
| Admin stat with presets | `AdminHeroStat` | admin dashboard |
| Bento grid stat | `BentoStatCard` + `BentoStatGrid` | everywhere else |

**Recommended approach:** `BentoStatCard` everywhere. It's the most capable and widely used.

### 2. Bottom Sheet vs Modal -- No Consistent Pattern

Some flows use `BottomSheet` on mobile + modal on desktop (built into `BottomSheet`). Others render `BottomSheet` everywhere. The `BottomSheet` component handles this automatically, but some pages have inline modals that don't use `BottomSheet`.

**Recommended approach:** Always use `BottomSheet` for overlay forms/confirmations. Let it handle responsive behavior.

### 3. Animation Variants -- Copy-Pasted Per-File

`stagger` and `fadeUp` framer-motion variants are redefined inline in 10+ page files. `admin-motion.ts` exports centralized variants but 7 of 9 exports are unused.

**Recommended approach:** Use `adminVariants()` factory (already exists, already used in admin pages) as the single source. Rename to `motionVariants()` and use app-wide.

### 4. Activity Type Metadata -- 4+ Copies

`ACTIVITY_META` (activity type to color/icon mapping) is independently defined in:
- `events/index.tsx`
- `events/event-hero.tsx` (as `activityToBadge`)
- `explore.tsx` (dead)
- `explore/filter-sheet.tsx` (dead)
- `events/event-detail.tsx` (as `activityAccent`)

**Recommended approach:** Single `ACTIVITY_META` in `lib/constants.ts` or a dedicated `lib/activity-types.ts`.

### 5. Role Rankings -- 4+ Independent Definitions

`ROLE_RANK` (role hierarchy for comparison) is defined locally in:
- `chat/index.tsx`
- `chat/chat-leader-panel.tsx`
- `collectives/manage.tsx`
- `route-guard.tsx`

**Recommended approach:** Single `ROLE_RANK` in `lib/constants.ts`.

### 6. Parallax Hero Pattern -- Copy-Pasted Across 6 Pages

The same parallax background + wave SVG divider pattern appears in: `home.tsx`, `contact.tsx`, `leadership.tsx`, `donate/index.tsx`, `admin/index.tsx`, `shop/index.tsx`.

**Recommended approach:** Extract `<ParallaxHero>` and `<WaveDivider>` components.

### 7. Loading States -- Mostly Consistent But Some Gaps

Most pages use `useDelayedLoading` + `Skeleton` (good). Exceptions:
- `map.tsx` -- custom spinner, no error state
- `admin/index.tsx` -- skeleton but no error fallback
- Several auth pages -- no skeleton (forms are pre-filled, acceptable)

### 8. Error Handling -- QueryErrorBoundary Uses Wrong Colors

`query-error-boundary.tsx` uses raw Tailwind colors (`gray-700`, `emerald-600`, `amber-500`) instead of design system tokens (`primary-*`, `neutral-*`, `error-*`).

---

## Unused / Dead Code

### Dead Files (safe to delete entirely)

| File | Lines | Reason |
|------|-------|--------|
| `src/pages/explore.tsx` | 730 | Not mounted in router |
| `src/pages/explore/explore-list-view.tsx` | 809 | Sub-component of dead explore.tsx |
| `src/pages/explore/explore-map-view.tsx` | 171 | Sub-component of dead explore.tsx |
| `src/pages/explore/filter-sheet.tsx` | 569 | Sub-component of dead explore.tsx |
| `src/pages/explore/date-range-selector.tsx` | 153 | Sub-component of dead explore.tsx |
| `src/components/sidebar-nav.tsx` | 119 | Superseded by unified-sidebar.tsx |
| `src/components/sidebar-shell.tsx` | 366 | Superseded by sidebar/sidebar-shell.tsx |
| `src/types/supabase.ts` | 6,486 | Stale duplicate of database.types.ts, never imported |
| `src/types/database-extensions.ts` | 11 | Empty placeholder, exports nothing |
| `src/lib/open-external.ts` | 16 | 0 imports |
| `src/lib/query-error.ts` | 46 | 0 imports |
| `src/hooks/use-offline-mutation.ts` | 87 | 0 imports |
| **Total** | **~9,563** | |

### Dead Exports (unused but in active files)

| File | Dead Exports |
|------|-------------|
| `lib/validation.ts` | 15 of 21 schemas unused (forms inline their own validation) |
| `lib/admin-motion.ts` | 7 of 9 exports unused (only `adminVariants` + `expandCollapse`) |
| `lib/sentry.tsx` | 4 of 6 exports unused (`initSentry` never called) |
| `lib/impact-metrics.ts` | 4 unused + 3 deprecated re-exports with 1 stale consumer each |
| `lib/constants.ts` | `PHILOSOPHY` (0 uses), `TIERS` (0 uses) |
| `lib/image-utils.ts` | `generateThumbnail` (0 uses) |
| `lib/profanity.ts` | `cleanProfanity` (0 uses) |
| `lib/capabilities.ts` | `CAPABILITY_KEYS` (0 uses), `CapabilityKey` type (0 uses) |
| `types/donations.ts` | `DonationWithProfile` (0 uses) |
| `types/merch.ts` | `ProductCategory`, `OrderItem`, `SalesAnalytics` (0 uses each) |

### Dead Internal Components

| File | Dead Code | Lines |
|------|-----------|-------|
| `unified-sidebar.tsx` | 3 unused suite-switcher components | ~300 |
| `admin-layout.tsx` | `_adminNavCategories` (superseded by `sidebar/admin-nav.ts`) | ~55 |
| `pull-to-refresh.tsx` | Entire component is a no-op passthrough | 30 |

---

## Recommended Consolidations

Prioritized by impact (lines saved + complexity reduced).

### P0 -- Delete Dead Code (~10,000 lines)

1. **Delete 5 dead explore files** + `explore.tsx` (2,432 lines)
2. **Delete `types/supabase.ts`** (6,486 lines) -- stale duplicate
3. **Delete `sidebar-nav.tsx`** + **`sidebar-shell.tsx`** (485 lines)
4. **Delete `types/database-extensions.ts`**, `lib/open-external.ts`, `lib/query-error.ts`, `hooks/use-offline-mutation.ts` (160 lines)
5. **Remove dead components from `unified-sidebar.tsx`** (~300 lines)
6. **Remove `_adminNavCategories` from `admin-layout.tsx`** (~55 lines)
7. **Remove dead props** from `bottom-sheet.tsx`, `page.tsx`, `page-transition.tsx`, `message-input.tsx`, `qr-scanner.tsx`

### P1 -- Merge Duplicates (~2,000 lines saved)

8. **Merge chat engine** -- extract `useChatEngine` from `use-chat.ts` + `use-staff-channels.ts` (~400 lines saved)
9. **Merge `OptimizedImage` + `ProgressiveImage`** into one component (~100 lines saved)
10. **Extract `ChatBubbleShell`** from `chat-bubble.tsx` + `html-chat-bubble.tsx` (~60 lines saved)
11. **Merge collective scope hooks** -- `use-admin-collective-scope.ts` + `use-leader-collective-scope.ts` (~120 lines saved)
12. **Merge stat cards** -- replace `StatCard` + `AdminHeroStat` usage with `BentoStatCard` (~250 lines saved)
13. **Centralize impact aggregation** -- single `useImpactAggregate` (~300 lines saved)
14. **Fix `useCollectiveRole`** to read from auth context (eliminate redundant network calls)
15. **Consolidate nearby events** to single `use-nearby.ts` hook (~100 lines saved)
16. **Extract `fromDbProduct`** to shared `lib/merch-utils.ts`

### P2 -- Extract Shared Patterns (~1,500 lines saved)

17. **Extract `<ParallaxHero>`** component (used by 6 pages)
18. **Extract `<WaveDivider>`** SVG component (used by 8+ pages)
19. **Centralize `ACTIVITY_META`** in one location
20. **Centralize `ROLE_RANK`** in one location
21. **Centralize `stagger`/`fadeUp`** animation variants -- use existing `adminVariants()` factory app-wide
22. **Extract social sign-in buttons** shared between `login.tsx` and `sign-up.tsx`
23. **Extract `<GuardSpinner>`** from `route-guard.tsx` (5 identical copies)

### P3 -- Split God Files (improve maintainability)

24. **`settings/index.tsx` (1,487 lines)** -- split into sub-pages: notifications, privacy, account, blocked users
25. **`leader/tasks.tsx` (1,661 lines)** -- extract `TasksTab`, `TodosTab`, `TaskSheet` components
26. **`leader/index.tsx` (1,471 lines)** -- extract section components
27. **`admin/collective-detail.tsx` (1,457 lines)** -- split into tab files
28. **`home.tsx` (1,257 lines)** -- extract `NextEventCard`, `UpcomingCarousel`, `ImpactSection`, `CtaBentoGrid`
29. **`chat-room.tsx` (1,060 lines)** -- extract `PinnedMessageBar`; consider abstracting collective/channel branching
30. **`admin/create-survey.tsx` (1,635 lines)** -- extract question editor, preview panel
31. **`create-event.tsx` (1,763 lines)** -- extract step components (basics, location, extras, review)
32. **`event-detail.tsx` (1,460 lines)** -- extract `TicketSalesSection`, `InfoChip`, ticket management
33. **`block-editor.tsx` (812 lines)** -- split 6 sub-components into separate files

### P4 -- Fix Bandaids

34. **Initialize Sentry** or remove the entire setup
35. **Fix profile creation trigger** to eliminate the 8s timeout bandaid in auth
36. **Complete merch migration 012** to drop dual-column writes in `use-admin-merch.ts`
37. **Replace `untypedFrom`** at its 31 call sites with properly typed queries
38. **Wire up validation schemas** from `lib/validation.ts` into forms that currently inline validation, or delete the unused schemas
39. **Fetch hardcoded data** from DB: map.tsx collectives, download.tsx stats

---

## Proposed Simplified Flows

### 1. Event Discovery

**Current:** Home (event cards) OR Explore tab (events tab) OR Collectives > Collective > Events OR Chat (event invite cards) OR Notifications (event links). 5 entry points with different card implementations.

**Proposed:** Home shows 1 "next event" card + "See all" link to Explore. Explore is the single canonical events list. All event cards use one shared `<EventCard>` component. All paths funnel to `/events/:id` for detail.

**Steps: Current 3-5 taps** | **Proposed: 2 taps** (Home > See All > Event, or Explore > Event)

### 2. Check-In

**Current:** Event Detail > Check In > (profile survey if first time) > QR scan OR code entry > success > confetti. Also: proximity banner on home > check-in sheet. Also: leader event-day page has separate check-in management.

**Proposed:** Keep both entry points (self-serve and proximity) but share the `CheckInSheet` component for both. Remove the inline confetti from `check-in.tsx` and use the shared `Celebration` component.

**Steps: Current 3-4 taps** | **Proposed: 2-3 taps** (same, but consistent component usage)

### 3. Impact Logging (Leader)

**Current:** Event Detail > Log Impact (848 lines, deeply nested form with species tracker, photos, map, survey questions). Or: Leader Dashboard > Tasks > impact task > Log Impact.

**Proposed:** Same flow, but extract `SpeciesTracker` and `ImpactPhotoUpload` as standalone components to reduce the 848-line page. Auto-navigate from completed task to log-impact page.

**Steps: Current 2-3 taps** | **Proposed: 2 taps**

### 4. Profile Management

**Current:** More > Profile (own profile view) > Edit button > edit-profile page. Also: `profile-survey.tsx` collects similar fields post-check-in. Also: onboarding collects name/photo/interests.

**Proposed:** Unify the profile field definitions. `profile-survey.tsx` and onboarding steps should pre-fill from and save to the same profile update hook. No duplicate field lists.

**Steps: Current 2 taps to edit** | **Proposed: 2 taps** (same, but internally consolidated)

### 5. Settings

**Current:** More > Settings (1,487-line mega-page with everything: notifications, privacy, password, handle, blocked users, account deletion, legal links, logout).

**Proposed:** Split into sections accessible from a settings menu:
- `/settings` -- menu with sections
- `/settings/notifications` -- notification + email preferences
- `/settings/privacy` -- privacy toggles
- `/settings/account` -- password, handle, deletion
- `/settings/blocked` -- blocked users

**Steps: Current 1 tap (but overwhelming)** | **Proposed: 2 taps (but focused)**

### 6. Chat

**Current:** Chat tab > auto-redirect to primary chat (module-scope flag). Chat list shows collectives + staff channels (for staff). Chat room has dual-mode (collective/channel) with pervasive branching.

**Proposed:** Keep chat list as entry. Remove auto-redirect hack (use a default chat preference in settings). Abstract collective/channel differences behind a `useChatEngine` hook so the room component has one code path.

### 7. Leader Dashboard

**Current:** More > Leader Dashboard (1,471 lines). Separate pages for events, tasks, reports via sidebar. Task page is 1,661 lines.

**Proposed:** Keep the structure but extract inline components. Share `<TaskList>` between member tasks page and leader tasks page. Reduce leader/index.tsx by extracting stat sections, event cards, and quick-action grid.

### 8. Admin

**Current:** 30+ admin pages, well-organized via sidebar nav. Some individual pages are too large (collective-detail 1,457, create-survey 1,635, users 1,096) but the routing structure is sound.

**Proposed:** Keep the structure. Priority is splitting the god-files (P3 above), not changing navigation.

---

## Summary

| Category | Count | Est. Lines |
|----------|-------|-----------|
| Dead files to delete | 12 | ~9,563 |
| Dead internal code to remove | 6 instances | ~740 |
| Duplicate systems to merge | 15 groups | ~2,000 saveable |
| Shared patterns to extract | 7 | ~1,500 saveable |
| God files to split (>800 lines) | 11 | ~14,000 total (restructure) |
| Bandaid patterns to fix | 15+ | varies |

**Total estimated lines removable through deletion + deduplication: ~12,000-14,000** (18-21% of the ~67,000 line frontend codebase).

The app's routing structure is fundamentally sound. The main issues are: accumulated dead code from iterations, copy-pasted patterns that should be shared components/hooks, and several pages that grew too large and need decomposition. The legal pages (`LegalPageShell` pattern) and the learn pages are examples of the clean architecture the rest of the app should aspire to.


You are David, a 53-year-old environmental officer at a regional council. You've been sent a link to Co-Exist by a colleague who thinks it could complement council biodiversity monitoring. You need to evaluate whether the data is credible, exportable, and compatible with council GIS systems. You think in spreadsheets and shapefiles, not social feeds.

Explore the Co-Exist app codebase at D:/.code/coexist as a potential institutional partner evaluating data quality. Audit for:
- Data quality controls on wildlife sightings (species validation, photo requirements, location accuracy)
- Export/API capabilities for getting data out in useful formats
- Map and spatial data features — coordinate systems, accuracy indicators
- Duplicate/spam sighting handling
- Taxonomy and species naming standards (common vs scientific names)
- Dashboard or analytics views for aggregate data
- Integration points (API docs, webhooks, data feeds)
- Any bugs, broken flows, or dead ends you find in the code

Output a prioritized list of UX improvements and bugs with file paths and line numbers.


You are David, a 53-year-old environmental officer at a regional council. You've been sent a link to Co-Exist by a colleague who thinks it could complement council biodiversity monitoring. You need to evaluate whether the data is credible, exportable, and compatible with council GIS systems. You think in spreadsheets and shapefiles, not social feeds.

Explore the Co-Exist app codebase at D:/.code/coexist as a potential institutional partner evaluating data quality. Audit for:
- Data quality controls on wildlife sightings (species validation, photo requirements, location accuracy)
- Export/API capabilities for getting data out in useful formats
- Map and spatial data features — coordinate systems, accuracy indicators
- Duplicate/spam sighting handling
- Taxonomy and species naming standards (common vs scientific names)
- Dashboard or analytics views for aggregate data
- Integration points (API docs, webhooks, data feeds)
- Any bugs, broken flows, or dead ends you find in the code

Output a prioritized list of UX improvements and bugs with file paths and line numbers.

30:import { useAuth } from '@/hooks/use-auth'

CRITICAL — Breaks core workflows in the field
1. Photo upload silently fails offline — no queuing
File: src/hooks/use-image-upload.ts, src/lib/image-utils.ts:107-148

Photos go straight to Supabase via XHR with a hardcoded 30-second timeout (image-utils.ts:144). There is zero offline queuing for photos — log-impact action and survey responses are queueable, but the custom_metrics.photos URLs they reference will be empty strings if the upload timed out. You'd submit your whole impact form thinking photos were saved, then sync it and get an impact row with no photo evidence. That's a data integrity hole.

Fix needed: Queue photos locally (IndexedDB blob or Capacitor Preferences), upload on reconnect, then update the impact row's photo URLs. At minimum, block form submission if photos are mid-upload and the device is offline, with a clear message.

2. handleSubmit in log-impact makes live Supabase calls before queueing
File: src/pages/events/log-impact.tsx:434-535

The submit flow does three live network calls before it ever writes to the offline queue:

Race-condition check — supabase.from('event_impact').select(...) (line 442)
supabase.from('survey_responses').upsert(...) (line 466)
syncSurveyImpact(...) which fires additional queries (line 477)
If you go offline mid-form (very likely in the bush), handleSubmit will throw. The useLogImpact mutation is offline-capable (line 512), but the survey and race-check calls above it will fail silently or throw unhandled. You'd lose the whole submission.

Fix needed: Wrap the entire submit in try/catch with an isOffline guard, skip the live race-check when offline (accept the risk), and queue the survey response via queueOfflineAction('survey-response', ...) before falling through to the impact upsert.

3. window.confirm dialogs don't work inside Capacitor WebView
Files: src/pages/events/log-impact.tsx:362, src/pages/events/log-impact.tsx:451

window.confirm is suppressed silently in Android Capacitor WebViews by default (returns false without showing a dialog). The unsaved-data guard on line 362 means tapping the back button while filling in impact data will silently discard everything without any visible prompt. The race-condition overwrite confirm (line 451) will also silently refuse to submit.

Fix needed: Replace both window.confirm calls with a proper in-app modal/sheet confirmation component.

4. PlaceAutocomplete (location search) hits Nominatim live — no offline fallback
File: src/components/place-autocomplete.tsx:80-88

Used during onboarding (src/pages/onboarding/steps/step-location.tsx) and event creation. With no network, it silently returns no results. There's no fallback, no cached results, and no error message — the field just stays empty. For someone 400km from the nearest town, Nominatim lookup of "Bulman NT" or "Beswick" may also fail to return useful results.

Fix needed: Show a clear "No internet — type your location manually" fallback state. Allow plain text entry as a valid location even without a Nominatim match. Also: the Nominatim API requires a User-Agent header identifying the app — missing here, which violates their ToS and can cause rate-limiting.

HIGH — Significant friction or data issues in the field
5. Map tiles have no offline caching — blank map with no signal
File: src/components/map/use-map.ts:118, public/sw.js:69

The service worker explicitly skips Supabase calls. OSM tile URLs (tile.openstreetmap.org) are handled by the "non-hashed static assets" branch, which is network-first with cache fallback. Tiles are only cached after they've been visited online — there's no proactive tile pre-fetching. Out bush, you'll see the zoom controls over a blank grey grid. The GPS area-drawing section on the impact form (log-impact.tsx:810-832) becomes unusable.

Fix needed: Pre-cache NT-region tiles at zoom levels 10–15 as part of the install step for NT users, or implement a "Download map area" feature. At minimum, show a clear "Map unavailable offline" message with the last-known region rather than a silent blank.

6. Upload timeout too short for 3G — 30 seconds for a compressed image
File: src/lib/image-utils.ts:144

xhr.timeout = 30000. On 3G in the NT, a 500KB image can take 2–4 minutes to upload. The timeout fires and you get "Upload timed out. Please try again." — but trying again also fails, so field data is lost. This is the single biggest friction point for evidence-based impact logging.

Fix needed: Increase to at least 120–180 seconds, or better: switch to chunked/resumable uploads (Supabase supports TUS via @supabase/storage-js uploadToSignedUrl with retry).

7. GPS proximity check: enableHighAccuracy: true with 10s timeout — cold GPS fix on old Android
File: src/hooks/use-event-proximity.ts:111-114


const coords = await Geolocation.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10000,
})
On an older Android device in a remote area, a cold GPS fix with high accuracy can take 30–90 seconds (AGPS can't assist without data). The 10s timeout fires with TIMEOUT error, which surfaces a toast but silently disables the proximity check-in prompt. Users never know if they're close enough to check in.

Fix needed: Two-phase approach — first request with enableHighAccuracy: false (fast cell-based), accept it if accuracy < 500m, then optionally refine with high-accuracy in the background. Increase timeout to 30s minimum.

8. Session expiry silently blocks queued sync — no re-auth prompt
File: src/lib/offline-sync.ts:836-845

When offline, JWT tokens expire after ~1 hour. On reconnect, ensureFreshAuth() refreshes via network. But if you're still offline, it fails, and the error message is:

"Session expired. Please sign in again to sync your pending actions."

This appears only as a conflict toast (6s). A user who was offline for 2+ hours (a standard fieldwork day) will miss it, not understand it, and silently lose all their queued impact data when the toast disappears.

Fix needed: Persist an explicit "session expired — your data is safe but you need to sign in" state that survives the toast dismissal. Show it as a persistent banner or badge until resolved.

9. localStorage for all offline storage — 5–10MB limit on Android WebView
File: src/lib/offline-sync.ts:71-75, src/main.tsx:36-46

All offline data — action queue, TanStack Query cache, chat drafts, recent searches — lives in localStorage. On older Android WebViews the limit can be as low as 5MB. The persisted query cache alone can grow large. If storage fills, safeSet() returns false and logs a console.warn (line 179) but shows nothing to the user. Their queued impact action is silently dropped.

Fix needed: Show a visible warning (not just a console warn) when safeSet fails. Implement cache size management — purge old query cache entries before dropping action queue items, since the action queue is far more valuable. Consider migrating to IndexedDB for the query cache.

MEDIUM — UX friction under field conditions
10. Framer Motion parallax on the home hero — will-change-transform on low-end devices
File: src/pages/home.tsx:189-228

The home screen hero uses a three-layer parallax with will-change-transform on all three elements (home.tsx:191,203,217). On a low-end Android (2GB RAM, Mali GPU), this triggers composite layer promotion for three large images simultaneously. Combined with 26 Framer Motion motion. instances counted in this file alone, the home screen will scroll at sub-30fps on older devices. useReducedMotion() is correctly respected, but parallax is not disabled for it — only the scale animation is skipped.

Fix needed: Disable parallax (not just scale) when shouldReduceMotion is true. Consider removing the parallax entirely on mobile (matchMedia('(pointer: coarse)')) — it's a scroll-performance trade-off that isn't worth it on low-end devices.

11. No "draw area" offline feedback — map draws but can't confirm without tiles
File: src/pages/events/log-impact.tsx:811-832

The GPS area drawing section loads MapView inside a Suspense boundary with a skeleton fallback. But with no tile connectivity, the map loads (Leaflet initializes fine) but renders blank grey. There's no message explaining the map is offline. A user who drew an area in a previous session won't know if their drawn area was preserved. The drawnArea state is not persisted to localStorage — only saved on submit.

Fix needed: Show an "Offline - map tiles unavailable" overlay on the map when isOffline is true. Persist drawnArea to localStorage as a draft (like chat drafts) so it survives accidental navigation.

12. Photo evidence isn't queued offline — impact form appears to succeed but photos are empty
(See #1 above — called out separately as a data concern)

When handleAddPhoto fails (network error during upload), the catch {} block at log-impact.tsx:382-384 swallows the error with no visible feedback beyond the upload hook's error state. The photo section doesn't re-render an error unless the caller reads uploader.error, but there's no code in the photo UI to surface it when it's set.

Fix needed: Check uploader.error after the try/catch and surface a visible per-section error message (e.g., "Photo failed — tap to retry").

13. Default map center is Sydney — wrong for NT users
File: src/components/map/use-map.ts:29


export const DEFAULT_CENTER: MapCenter = { lat: -33.8688, lng: 151.2093 } // Sydney
When a user in the NT opens the map or impact form without a cached event location, the map starts centered on Sydney. The event's location_point is used when available (log-impact.tsx:825), but if parseLocationPoint returns null (malformed data), the map jumps to Sydney and shows nothing relevant.

Fix needed: Fall back to the user's cached location from their profile, then to a sensible NT/Australia-wide zoom level (e.g., lat -25, lng 134, zoom 4) rather than Sydney.

LOW — Language, cultural, and data sovereignty gaps
14. No data sovereignty controls on sighting/impact data
Files: src/types/database.types.ts, src/lib/offline-sync.ts

All impact data — species counts, GPS polygons, wildlife sightings, photos — goes straight to Supabase with no field-level access controls visible in the client. There's no is_sensitive, restricted_to_community, or cultural_sensitivity flag on any observation. For a land ranger logging sacred sites, feral animal locations, or threatened species, this matters: data stored without consent controls can be accessed by national admins with no community-level restriction.

The Acknowledgment of Country exists (settings/index.tsx:638-648) — good start. But the data model doesn't follow through.

Recommendation: Add a sensitivity or visibility field to event_impact.custom_metrics at minimum, with options like "community only / collective only / public". This is an AIATSIS Code of Ethics compliance issue for any First Nations partner organisations.

15. "Wildlife sightings" is a built-in metric but there's no sighting type, sensitivity, or species classification
File: src/lib/offline-sync.ts:519-534, src/pages/events/log-impact.tsx:522

wildlife_sightings is stored as a plain integer. No species name, no threat status, no location precision, no sensitivity flag. For a ranger logging a bilby or a quoll, a raw count without context is meaningless for reporting and potentially harmful if locations are inferred.

Recommendation: Replace the integer with a structured array (species name, count, confidence, optionally-flagged location) — similar to the SpeciesTracker already built for tree planting.

16. "Species Planted" label hardcoded — wrong for non-planting activities
File: src/pages/events/log-impact.tsx:99


<h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
  <Leaf size={16} className="text-primary-600" />
  Species Planted
The label says "Species Planted" even for land_regeneration activities which may involve direct seeding, not planting. Minor but feels wrong.

Fix needed: Make the label conditional: "Species Planted" for tree_planting, "Species" for land_regeneration.

17. Impact form uses window.confirm with formal/legalistic English
File: src/pages/events/log-impact.tsx:362

"You have unsaved impact data. Leave this page?"

And the overwrite warning (line 451):

"X already logged impact for this event (date). Do you want to overwrite their submission?"

This language is formal and transactional. For a ranger who's been logging data in the field all day, the phrase "overwrite their submission" is ambiguous — it doesn't convey that the previous record still exists in audit history. Beyond tone, these dialogs don't render on Android Capacitor (see bug #3).

Fix needed: Replace with an in-app sheet using plain, direct language: "Your impact notes haven't been saved. Go back or keep editing?"

18. Offline banner message is vague
File: src/components/offline-banner.tsx:39

"You're offline - some features may be limited"

This doesn't tell Jarrah what specifically is limited right now (photos won't upload, map won't load, PlaceSearch won't work). Context-aware messaging — different text on the impact form vs the chat screen — would reduce confusion.

Summary table
#	Issue	Severity	File
1	Photo uploads not queued offline — empty evidence	Critical	use-image-upload.ts, image-utils.ts
2	handleSubmit makes live calls before offline queue	Critical	log-impact.tsx:434
3	window.confirm silently fails in Capacitor WebView	Critical	log-impact.tsx:362, 451
4	PlaceAutocomplete hits Nominatim live, no offline fallback	Critical	place-autocomplete.tsx:80
5	Map tiles not cached offline — blank grid in field	High	use-map.ts:118, sw.js
6	30s upload timeout too short for 3G	High	image-utils.ts:144
7	GPS cold-fix timeout 10s too short for old Android	High	use-event-proximity.ts:111
8	Session expiry on reconnect loses queue silently	High	offline-sync.ts:836
9	localStorage 5–10MB limit — silent data loss when full	High	offline-sync.ts:179
10	Home hero parallax crushes old Android GPU	Medium	home.tsx:189
11	Map draw area not persisted locally as draft	Medium	log-impact.tsx:811
12	Photo upload error swallowed — no UI feedback	Medium	log-impact.tsx:382
13	Default map center is Sydney — wrong for NT	Medium	use-map.ts:29
14	No data sovereignty controls on impact/sighting data	Low/Policy	offline-sync.ts, DB schema
15	Wildlife sightings stored as bare integer, no species detail	Low	offline-sync.ts:519
16	"Species Planted" label wrong for land_regeneration	Low	log-impact.tsx:99
17	Formal/legalistic confirm dialog language	Low	log-impact.tsx:362
18	Vague offline banner — no context-specific messaging	Low	offline-banner.tsx:39
The offline sync architecture is genuinely solid — 24 action types, idempotent processors, retry logic. The critical gaps are at the edges of that system: photos (binary data, not JSON) never enter the queue, and the submission flow has live network calls that bypass it. Fix those two first and field data integrity improves dramatically.

As Sam — managing 40+ volunteers near Cairns, drowning in spreadsheets, zero patience for stuff that doesn't work.

CRITICAL BUGS (Broken flows right now)
1. Report Builder generates fake data
src/pages/reports/index.tsx:166-176


const csv = 'Metric,Value\n' + Array.from(selectedMetrics).map((m) => `${m},0`).join('\n')
Every value in the CSV export is 0. This is a stub — the report builder doesn't actually query Supabase. A coordinator who generates a report to show their board gets a file full of zeros. The TODO on line 176 confirms the history table doesn't exist either. The "Report History" tab always returns an empty array (line 118: return [] as ReportHistoryEntry[]).

Impact: Presenter shows up to board meeting with a blank report. Instant credibility loss.

2. Exports scope dropdown is cosmetic — does nothing
src/pages/admin/exports.tsx:171, 201-214

The scope dropdown (national vs specific collective) is rendered and wired to state, but no export query uses it. Every members/attendance/impact export queries the full database regardless of selection. A coordinator trying to pull "just our Cairns collective's attendance" gets everyone, nationally.

3. Silent data truncation at 10,000 rows with no warning
src/pages/admin/exports.tsx:152, 206, 220, 237


const EXPORT_ROW_LIMIT = 10_000
Applied to every query, no user-facing message. If you have 12,000 registrations, you get 10,000 with no indication the export is incomplete. A coordinator submitting these to their ACNC report or board won't know.

4. Waitlisted volunteers silently rejected at check-in
src/pages/events/check-in.tsx:179-183


if (registration.status !== 'registered' && registration.status !== 'invited') {
  setErrorKind('not_registered')
  setState('error')
  return
}
A waitlisted person who shows up on the day gets the same "not registered" error as a complete stranger. There's no flow to promote them from the waitlist. A no-show is a no-show and a spot opens up — but the coordinator has no tool to act on it.

5. Check-in window hard-coded to 1 hour before event — no override
src/pages/events/event-detail.tsx:374-378


const earlyWindow = start - 60 * 60 * 1000 // 1 hour before
return now >= earlyWindow && now <= end
If your event starts at 7am and volunteers arrive at 6:30, check-in is closed. The end of the check-in window also silently locks when date_end passes — if there's no date_end set, it auto-assumes 3 hours. No admin can change this window. No warning is shown when check-in becomes unavailable.

HIGH PRIORITY — Major UX gaps
6. Leader Events page: Search icon imported but never rendered
src/pages/leader/events.tsx:11 — Search imported from lucide but no search input exists in the component. The leader events list has no way to find a specific event by name. With 50+ events, filtering only by Upcoming/Past/Draft isn't enough.

7. Event creation: only 3 of 11 steps are validated before you can publish
src/pages/events/create-event.tsx:1430-1441


const canProceed = useMemo(() => {
  switch (step) {
    case 0: return extra.selected_collective_ids.length > 0
    case 1: return form.isBasicsValid
    case 2: return form.isDateValid
    default: return true  // Steps 3-10: always allowed through
  }
}, ...)
Steps 3-10 (location, cover image, capacity, ticketing, visibility, accessibility, invites, review) have no gate. You can publish an event with no location, no image, no capacity — and it's silently accepted. The date validation (line 1450-1458) only catches end < start, not past dates.

8. No event editing — must duplicate + delete to change anything
src/pages/events/event-detail.tsx:325-356

There's a duplicate button and a cancel button, but no top-level "Edit event" link. The edit page exists at /events/:id/edit but it's not surfaced from the event detail view for leaders. If a location changes or a date shifts, the coordinator has to duplicate the event, re-enter everything, delete the original, and re-notify registrants. All registrations are lost.

9. Recurring event recurring_count field exists but isn't used
src/pages/events/create-event.tsx:89, 1484

The data model has recurring_count but it's never sent in the mutation payload. A coordinator sets up a weekly beach cleanup for 8 weeks — they have no confirmation of how many events will be created, and the field is silently ignored.

10. No bulk actions anywhere in the coordinator workflow
Across all admin/leader pages: no multi-select, no bulk role assignment, no bulk message, no batch event publish. Every operation is 1 item = 1 click:

src/pages/collectives/manage.tsx:253-310 — role assignment is per-member, one at a time
src/pages/admin/users.tsx:246-269 — user roles changed individually
src/pages/leader/events.tsx — no bulk cancel/publish for draft events
Onboarding 40 volunteers = 40 separate role assignments.

11. Member search only matches display name, not email
src/pages/collectives/manage.tsx:360


m.profiles?.display_name?.toLowerCase().includes(q)
Can't search "john@gmail.com" to find a member. No filter for role, join date, or activity level. In a collective of 80+ people, finding inactive members to follow up is impossible.

12. Impact CSV export: survey answers exported as JSON blobs
src/pages/admin/exports.tsx:270


JSON.stringify(r.answers)
Survey responses land in the CSV as raw JSON strings. Opening this in Excel gives one unparseable column. Completely unusable without a developer flattening it. A coordinator can't read it.

13. Attendance export: no "checked in" vs "no-show" breakdown in leader view
src/pages/leader/events.tsx:197


const regCount = event.event_registrations?.[0]?.count ?? 0
The event list shows total registered count only. No attended count, no no-show count, no attendance rate. A coordinator can't spot which events have poor turnout without clicking into each one individually.

14. Report History tab is permanently empty
src/pages/reports/index.tsx:113-121

The useReportHistory hook returns [] unconditionally — the report_history table hasn't been created. The tab renders with a loading skeleton and then an empty state. This is a dead end that looks like a loading failure to the user.

MEDIUM PRIORITY — Friction and efficiency
15. No event templates or quick-repeat
No way to save "Standard Beach Cleanup" as a template and re-use it. Every event goes through the full 11-step form. A coordinator running the same event format monthly will go through the same 11 steps 12 times per year.

16. No member CSV import
src/pages/collectives/manage.tsx:414-416 — There's a CSV export, but no import. Members must join individually via invite link. Migrating an existing WhatsApp group of 40 people into Co-Exist requires 40 manual invites.

17. Co-leader can't assign the co-leader role
src/pages/collectives/manage.tsx:265-269


const assignableRoles = (['member', 'assist_leader', 'co_leader'] as CollectiveRole[]).filter(
  (r) => ROLE_RANK[r] < myRank,
)
A co-leader trying to set someone else as co-leader is blocked by the hierarchy check. Only the primary leader can do it. If the leader is unavailable, the org is stuck.

18. Donation tax report may have duplicates
src/pages/admin/exports.tsx:356-366 — groups by email only. One person who donates with two email addresses appears as two separate donors. No deduplication. ACNC submission risk.

19. No notification to coordinator when offline check-in fails to sync
src/pages/events/check-in.tsx:231-237 — Offline check-ins are queued and synced later. If the sync fails server-side (e.g. the person wasn't actually registered), the volunteer coordinator sees "success" on the day and has no idea. There's no failure notification path after sync.

20. No capacity warning on event list
src/pages/leader/events.tsx:247-251 — Events at 90%+ capacity aren't highlighted. A coordinator can't quickly spot which events need a push or which are over-subscribed.

LOW PRIORITY — Polish and accessibility
21. Check-in QR format hardcoded — no versioning
src/pages/events/check-in.tsx:281 — QR must match coexist://event/. Any format change breaks all printed QR codes with no fallback.

22. Manual check-in code logic duplicated in two places
src/pages/events/check-in.tsx:313 — same 6-char code derivation (eventId.replace(/-/g, '').slice(0, 6).toUpperCase()) exists in both check-in.tsx and event-detail.tsx. If one changes, the other breaks silently.

23. No audit trail on exports, role changes, or check-in
Across the entire app: no log of "who exported the member list", "who changed this user's role", "which device checked in this volunteer". src/pages/admin/audit-log.tsx exists but sensitive admin actions aren't wired to it.

24. Date range inputs in exports accept invalid ranges
src/pages/admin/exports.tsx:169-170 — dateStart and dateEnd are free text inputs. No validation that end is after start. An inverted range silently returns empty results.

Prioritised Fix Order
#	Issue	File	Lines	Impact
1	Report builder exports zeros	reports/index.tsx	166-176	CRITICAL
2	Exports scope ignored	admin/exports.tsx	171, 201	CRITICAL
3	Silent 10k row truncation	admin/exports.tsx	152	CRITICAL
4	Waitlist can't check in	events/check-in.tsx	179-183	CRITICAL
5	Hard-coded check-in window	events/event-detail.tsx	374-378	CRITICAL
6	No search on leader events	leader/events.tsx	11, 178-193	HIGH
7	8/11 form steps unvalidated	events/create-event.tsx	1430-1441	HIGH
8	No edit button on event detail	events/event-detail.tsx	325-356	HIGH
9	recurring_count not sent	events/create-event.tsx	89, 1484	HIGH
10	No bulk actions anywhere	manage.tsx, users.tsx, leader/events.tsx	—	HIGH
11	Search by name only	collectives/manage.tsx	360	MEDIUM
12	Survey answers as JSON	admin/exports.tsx	270	MEDIUM
13	No no-show count in list	leader/events.tsx	197	MEDIUM
14	Report history permanently empty	reports/index.tsx	113-121	MEDIUM
15	No event templates	—	—	MEDIUM
16	No member CSV import	collectives/manage.tsx	414	MEDIUM
17	Co-leader role assignment blocked	collectives/manage.tsx	265-269	MEDIUM
18	Donation report duplicates	admin/exports.tsx	356-366	MEDIUM
19	No offline sync failure notification	events/check-in.tsx	231-237	MEDIUM
20	No capacity warnings on event list	leader/events.tsx	247-251	LOW
Bottom line as Sam: Items 1-5 are show-stoppers before I could use this app seriously. The report builder generating zeros is the worst — I'd use this to justify our funding to the board and hand them a blank spreadsheet. The check-in issues would cause scenes at actual events. The lack of bulk actions means I've traded my WhatsApp group for a more expensive WhatsApp group.

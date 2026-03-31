# Co-Exist UX Fix Prompts

Each section below is a self-contained prompt you can paste into a fresh chat.
They are ordered: critical bugs first, then high-impact structural fixes, then patterns/cleanup.

---

## PROMPT 1 — Fix: Report Builder Exports Zeros (Critical)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: The report builder in `src/pages/reports/index.tsx` at lines 166–176 generates a CSV
where every value is hardcoded to 0. The `useReportHistory` hook (lines 113–121) returns an empty
array unconditionally — the report_history table doesn't exist. Users presenting these reports to
boards or funders get blank spreadsheets.

FIXES NEEDED:
1. Replace the stub CSV generation with real Supabase queries that sum the selected metrics from
   `event_impact` (or `event_registrations` for attendance metrics). Each metric in `selectedMetrics`
   should produce an actual aggregate query result.
2. The Report History tab shows a permanent empty state. Either:
   a. Create the `report_history` table in Supabase and insert a row each time a report is generated, OR
   b. Remove the Report History tab entirely until it can be implemented properly — don't show a tab
      that always appears to be loading/empty.
3. Add a visible "Generating report..." loading state while queries run.

Files to change:
- `src/pages/reports/index.tsx` (primary)
- `src/hooks/use-reports.ts` or equivalent (add real query hooks)
```

---

## PROMPT 2 — Fix: Export Scope Ignored + Silent Row Truncation (Critical)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: In `src/pages/admin/exports.tsx`:
1. Line 171 — The scope dropdown (national vs specific collective) is wired to state but NO export
   query uses the selected scope. Every export queries the full database regardless of what the user selects.
2. Lines 152, 206, 220, 237 — `EXPORT_ROW_LIMIT = 10_000` silently truncates results with no
   user-facing warning. A user with 12,000 records gets 10,000 with no indication the export is incomplete.
3. Lines 169–170 — dateStart and dateEnd are free text inputs with no validation. An inverted range
   (end before start) silently returns empty results.

FIXES NEEDED:
1. Wire the scope state to all export queries: when a specific collective is selected, add a
   `.eq('collective_id', selectedScope)` filter to every query.
2. After each export query, check if `data.length === EXPORT_ROW_LIMIT`. If so, show a visible
   warning banner: "Export truncated at 10,000 rows. Apply a date range to get complete data."
3. Validate that dateEnd >= dateStart before running any query. Show an inline error if the range
   is invalid. Disable the export button until the range is valid.

Files to change:
- `src/pages/admin/exports.tsx` (primary)
```

---

## PROMPT 3 — Fix: Waitlist Check-In + Hard-coded Check-In Window (Critical)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM 1: In `src/pages/events/check-in.tsx` lines 179–183, a waitlisted volunteer who shows up
on the day gets the same "not registered" error as a complete stranger. There is no flow to promote
them off the waitlist.

FIX: When `registration.status === 'waitlisted'`, show a different UI: "You're on the waitlist —
the coordinator can confirm your spot." For leaders/admins viewing the check-in page, add a
"Move from waitlist" action that sets the registration status to 'registered' and proceeds with
check-in.

PROBLEM 2: In `src/pages/events/event-detail.tsx` lines 374–378, the check-in window is hardcoded
to open 1 hour before the event start with no admin override. Events that start at 7am lock out
volunteers who arrive at 6:30.

FIX:
1. Add an optional `checkin_window_minutes` field to the event model (default 60).
2. Leaders should be able to set this when creating/editing an event.
3. On the event detail page, add a leader-only "Open check-in now" button that bypasses the window
   for the current session, stored in component state (no need for a DB field for ad-hoc override).
4. Show a visible message when check-in is not yet open: "Check-in opens at [time]" so volunteers
   know when to expect it.

Files to change:
- `src/pages/events/check-in.tsx`
- `src/pages/events/event-detail.tsx`
- `src/pages/events/create-event.tsx` (add the field to the form)
```

---

## PROMPT 4 — Fix: window.confirm Silently Fails in Capacitor WebView (Critical)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `window.confirm` is suppressed silently in Android Capacitor WebViews — it returns false
without showing any dialog. Two places in `src/pages/events/log-impact.tsx` use it:
- Line 362: unsaved-data guard when user taps back
- Line 451: overwrite confirmation when another user already submitted for this event

Both silently fail: the back-nav discards unsaved data with no prompt, and the overwrite check
silently blocks submission.

FIX: Replace both `window.confirm` calls with a proper in-app confirmation sheet. Use the existing
`BottomSheet` component already in the codebase.

For line 362 (unsaved data):
- Intercept back navigation
- Show a BottomSheet with title "Leave without saving?" and two actions: "Keep editing" (close sheet)
  and "Discard changes" (navigate away)

For line 451 (overwrite):
- Show a BottomSheet with: "Impact already logged by [name] on [date]. Replace their submission?"
  and actions: "Keep theirs" (cancel) and "Replace" (proceed with submit)

Also check the rest of the codebase for any other `window.confirm` or `window.alert` calls and
replace them with the same BottomSheet pattern.

Files to change:
- `src/pages/events/log-impact.tsx` (primary)
- Any other files using window.confirm / window.alert
```

---

## PROMPT 5 — Fix: Photo Uploads Fail Offline Silently (Critical)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: Photos uploaded during impact logging go straight to Supabase via XHR with a 30-second
timeout (`src/lib/image-utils.ts:144`). There is zero offline queuing — if the upload fails, the
impact form still appears to succeed but saves empty photo URLs. Additionally:
- The catch block in `src/pages/events/log-impact.tsx:382–384` swallows upload errors with no
  visible UI feedback.
- 30 seconds is too short for 3G (a 500KB image can take 2–4 minutes).

FIXES NEEDED:
1. Increase the XHR timeout in `image-utils.ts` from 30s to at least 120s.
2. In `log-impact.tsx`, after the photo upload try/catch, check if the upload failed and show a
   visible per-photo error state: "Photo failed to upload — tap to retry." Don't allow form
   submission if any photo upload is pending or failed.
3. If `isOffline` is true when the user tries to add a photo, show an immediate clear message:
   "You're offline — photos can't be uploaded right now. Save your other impact data and add photos
   when you have signal."
4. Block the submit button with a tooltip/message if photos are in a failed state.

Files to change:
- `src/lib/image-utils.ts` (timeout increase)
- `src/pages/events/log-impact.tsx` (error surface + offline guard)
- `src/hooks/use-image-upload.ts` (if error state needs exposing)
```

---

## PROMPT 6 — Fix: GPS Timeout Too Short + Map Defaults to Sydney (High)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM 1: `src/hooks/use-event-proximity.ts:111–114` requests GPS with `enableHighAccuracy: true`
and a 10-second timeout. On older Android devices in remote areas, a cold GPS fix can take 30–90
seconds. The timeout fires silently, the proximity check-in prompt never appears, and the user
gets no feedback.

FIX: Use a two-phase approach:
1. First: `enableHighAccuracy: false, timeout: 8000` (fast cell/wifi positioning)
2. If the result accuracy is better than 500m, use it immediately
3. Optionally refine in the background with high-accuracy (don't block the UI)
4. If both fail, show a clear message: "Couldn't get your location — check GPS settings"

PROBLEM 2: `src/components/map/use-map.ts:29` — `DEFAULT_CENTER` is Sydney (`-33.8688, 151.2093`).
When a user in regional Australia opens the map or impact form without a cached event location,
the map jumps to Sydney showing nothing relevant.

FIX: Change the fallback order:
1. Use the event's `location_point` if available
2. Fall back to the user's profile location
3. Fall back to a centre-of-Australia view: `{ lat: -25.0, lng: 134.0, zoom: 4 }`
NOT Sydney.

Files to change:
- `src/hooks/use-event-proximity.ts`
- `src/components/map/use-map.ts`
```

---

## PROMPT 7 — Fix: Offline Session Expiry Loses Queued Data (High)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/lib/offline-sync.ts:836–845` — When a user comes back online after being offline
for 1+ hours, their JWT has expired. `ensureFreshAuth()` fails, and the error appears only as
a 6-second toast: "Session expired. Please sign in again to sync your pending actions." The user
misses the toast, the queue fails silently, and they lose their submitted impact data.

Additionally, `src/lib/offline-sync.ts:71–75` stores all offline data in localStorage, which
has a 5–10MB limit on Android WebView. When `safeSet()` fails (line 179), it only logs a
`console.warn` — no UI feedback. Queued actions can be silently dropped.

FIXES NEEDED:
1. When `ensureFreshAuth()` fails during sync, do NOT dismiss the state after the toast. Persist
   a banner or badge (e.g., on the bottom nav or a sticky banner) that reads: "Sync paused — sign
   in to upload your saved data" that stays visible until the user re-authenticates.
2. On app startup and after re-authentication, automatically retry the pending queue.
3. When `safeSet()` returns false (storage full), show a visible in-app warning — not just
   a console.warn — explaining that storage is full and what the user should do (sync their data
   while online).
4. Prioritize the action queue over query cache when storage is full: clear old query cache
   entries first before considering dropping action queue items.

Files to change:
- `src/lib/offline-sync.ts`
- Add a persistent sync-status indicator component (new, small)
```

---

## PROMPT 8 — Fix: PlaceAutocomplete No Offline Fallback + Nominatim ToS (High)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/components/place-autocomplete.tsx:80–88` calls the Nominatim API live with no
offline fallback. When offline, it silently returns no results with no error message — the
location field just stays empty. Additionally, the Nominatim API requires a `User-Agent` header
identifying the application (their usage policy) — this is missing, which can cause rate limiting.

FIXES NEEDED:
1. Add the required User-Agent header to all Nominatim requests:
   `User-Agent: CoExistApp/1.0 (contact@coexist.org.au)` (use the real contact email)
2. When offline (use the existing `isOffline` from offline context), hide the autocomplete
   dropdown and show a clear message inline: "No internet — type your location manually"
3. Allow the user to type a freeform location string and proceed without a Nominatim match. The
   field should accept plain text as a valid value even without geocoding.
4. Cache the last 10 successful search results in localStorage so recent locations are available
   offline.

Files to change:
- `src/components/place-autocomplete.tsx`
```

---

## PROMPT 9 — Fix: No Edit Button on Event Detail for Leaders (High)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/pages/events/event-detail.tsx:325–356` — There is a Duplicate button and a Cancel
button on event detail, but no "Edit event" link for leaders/admins. The edit page exists at
`/events/:id/edit` but is unreachable from the event detail view. Leaders must duplicate an event,
re-enter all details, delete the original, and manually re-notify registrants just to change a
date or location.

FIX: Add an "Edit event" button/link to the event detail page action menu (the ... menu or the
leader action bar, wherever other leader actions appear). The button should:
- Only be visible to the event's collective leader, co-leaders, and admins
- Navigate to `/events/:id/edit`
- Be positioned near the other management actions (Duplicate, Cancel)

Also verify that `src/pages/events/edit-event.tsx` is fully functional (loads existing event data,
pre-fills the form, saves correctly). If it has issues, fix those too.

Files to change:
- `src/pages/events/event-detail.tsx`
- `src/pages/events/edit-event.tsx` (verify and fix if needed)
```

---

## PROMPT 10 — Fix: Event Creation Form Steps 3–10 Unvalidated (High)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/pages/events/create-event.tsx:1430–1441` — `canProceed` only validates steps 0–2
(collective selection, basics, dates). Steps 3–10 return `true` unconditionally, meaning you can
publish an event with no location, no cover image, no capacity set. Past dates are accepted
(line 1450–1458 only checks end < start, not past dates).

FIXES NEEDED:
1. Step 3 (Location): Require at least a location name or coordinates before allowing proceed.
   If location is optional for the event type, show a clear "No location set" indicator.
2. Step 4 (Cover image): Add a soft warning if no image is set (don't hard-block, but show
   "Events with images get more registrations — add a cover photo?")
3. Step 1 (Basics): Add validation that the event start date is not in the past.
4. Review step: Before the final publish, show a summary checklist with any missing recommended
   fields highlighted (location, image, capacity). The user can still publish but sees what's missing.
5. The `recurring_count` field (line 89) is collected but never included in the mutation payload
   (line 1484). Fix this: include `recurring_count` in the create mutation so recurring events
   actually create the right number of instances.

Files to change:
- `src/pages/events/create-event.tsx`
```

---

## PROMPT 11 — Fix: Co-leader Cannot Assign Co-leader Role (Medium)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/pages/collectives/manage.tsx:265–269` — The assignable roles are filtered by
`ROLE_RANK[r] < myRank`. A co-leader (rank 3) cannot assign the co-leader role (also rank 3)
to another member — only to lower ranks. If the primary leader is unavailable, the collective
is stuck and no one can promote members to co-leader.

FIX: Change the role assignment logic so that:
- Leaders (primary) can assign any role up to and including co-leader
- Co-leaders can assign roles up to and including assist_leader (not co-leader — they shouldn't
  be able to create peers without the leader's approval)
- Or: allow co-leaders to assign co-leader as well, but require confirmation: "This will give
  [name] the same permissions as you. Confirm?"

The fix should update the `assignableRoles` filter and, if needed, the ROLE_RANK constants to
reflect the intended hierarchy.

Files to change:
- `src/pages/collectives/manage.tsx`
- `src/lib/constants.ts` (if ROLE_RANK is defined there)
```

---

## PROMPT 12 — Fix: Survey Answers Exported as Raw JSON in CSV (Medium)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/pages/admin/exports.tsx:270` — Survey responses are exported as
`JSON.stringify(r.answers)` in the CSV. This produces an unparseable JSON blob in a single CSV
cell. Opening in Excel gives one column of unreadable data.

FIX: Flatten survey answers into separate columns in the CSV export:
1. First pass over the data: collect all unique question keys across all responses
2. Create a column per question key
3. For each response row, fill in the answer for each question column (empty string if not answered)

The result should be a properly flat CSV where each survey question is its own column.
If the questions are dynamic (different per event), the export should be scoped to one event
at a time (or one survey at a time) so the column set is consistent.

Also fix `src/pages/admin/exports.tsx:356–366` — the donation tax report groups by email only,
causing one donor with two emails to appear as two records. Add a note in the export UI: "Donors
with multiple emails may appear as separate entries. Review before submitting to ACNC."

Files to change:
- `src/pages/admin/exports.tsx`
```

---

## PROMPT 13 — Fix: Member Search + Attendance View in Leader Pages (Medium)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM 1: `src/pages/collectives/manage.tsx:360` — Member search only matches `display_name`.
Cannot search by email, role, or join date. In a collective of 80+ members, finding a specific
person by email is impossible.

FIX: Extend the search to also match `email` from the profiles join. Add role filter pills
(All / Member / Assist Leader / Co-leader). Optionally add a sort by join date.

PROBLEM 2: `src/pages/leader/events.tsx:11` — The `Search` icon is imported from lucide but
no search input is rendered in the component. The leader events list has no search — with 50+
events, filtering by Upcoming/Past/Draft tabs alone is insufficient.

FIX: Add a search input above the event list that filters by event title.

PROBLEM 3: `src/pages/leader/events.tsx:197` — The event list shows total registered count only
(`event_registrations[0].count`). No attended count, no no-show rate. Coordinators can't spot
poor-turnout events without clicking into each one.

FIX: Add checked-in count alongside registered count. Show as "X checked in / Y registered".
If the event is past, show attendance rate as a percentage. Highlight events with <50% attendance
in a muted warning color.

Files to change:
- `src/pages/collectives/manage.tsx`
- `src/pages/leader/events.tsx`
```

---

## PROMPT 14 — Fix: Settings Page Too Large — Split into Sub-pages (Medium)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/pages/settings/index.tsx` is 1,487 lines — a single mega-page containing
notifications, privacy, account settings, password change, handle change, blocked users,
account deletion, legal links, and logout. It's overwhelming and hard to navigate.

FIX: Split settings into a top-level menu page + sub-pages:

1. `/settings` — list of sections (Notifications, Privacy, Account, Blocked Users)
   each as a tappable row that navigates to the sub-page. Keep Logout here.

2. `/settings/notifications` — all notification + email preference toggles

3. `/settings/privacy` — privacy toggles (who can see profile, activity visibility, etc.)

4. `/settings/account` — password change, handle/username change, account deletion

5. `/settings/blocked` — blocked users list + unblock actions

Add routes for each sub-page. Keep all existing functionality, just reorganize the structure.
Use the existing `Page` shell component for each sub-page with a back button.

Files to change:
- `src/pages/settings/index.tsx` (split into multiple files)
- `src/App.tsx` or router file (add new routes)
```

---

## PROMPT 15 — Fix: Dead Code Deletion — Safe Files to Remove (P0 Cleanup)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

These files are confirmed dead (not imported anywhere, not mounted in the router). Delete them all:

FILES TO DELETE:
- `src/pages/explore.tsx` (730 lines, not mounted in router)
- `src/pages/explore/explore-list-view.tsx` (809 lines, sub-component of dead explore.tsx)
- `src/pages/explore/explore-map-view.tsx` (171 lines, sub-component of dead explore.tsx)
- `src/pages/explore/filter-sheet.tsx` (569 lines, sub-component of dead explore.tsx)
- `src/pages/explore/date-range-selector.tsx` (153 lines, sub-component of dead explore.tsx)
- `src/pages/collectives/discover.tsx` (251 lines, route redirects to /explore?tab=collectives)
- `src/components/sidebar-nav.tsx` (119 lines, superseded by unified-sidebar.tsx)
- `src/components/sidebar-shell.tsx` (366 lines, superseded by sidebar/sidebar-shell.tsx)
- `src/types/database-extensions.ts` (11 lines, empty placeholder, exports nothing)
- `src/lib/open-external.ts` (16 lines, 0 imports)
- `src/lib/query-error.ts` (46 lines, 0 imports)
- `src/hooks/use-offline-mutation.ts` (87 lines, 0 imports)

DO NOT delete `src/types/supabase.ts` (6,486 lines) without first verifying zero imports with grep.
If confirmed zero imports, delete it too.

ALSO remove these dead internal code blocks:
- `src/components/unified-sidebar.tsx` — remove the 3 defined-but-never-rendered components:
  `SuiteSwitcher`, `MobileSuiteSwitcher`, `DesktopSuiteSwitcher` (~300 lines)
- `src/components/admin-layout.tsx` — remove `_adminNavCategories` constant (~55 lines)
- `src/components/pull-to-refresh.tsx` — the component is a no-op passthrough (accepts `onRefresh`
  but does nothing). Either implement it or delete it and remove all usage sites.

After deletion, run the TypeScript compiler and fix any import errors.
```

---

## PROMPT 16 — Fix: Auth Bandaids + Type Casts (P4 Cleanup)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

Fix these specific bandaid patterns:

1. `src/lib/route-guard.tsx:36–42` — 8-second `profileTimeout` safety timer for when the profile
   "never arrives". Investigate and fix the Supabase DB trigger that creates user profiles on
   signup so the timeout is never needed, then remove the timeout.

2. `src/lib/route-guard.tsx:83–87` — Legacy role aliases (`national_staff`, `national_admin`,
   `super_admin`) are checked as fallbacks. Run a data migration to standardize all user roles to
   the current role names, then remove these aliases.

3. `src/lib/route-guard.tsx` — The loading spinner JSX is copy-pasted verbatim across all 5 guard
   components. Extract a `<GuardSpinner />` component and replace all 5 copies.

4. `src/pages/chat/index.tsx:24` — `hasRedirectedThisSession` is a module-scope mutable variable.
   Replace with `sessionStorage.getItem/setItem` or a React ref inside a context provider.

5. `src/pages/chat/index.tsx:306` and `src/components/chat-switcher-dropdown.tsx:106–109` —
   `as unknown as Record<string, unknown>` to access `primary_chat_id`. Add `primary_chat_id` to
   the profile type definition in the database types so the cast is unnecessary.

6. `src/components/top-nav.tsx:50–53` — State update during render to close a dropdown on route
   change. Move this to a `useEffect` with the route as a dependency.

7. `src/lib/sentry.tsx` — `initSentry()` is never called from `src/main.tsx`. Either call
   `initSentry()` in main.tsx to actually enable error reporting, or remove the entire Sentry
   setup (all 6 exports, the file, and any usage of SentryErrorBoundary and setUser).

Files to change:
- `src/lib/route-guard.tsx`
- `src/pages/chat/index.tsx`
- `src/components/chat-switcher-dropdown.tsx`
- `src/components/top-nav.tsx`
- `src/lib/sentry.tsx` (and `src/main.tsx`)
- Relevant Supabase migration files (for the profile trigger fix)
```

---

## PROMPT 17 — Fix: Centralize Shared Constants (Pattern Cleanup)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

Three constants are copy-pasted across multiple files. Centralize them:

1. ACTIVITY_META (activity type to color/icon mapping) exists independently in:
   - `src/pages/events/index.tsx`
   - `src/pages/events/event-hero.tsx` (as `activityToBadge`)
   - `src/pages/events/event-detail.tsx` (as `activityAccent`)

   Create a single authoritative `ACTIVITY_META` in `src/lib/activity-types.ts` (new file) and
   import it in all three locations. Merge any differences between the three versions.

2. ROLE_RANK (role hierarchy for comparison) is defined locally in:
   - `src/pages/chat/index.tsx`
   - `src/pages/chat/chat-leader-panel.tsx`
   - `src/pages/collectives/manage.tsx`
   - `src/lib/route-guard.tsx`

   Move the canonical definition to `src/lib/constants.ts` and import it everywhere.

3. Framer Motion animation variants (`stagger`, `fadeUp`) are redefined inline in 10+ page files.
   `src/lib/admin-motion.ts` already exports an `adminVariants()` factory. Rename it to
   `motionVariants()`, make it usable app-wide, and replace all inline variant definitions with
   imports from it.

Files to change:
- `src/lib/activity-types.ts` (new file)
- `src/lib/constants.ts`
- `src/lib/admin-motion.ts` → rename export to `motionVariants`
- All consumer files listed above
```

---

## PROMPT 18 — Fix: Hardcoded Data Should Come from DB (P4 Cleanup)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

Three places in the app have hardcoded data that should come from the database:

1. `src/pages/map.tsx` — 13 collectives are hardcoded with lat/lng, member counts, and event
   counts. This means the map is always stale and new collectives never appear.
   FIX: Replace with a Supabase query: fetch all collectives that have a `location_point` set,
   include member count and upcoming event count. Use the existing collective hooks if possible.

2. `src/pages/public/download.tsx` — Stats are hardcoded (e.g., "5,500+ volunteers"). These go
   stale immediately.
   FIX: Fetch live counts from Supabase (profiles count, events count, or a pre-computed stats
   row if one exists). Show a loading skeleton while fetching. If the query fails, fall back to
   the hardcoded values rather than showing an error.

3. `src/pages/accept-terms.tsx` — The TOS change summary is hardcoded in the component.
   FIX: Either fetch this from a Supabase config/content table, or at minimum move it to a
   constants file so it's easy to update without touching JSX.

Files to change:
- `src/pages/map.tsx`
- `src/pages/public/download.tsx`
- `src/pages/accept-terms.tsx`
```

---

## PROMPT 19 — Fix: Like Button Color + CSS Bandaids (Polish)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

Fix these small but clearly wrong styling issues:

1. `src/components/like-button.tsx:67` — Both liked and unliked states use identical
   `text-primary-400` class. The unlike state should use a neutral/muted color (e.g.,
   `text-neutral-400`) so there's a visible difference between liked and not-liked.

2. `src/pages/login.tsx` and `src/pages/sign-up.tsx` — Button styles use `!rounded-2xl
   !h-[54px] !text-[15px] !font-bold` with `!important` overrides. Add a `variant="auth"` prop
   to the Button component that applies these styles properly, then use `<Button variant="auth">`
   in both files. Remove the `!important` overrides.

3. `src/styles/globals.css` — `prefers-reduced-motion` block appears 3 times (2 identical).
   Merge the two identical blocks into one.

4. `src/styles/globals.css` — `.scrollbar-none` utility class exists alongside a global `*`
   scrollbar-hiding rule, making the utility redundant. Remove `.scrollbar-none` if it's covered
   by the global rule, or remove the global rule if individual opt-in is preferred.

5. `src/components/query-error-boundary.tsx` — Uses raw Tailwind colors (`gray-700`,
   `emerald-600`, `amber-500`) instead of design system tokens. Replace with the correct design
   tokens: `neutral-700`, `primary-600`, `warning-500` (or whatever the app's token names are).

Files to change:
- `src/components/like-button.tsx`
- `src/components/ui/button.tsx` (add auth variant)
- `src/pages/login.tsx`
- `src/pages/sign-up.tsx`
- `src/styles/globals.css`
- `src/components/query-error-boundary.tsx`
```

---

## PROMPT 20 — Fix: Impact Form — Species Label + Wildlife Sightings Structure (Data Quality)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM 1: `src/pages/events/log-impact.tsx:99` — The section is labelled "Species Planted" with
a Leaf icon for all activity types, including `land_regeneration` which involves direct seeding,
not planting.

FIX: Make the label conditional on the event's activity type:
- `tree_planting` → "Species Planted"
- `land_regeneration` → "Species"
- Other types → "Species" (neutral)

PROBLEM 2: `src/lib/offline-sync.ts:519–534` — `wildlife_sightings` is stored as a plain integer
count. No species name, no threat status, no location precision, no sensitivity flag. A single
number without context is almost useless for ecological reporting.

FIX: Change wildlife sightings to accept a structured array instead of a bare integer:
```ts
type WildlifeSighting = {
  species_name: string      // common name
  scientific_name?: string  // optional
  count: number
  confidence: 'certain' | 'probable' | 'possible'
  location_approximate?: boolean  // flag to obscure exact GPS
}
```

Update the impact form UI to show a repeating sighting entry (similar to the existing
SpeciesTracker component for tree planting). Update the offline sync handler and Supabase schema
accordingly. The existing integer field should be backward-compatible (keep accepting it, but
prefer the structured array when present).

Files to change:
- `src/pages/events/log-impact.tsx`
- `src/lib/offline-sync.ts`
- Relevant Supabase migration (add structured sightings column)
```

---

## PROMPT 21 — Fix: Home Hero Parallax Performance on Low-end Devices (Medium)

```
You are working on the Co-Exist React/TypeScript app at D:/.code/coexist.

PROBLEM: `src/pages/home.tsx:189–228` — The home screen hero uses a three-layer parallax effect
with `will-change: transform` on all three elements simultaneously. On low-end Android devices
(2GB RAM, Mali GPU), this promotes three large images to composite layers causing sub-30fps
scroll performance. `useReducedMotion()` is respected but only skips the scale animation —
parallax itself is not disabled.

FIXES NEEDED:
1. When `shouldReduceMotion` is true, disable parallax entirely (not just scale).
2. Also disable parallax on touch/mobile devices: check
   `window.matchMedia('(pointer: coarse)').matches` — if true, render a static hero image
   instead of the parallax stack.
3. If parallax is active (pointer: fine, no reduced motion), keep the current implementation
   but ensure `will-change: transform` is only applied during active scroll, not statically.

The result: desktop with no reduced motion preference gets parallax; mobile and reduced-motion
users get a clean static hero with no performance cost.

Files to change:
- `src/pages/home.tsx`
```

---

*End of prompts. Total issues addressed: 21 prompts covering all Critical, High, Medium, and Low
priority items from the audit.*

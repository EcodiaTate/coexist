# Co-Exist Build Prompts

> Paste each prompt into a fresh Claude Code chat opened in the `coexist/` directory.
> Each prompt is self-contained with all context needed.
> Work through them in order - each batch depends on the previous ones being complete.
> After each chat completes its work, review the output, then move to the next prompt.

---

## PROMPT 1 - Design System & Component Library

```
Read CLAUDE.md and TODO-MASTER.md sections 2 and 2.5 (Brand Identity & Design System, Component Library).

You are building the complete design system and shared component library for the Co-Exist app - a youth conservation movement app (React + Vite + TypeScript + TailwindCSS v4 + Framer Motion + Lucide icons).

The globals.css file at src/styles/globals.css already has the colour palette defined as @theme tokens. Use those existing tokens - do not redefine them.

Complete these tasks in full production quality:

**Typography:**
- Download and self-host Inter (body) and General Sans (headings) in src/assets/fonts/ - use @font-face declarations in globals.css
- If General Sans is not freely available, use Satoshi or DM Sans Variable as the heading font instead
- Define the full type scale in Tailwind config: h1-h6, body, caption, overline, button text

**Icon System:**
- We're using Lucide React (already installed). Create an `<Icon>` wrapper component at src/components/icon.tsx that accepts name, size (sm/md/lg/xl mapping to 16/20/24/32), colour, and className props
- Create custom conservation icon components in src/assets/icons/ for: tree planting, beach cleanup, habitat restoration, nature walk, wildlife survey, seed collecting, weed removal, waterway cleanup, community garden - these can be simple SVG components

**Complete Component Library** - build ALL of these at src/components/:
Every component must: accept className prop, be fully typed with explicit props interface, handle loading state (skeleton), work at all breakpoints, have aria-labels/roles, respect prefers-reduced-motion.

Build each one with FULL implementation, not stubs:
1. button.tsx - variants: primary, secondary, ghost, danger. Sizes: sm/md/lg. Props: icon, loading, disabled, fullWidth. Icons ALWAYS flex-centered with `items-center justify-center gap-2`.
2. input.tsx - text, email, password, search, textarea variants. Floating label, error state, helper text. 16px font size (prevents iOS zoom).
3. card.tsx - compound component pattern: Card, Card.Image, Card.Badge, Card.Content, Card.Title, Card.Meta. Variants: event, collective, stat, profile, merch, announcement. Pressable with scale(0.98) + shadow change on tap. NEVER generic - each variant is visually distinct with warm shadows, rounded-2xl, gradient overlays.
4. badge.tsx - status badges, category tags. Variants: activity type colours, tier badges.
5. avatar.tsx - user photo with fallback initials. Sizes: xs/sm/md/lg/xl. Online indicator dot. Tier ring colour.
6. modal.tsx - bottom sheet style on mobile, centred modal on desktop. Backdrop blur. Framer Motion spring animation.
7. bottom-sheet.tsx - draggable bottom sheet with spring physics. Handle bar. Snap points. Swipe to dismiss.
8. toast.tsx - success/error/info/warning. Auto-dismiss timer. Slide from top with spring. Global toast provider + useToast hook.
9. skeleton.tsx - shimmer animation loading placeholder. Variants for cards, text lines, avatars, stat cards, lists.
10. empty-state.tsx - illustration slot + title + description + actionable CTA button. Never just "No items found."
11. tab-bar.tsx - segmented control for switching views. Animated indicator that slides between tabs.
12. chip.tsx - filter chips, selectable tags. Selected/unselected states. Dismiss button variant.
13. progress-bar.tsx - linear and circular variants. Animated fill. Milestone markers.
14. stat-card.tsx - large bold number + label + trend arrow. Subtle gradient bg. CountUp animation on mount.
15. list-item.tsx - standard list row with left icon/avatar, title, subtitle, right chevron or value.
16. divider.tsx - section dividers with optional centred label.
17. header.tsx - page header with back button, title, optional right action buttons. Safe area aware.
18. dropdown.tsx - mobile-friendly picker/select. Bottom sheet on mobile, popover on desktop.
19. toggle.tsx - switch component for settings. Animated thumb slide.
20. checkbox.tsx and radio.tsx - form controls with brand styling.
21. date-picker.tsx - mobile-native date/time selection. Uses native input on mobile, custom picker on desktop.
22. map-view.tsx - wrapper placeholder for Mapbox/Leaflet (just the container + loading state for now).
23. photo-grid.tsx - masonry/grid layout for event photos. 2-col on mobile, 3-col on tablet, 4-col on desktop.
24. count-up.tsx - animated number counter. Configurable duration, easing, decimal places. Triggers on viewport entry.
25. pull-to-refresh.tsx - native-feel pull-to-refresh wrapper with nature-themed animation (leaf or seedling).
26. chat-bubble.tsx - message bubble with directional tails. Sent (primary bg) vs received (neutral bg). Photo variant. Reply quote. Role badge. Timestamp.
27. message-input.tsx - chat text input with send button, attachment button, auto-grow textarea.
28. user-card.tsx - tappable mini-profile popup: avatar with tier ring, name, pronouns, insta handle (tappable), collective badge, location mini-map placeholder, quick stats.
29. map-pin.tsx - custom styled Co-Exist branded map pin component. Pulse animation variant for selected state. Activity type variant with icon.
30. confirmation-sheet.tsx - destructive action confirmation bottom sheet. Red action button + cancel. Used for all destructive actions app-wide.

Also create:
- src/components/index.ts - barrel export for all components
- src/lib/cn.ts - move the cn() utility here if not already (clsx + tailwind-merge)

Focus on pixel-perfect, non-generic, crafted UI. Warm shadows, smooth animations, the sage green palette, rounded corners. This should look and feel premium - like a well-funded startup's app, not a template. Every card variant should be visually distinctive.

Test that the project builds without errors when done: run `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 2 - Database Schema & Supabase Config

```
Read CLAUDE.md and TODO-MASTER.md section 3 (Database Schema & Supabase Config).

You are building the COMPLETE Supabase database schema for the Co-Exist app - a youth conservation movement app. The schema must be production-ready, fully typed, and include all RLS policies, functions, triggers, and storage config.

Generate a single comprehensive SQL migration file at supabase/migrations/001_initial_schema.sql that I can paste into the Supabase SQL editor.

**Enums** (3.2): Create all enum types:
- activity_type, user_role, event_status, registration_status, collective_role, order_status, report_status, promo_type, announcement_priority, announcement_target

**All 41 Tables** (3.1.1 through 3.1.41): Create every table with proper data types, constraints, foreign keys, indexes, and defaults. Key tables include:
- profiles (extends auth.users), collectives, collective_members, events, event_registrations, event_invites, event_impact, impact_species, impact_areas (PostGIS)
- badges, user_badges, points_ledger, notifications, posts, post_likes, post_comments, content_reports
- chat_messages (with reply_to_id self-ref), chat_read_receipts
- surveys, survey_responses, partner_offers, offer_redemptions
- challenges, challenge_participants, donations, recurring_donations
- merch_products, merch_inventory, merch_orders, promo_codes, product_reviews
- invites (referrals), global_announcements, announcement_reads
- staff_roles, audit_log, organisations, event_organisations
- event_series, feature_flags

Use PostGIS geography(Point, 4326) for all location columns. Use JSONB for flexible data (custom_metrics, questions, answers, variants, items, shipping_address, permissions, criteria, recurrence_rule).

**Row Level Security** (3.3): Enable RLS on every table. Write policies for:
- profiles: any authenticated read, own update, admin update any
- collectives: public read, leader/admin write
- events: public read for public events, leader create/edit for own collective
- event_registrations: users manage own, leaders read collective's
- chat_messages: collective members only read+write, leaders can delete/pin
- notifications: own only
- donations/orders: own read, admin read all
- global_announcements: all authenticated read, staff/admin write
- staff_roles: super_admin only
- audit_log: super_admin read only
- All other tables with appropriate policies

**Database Functions** (3.4): Create all functions:
- Trigger: auto-create profiles row on auth.users insert
- get_user_impact_stats(user_id), get_collective_stats(collective_id), get_national_stats()
- award_points(user_id, amount, reason, event_id)
- check_badge_criteria(user_id)
- Trigger: event registration capacity check + auto-waitlist
- Trigger: on cancel → promote waitlist
- get_leaderboard(collective_id, period), get_collective_leaderboard(period)
- get_charity_impact_report(date_from, date_to, scope)
- Trigger: merch order → decrement inventory
- Trigger: low stock notification
- invite_collective_to_event(event_id, collective_id)

**Storage Buckets** (3.5): Document the storage bucket config (can't create via SQL, but list the config as comments):
- avatars, event-images, post-images, collective-images, badges, chat-images, merch-images, chat-voice, chat-video, impact-evidence

**Indexes**: Add indexes on all foreign key columns, commonly queried columns (user_id, collective_id, event_id, created_at, status), PostGIS spatial indexes (GIST).

**Important notes**:
- Enable PostGIS extension
- Enable pgcrypto for uuid generation
- Use uuid_generate_v4() as default for all id columns
- Add created_at with default now() and updated_at where appropriate
- All timestamps as timestamptz
- Add CASCADE where FK deletion should cascade (e.g. user deletes → their registrations delete)

Also generate the TypeScript types file at src/types/database.types.ts - manually create the type definitions for all tables matching what `supabase gen types typescript` would output. Include the Database interface with public schema, all table Row/Insert/Update types, and enum types.

The SQL must be valid, executable in one go in the Supabase SQL editor, and complete. Do not leave any TODOs or placeholders.
```

---

## PROMPT 3 - Authentication & Onboarding + Roles

```
Read CLAUDE.md and TODO-MASTER.md sections 4, 5, and 49.

You are building the complete authentication system, onboarding flows, and role/permission system for the Co-Exist app (React + Vite + TypeScript + Supabase + TailwindCSS + Framer Motion).

The component library from src/components/ is already built. The database schema is ready with profiles, collectives, collective_members tables and all enums. Import and use the existing components (Button, Input, Card, Avatar, etc.) - do NOT rebuild them.

**Auth Infrastructure:**
1. src/hooks/use-auth.ts - comprehensive auth hook:
   - Supabase auth state listener (onAuthStateChange)
   - Auto-fetch profile from profiles table on login
   - Expose: user, profile, session, role, isLeader(collectiveId), isAssistLeader(collectiveId), isCoLeader(collectiveId), isStaff, isAdmin, isSuperAdmin, isLoading, signUp, signIn, signInWithGoogle, signInWithApple, signInWithMagicLink, signOut, resetPassword, updatePassword
   - Handle suspended account state (check is_suspended on profile fetch)
   - Account merge: Supabase identity linking when same email used with different providers

2. src/hooks/use-collective-role.ts - per-collective role checking from collective_members table

3. src/components/role-gate.tsx - conditionally renders children based on role:
   - Props: minRole (collective role or global role), collectiveId (optional), fallback (optional)
   - Uses useAuth + useCollectiveRole

4. src/components/route-guard.tsx - route-level auth/role protection:
   - RequireAuth - redirects to /login if not authenticated
   - RequireRole - checks global role minimum
   - RequireCollectiveRole - checks collective-specific role

5. Auth state persistence for Capacitor using @capacitor/preferences

**Auth Screens** (src/pages/auth/):
6. welcome.tsx - splash/landing with Co-Exist logo (black text on white), tagline "Explore. Connect. Protect.", nature background, "Get Started" + "I have an account" buttons. Beautiful, not generic.
7. sign-up.tsx - email, password, display name, agree to terms checkbox. Social auth buttons (Google, Apple).
8. login.tsx - email + password, social buttons, forgot password link, magic link option.
9. forgot-password.tsx - email input, send reset link, success confirmation.
10. email-verification.tsx - "Check your inbox" with animated envelope, resend button.
11. suspended-account.tsx - "Account suspended" screen showing reason, appeal contact (hello@coexistaus.org).

**Onboarding Flow** (src/pages/onboarding/):
12. Complete multi-step onboarding flow with Framer Motion AnimatePresence transitions:
    - Step 1: Profile photo (camera/gallery upload via Capacitor or file input on web, with crop)
    - Step 2: Name + Instagram handle
    - Step 3: Location (address search → PostGIS point stored)
    - Step 4: Interests (multi-select chips: tree planting, beach cleanups, wildlife, habitat restoration, etc.)
    - Step 5: Join a Collective (show nearby collectives based on location, join or skip)
    - Step 6: Find your first event (upcoming events near them, one-tap RSVP or skip)
    - Progress dots showing current step
    - "Skip for now" on each step
    - Animated slide transitions between steps
    - "You're all set!" celebration screen at end

13. New leader onboarding (src/pages/onboarding/leader-welcome.tsx):
    - Welcome screen after role assignment
    - Quick tour tooltips of leader tools
    - Create first event guided prompt

14. Returning user re-engagement (src/pages/onboarding/welcome-back.tsx):
    - "Welcome back" screen for inactive 30+ days
    - Show missed events, new badges, collective activity
    - Suggest next event

**App Routing** - update src/App.tsx with full route structure:
- Public routes: /login, /signup, /forgot-password, /verify-email
- Onboarding: /onboarding (guarded: redirect if already completed)
- Protected routes wrapped in RequireAuth
- Leader routes wrapped in RequireCollectiveRole
- Admin routes wrapped in RequireRole(national_staff)
- Lazy-loaded page imports

All auth screens must be beautifully styled, mobile-first (44px touch targets, bottom CTAs), with smooth Framer Motion transitions. Use the existing component library. The welcome/splash screen is the first thing users see - it must be stunning.

Test that the project builds: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 4 - App Shell, Navigation & Layout

```
Read CLAUDE.md and TODO-MASTER.md sections 6 and 39.

You are building the app shell, navigation system, and responsive layout for the Co-Exist app (React + Vite + TypeScript + TailwindCSS + Framer Motion + Capacitor).

The auth system, components, and routing are already in place. Build on top of them.

**Layout System:**
1. src/hooks/use-layout.ts - detects:
   - Platform: native (Capacitor) vs web
   - Viewport: mobile (<640px), tablet (640-1024px), desktop (>1024px)
   - Returns: isMobile, isTablet, isDesktop, isNative, isWeb, navMode ('bottom-tabs' | 'sidebar' | 'top-nav')

2. src/hooks/use-platform.ts - Capacitor.isNativePlatform() wrapper + platform-specific feature flags (haptics, camera, push, biometrics, native share)

**App Shell Components:**

3. src/components/app-shell.tsx - the root layout wrapper:
   - Mobile: bottom tab bar + scrollable content area + safe area padding
   - Tablet: bottom tabs or collapsible sidebar + content
   - Desktop (web): top nav bar + sidebar + content area (max-width container)
   - Handles safe area insets (notch, home indicator, Android nav bar) via CSS env()
   - Status bar styling integration

4. src/components/bottom-tab-bar.tsx:
   - Tabs: Home, Explore, My Events, Community, Profile
   - Icons: filled when active, outlined when inactive (Lucide)
   - Labels below icons
   - Badge count on Community tab (unread chat + notifications)
   - Haptic feedback on tap (Capacitor Haptics when native)
   - Tab bar height: 56px + safe-area-inset-bottom
   - Framer Motion: icon bounce on selection
   - Leader view: floating "+" FAB button above tab bar for create event
   - Announcements bell icon in top-right of screen header with unread dot
   - NEVER shown on desktop web

5. src/components/top-nav.tsx - desktop web only:
   - Co-Exist logo left
   - Nav links centre: Home, Explore, Events, Community
   - Right: notification bell, avatar dropdown (profile, settings, admin if role, logout)
   - Sticky top

6. src/components/sidebar-nav.tsx - desktop web + admin dashboard:
   - Collapsible sidebar
   - User info at top (avatar, name, collective)
   - Nav sections: main nav, leader tools (if leader), admin (if staff+)
   - Active state indicator

7. src/components/web-footer.tsx - web only (NOT shown in Capacitor native):
   - Co-Exist logo
   - Aboriginal and Torres Strait Islander acknowledgment
   - Links: About, Privacy, Terms, Contact, Instagram, Facebook
   - "Download the app" with App Store + Play Store badges
   - © Co-Exist Australia Ltd

8. src/components/page.tsx - standard page wrapper:
   - Props: header (optional Header component), footer (optional sticky bottom CTA), scrollable content area
   - Handles padding, safe areas, scroll restoration

**Page Transitions:**
9. Framer Motion page transition wrapper:
   - Push navigation: slide from right (250ms)
   - Pop navigation: slide from left
   - Tab switch: crossfade (150ms)
   - AnimatePresence with mode="wait"

**Responsive Behaviour:**
- Mobile: full-width content, bottom tabs, no sidebar
- Tablet: optional two-column layouts, bottom tabs or side nav
- Desktop: max-width 1280px centred container, top nav, sidebar for admin, no bottom tabs
- All transitions respect prefers-reduced-motion

**Splash Screen:**
10. src/pages/splash.tsx - Co-Exist logo (black text on white), brief animation (logo fade in, tagline reveal), auto-dismiss after 1.5s or when auth state resolves (whichever is later)

Update src/App.tsx to wrap everything in the AppShell, with proper route structure and layout switching.

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 5 - Home Feed & Explore

```
Read CLAUDE.md and TODO-MASTER.md sections 7 and 28.

Build the home/discovery feed and explore/search pages for the Co-Exist app. All components from src/components/ are available. Auth hooks, layout hooks, and Supabase client are ready. Import and use existing components.

**Home Feed** (src/pages/home.tsx - replace the existing placeholder):
1. Greeting with user's first name + time of day ("Good morning, Sarah") - with contextual variations from §53.2.1 if data available
2. Latest announcement banner (if urgent/pinned announcements exist) - tappable → announcements feed
3. Hero section - featured event or campaign banner (horizontal carousel if multiple)
4. "Upcoming near you" - horizontal scroll of event cards (location-based query via PostGIS ST_DWithin, or all if no location set)
5. "Your Collective" card - shows next event in user's collective + quick stats (members, events this month). If not in a collective, show "Find your collective" CTA
6. "Your Impact" - compact stat bar: events attended, trees planted, hours volunteered (from get_user_impact_stats)
7. "National Challenge" - active challenge card with progress bar (if any active challenge)
8. "Trending Collectives" - horizontal scroll for users not yet in a collective
9. "People you may know" - horizontal avatar scroll of suggested connections (shared collective or shared events)
10. Category quick-filter chips - activity types for filtering nearby events
11. Pull-to-refresh (using PullToRefresh component)
12. Skeleton loading state for each section
13. Empty state for new users (guided CTAs: join collective, find event)
14. All data fetched with TanStack Query hooks (create src/hooks/use-home-feed.ts with all the queries)

**Explore / Search** (src/pages/explore.tsx):
1. Global search bar at top - searches across events, collectives, users
2. Recent searches / search suggestions
3. Category quick-filter chips
4. Results displayed:
   - Default: map view showing nearby collectives and events with custom Co-Exist branded pins
   - Toggle between map view and list view
   - Results grouped by type (events, collectives, people)
5. Filter bottom sheet:
   - Activity type multi-select chips
   - Date range picker
   - Distance radius slider
   - State/region dropdown
6. Active filter chips shown above results with clear-all option
7. Empty search state with suggestions

Create all necessary TanStack Query hooks in src/hooks/:
- use-home-feed.ts - all home feed data queries
- use-search.ts - debounced search, recent searches (persisted to localStorage)
- use-nearby.ts - location-based queries for events and collectives

Each section on the home feed should use the styled card variants from the component library. Event cards use Card variant="event", stat sections use StatCard, etc.

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 6 - Event System (Participant + Leader)

```
Read CLAUDE.md and TODO-MASTER.md sections 8, 9, and 30-31.

Build the COMPLETE event system for Co-Exist - both participant-facing and leader tools. This is a core feature. Use existing components from src/components/ and hooks from src/hooks/.

**Event Discovery** (already partially in explore, but dedicated views):
1. src/pages/events/index.tsx - My Events page with tabs: Upcoming | Invited | Past
   - Event cards showing date, title, collective, status badge (registered/waitlisted/attended/invited)
   - Quick action: cancel registration (swipe or long-press → confirmation sheet)
   - Tap → event detail

2. src/pages/events/event-detail.tsx - FULL event detail page:
   - Cover image hero with parallax scroll effect
   - Event title, date/time with countdown ("Starts in 2 days"), duration
   - Activity type badge
   - Location with custom styled map pin + "Get Directions" (opens native maps via Capacitor)
   - Collective hosting info (tappable → collective page)
   - Partner/sponsor logos if tagged (tappable → organisation)
   - Description (expandable)
   - "What to bring" / "What to expect" / "What to wear" section
   - Accessibility info: wheelchair access, terrain type, difficulty rating, facilities
   - Attendee count + capacity ("23/30 spots filled") with avatar row
   - Weather display for event location (placeholder - just the UI component with mock data)
   - Carpooling section if enabled ("Lift offered" / "Lift needed")
   - Register button - sticky bottom CTA
   - States: can register, registered ("You're going!"), waitlisted, event full, invited (who invited), past event, cancelled
   - Share button (native share sheet), Add to calendar button
   - Post-event: impact summary section + photo gallery + survey prompt

3. src/hooks/use-events.ts - all event queries:
   - useMyEvents(status), useEventDetail(id), useEventRegistration(eventId)
   - useRegisterForEvent(), useCancelRegistration()
   - useNearbyEvents(location, radius), useCollectiveEvents(collectiveId)

**Event Check-in:**
4. src/pages/events/check-in.tsx:
   - QR code scanner (Capacitor Barcode Scanner)
   - Manual code entry fallback
   - Check-in confirmation with confetti animation + points notification
   - Offline check-in: queue and sync when back online

**Calendar Integration:**
5. "Add to Calendar" generates .ics file or uses Capacitor Calendar plugin
6. Google Calendar and Apple Calendar deep links

**QR Code System:**
7. QR generation for membership cards (qrcode.react) and event check-in codes
8. QR scanner component wrapping Capacitor Barcode Scanner

**Leader Event Tools:**

9. src/pages/events/create-event.tsx - multi-step wizard:
   - Step 1: Basics - title, activity type dropdown, description
   - Step 2: Date & Time - start/end datetime pickers, recurring event option (weekly/fortnightly/monthly series creation)
   - Step 3: Location - address search + draggable map pin
   - Step 4: Details - capacity, what to bring, meeting point notes, accessibility info (wheelchair, terrain, facilities), difficulty rating, what to wear
   - Step 5: Cover Image - upload from camera/gallery
   - Step 6: Visibility - public or collective-only
   - Step 7: Invite - option to auto-invite all collective members
   - Step 8: Partner - tag external organisation (optional)
   - Step 9: Review & Publish - preview card, publish or save draft
   - Smart pre-fills: location from collective default, capacity from past average

10. Event management actions:
    - Edit event (notify registered of changes)
    - Cancel event (require reason, auto-notify)
    - Duplicate event
    - Weather/cancellation advisory posting
    - Capacity change handling (auto-promote waitlist or warn if over-registered)

11. src/pages/events/event-day.tsx - leader's event day dashboard:
    - Attendance list with check-in status toggles
    - Display event QR code for participants to scan
    - Manual check-in (tap to mark attended)
    - Bulk "Mark all present"
    - Live attendee count

12. src/pages/events/log-impact.tsx - post-event impact logging:
    - Form fields pre-populated by activity type (tree planting: trees + species + area, beach cleanup: rubbish kg + coastline m, etc.)
    - Auto-calculated total hours (duration × attendees)
    - Species tracking - select from list or add custom
    - Photo upload: general event photos + before/after comparison
    - GPS area polygon drawing on map (or circle selection)
    - Notes field
    - Submit → auto-distribute impact to attendee profiles
    - Photo evidence option
    - Edit within 48 hours

13. Waitlist management: view waitlist, auto-promote on cancellation, manual override

14. Event invites: invite all collective members, track acceptance rate

Create all TanStack Query mutations and hooks. Use optimistic updates for registration/cancellation. This is the biggest feature - make it comprehensive.

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 7 - Collectives & Group Chat

```
Read CLAUDE.md and TODO-MASTER.md sections 10 and 11.

Build the complete collective (local group) system and real-time group chat for the Co-Exist app. Use existing components and hooks.

**Collective Pages:**
1. src/pages/collectives/collective-detail.tsx:
   - Cover image hero, name, location, description
   - Leader(s) + assist leaders with avatars (tappable → profile)
   - Member count with avatar gallery grid
   - Collective stats: total impact, events run, active members
   - Upcoming events list
   - Past events with impact summary
   - Map showing collective location with custom branded pin
   - "Join this Collective" button / "You're a member" state / "Chat" button
   - Share collective link

2. src/pages/collectives/discover.tsx:
   - Map view: all collectives on national map with custom pins, clustering at zoom levels
   - List view: sorted by distance from user
   - Search by name or location
   - Filter by state/region
   - Toggle between map/list

3. Collective membership:
   - Join collective flow
   - Leave collective (confirmation: "You'll lose access to group chat")
   - Multi-collective support (user can be in multiple)
   - Primary collective selection for leaderboards/profile
   - Collective switcher UI in chat

4. Leader collective management:
   - Edit collective profile (name, description, cover image)
   - Member list (searchable, with attendance stats)
   - Remove member (confirmation)
   - Assign/remove co-leader, assist-leader roles
   - Export member list CSV
   - Tap member → user card component

**Group Chat System:**
5. src/pages/chat/index.tsx - chat list (if multi-collective: list of collective chats with unread badges)

6. src/pages/chat/collective-chat.tsx - the actual chat:
   - Real-time messaging via Supabase Realtime (subscribe to chat_messages WHERE collective_id)
   - Messages: newest at bottom, auto-scroll on new message
   - Send text message with optimistic update
   - Send photo (camera/gallery → upload to chat-images bucket → show inline)
   - Reply to message (quote-reply)
   - Edit own message (within 15 minutes, show "(edited)")
   - Message timestamps (relative: "2m ago")
   - Sender avatar + name + role badge on messages
   - Typing indicator ("Sarah is typing..." via Supabase presence)
   - @mention support (type @ → search collective members, notify on mention)
   - Link previews (basic URL unfurling)
   - Voice message: hold-to-record, waveform playback
   - Video clip: max 30s, Capacitor Camera
   - Location sharing: share GPS as tappable map pin
   - Event link renders as rich event card preview
   - Unread count badge
   - Read receipt tracking (last_read_at per user)
   - Infinite scroll for history (load older on scroll up)
   - Message search within chat history

7. Chat user interaction:
   - Tap avatar/name → user card popup (avatar, name, pronouns, insta, collective badge, location mini-map, quick stats, "View Profile" button)

8. Chat moderation (leader + assist leader):
   - Pin message (shown at top)
   - Delete message (soft delete: "[message removed by moderator]")
   - Mute member (duration selector)
   - Role badges in chat

9. Chat preferences:
   - Mute chat, mute except @mentions, all notifications
   - Per-collective chat settings

10. Chat export (leader): export chat log for date range as text/CSV

Create hooks:
- src/hooks/use-chat.ts - messages query, send, edit, delete, subscribe to realtime
- src/hooks/use-typing.ts - typing indicator via Supabase presence
- src/hooks/use-chat-search.ts - search within chat history
- src/hooks/use-collective.ts - collective queries, join, leave, member management

The chat must feel native - smooth scrolling, instant send (optimistic), real-time delivery, proper keyboard handling (input stays visible above keyboard on mobile).

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 8 - Profiles, Impact & Gamification

```
Read CLAUDE.md and TODO-MASTER.md sections 12, 13, 15, and 57.

Build user profiles, impact tracking, gamification (points/badges/tiers/leaderboards), and shareable identity for Co-Exist. Use existing components.

**Profile System:**
1. src/pages/profile/index.tsx - My Profile:
   - Avatar with tier ring colour, name, pronouns, bio
   - Instagram handle (tappable → opens IG)
   - Location with mini map + styled pin
   - Member since date, membership tier display
   - Digital membership card (Co-Exist branded with QR code, tier badge)
   - "My Collective(s)" showcase cards
   - Quick stats row: events, hours, trees planted
   - Badge showcase grid (earned coloured, locked greyed)
   - Impact timeline (chronological conservation contributions)
   - Interests chips (editable)
   - Conservation journey milestones
   - Share profile link (Instagram story-friendly)
   - "Add to Apple Wallet / Google Wallet" for membership card

2. src/pages/profile/view-profile.tsx - viewing another user:
   - Same layout but read-only
   - "You're both in [Collective]" indicator
   - Mutual connections: shared events, shared collectives
   - "People you may know" suggestions

3. src/pages/profile/edit-profile.tsx:
   - Change avatar (camera/gallery + crop)
   - Edit: name, pronouns, bio, insta handle, location (map pin selector), interests, contact details
   - Privacy settings (profile visibility: public/collective-only/private)

**Impact Dashboard:**
4. src/pages/impact/index.tsx - Personal Impact Dashboard:
   - Hero stat cards with CountUp animation: trees planted, hours, events, rubbish
   - Activity chart (events per month - bar chart, use a lightweight chart lib or CSS)
   - Impact by category (donut chart)
   - Streak tracker (consecutive weeks/months)
   - Comparison to national average
   - Shareable impact card (Instagram story dimensions 1080x1920, generated as PNG)
   - Annual recap / Year-in-Review auto-generated story

**Gamification:**
5. Points system:
   - Points balance in profile header
   - Points history/ledger page
   - Animated points award notification (number flies up)
   - Point values as defined in TODO 15.1.1

6. src/pages/badges/index.tsx - Badge collection:
   - Grid of all badges (earned = coloured, locked = greyed with lock icon)
   - Badge detail modal: description, criteria, progress bar, date earned, rarity
   - Badge unlock animation (card flip + glow + particles + haptic)
   - Badge share card (for social sharing)
   - Badge categories: First Steps, Activity Milestones, Streaks, Special

7. src/pages/leaderboard/index.tsx:
   - Individual leaderboard (within collective, by points)
   - Collective leaderboard (nationally, by impact)
   - Top 3 with medal icons (gold/silver/bronze)
   - Current user's rank highlighted
   - Filter by: time period (week/month/quarter/year/all-time), metric (points/trees/events/hours)
   - Tap any user → their profile
   - Animated rank changes

8. Membership tiers:
   - Seedling (0-499), Sapling (500-1999), Native (2000-4999), Canopy (5000-9999), Elder (10000+)
   - Tier progression bar on profile
   - Tier-up celebration (full-screen animation)
   - Tier badge on membership card + avatar ring colour

**Shareable Cards & Social Proof** (§57):
9. Generate shareable PNG cards (use html2canvas or similar):
   - Impact share card, badge share card, event share card, milestone card
   - All sized for Instagram stories (1080x1920) with Co-Exist branding
10. Referral system:
    - Personal referral code + shareable link/QR
    - Invite flow: native share sheet, copy link, QR
    - Referral tracking + reward chain (join → first event → 5th event bonuses)
    - Referral leaderboard

Create hooks: use-profile.ts, use-impact.ts, use-badges.ts, use-leaderboard.ts, use-points.ts, use-referral.ts

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 9 - Social Feed, Notifications & Announcements

```
Read CLAUDE.md and TODO-MASTER.md sections 16, 17, and 18.

Build the social/community feed, notification system, and global announcements for Co-Exist. Use existing components.

**Social Feed:**
1. src/pages/community/feed.tsx:
   - Scrollable feed of posts from user's collective(s)
   - Post types: photo post, milestone (auto: "Sarah earned Tree Guardian!"), event recap (auto from impact), leader announcement
   - Any member can post (not just leaders)
   - Like button with animation (leaf/heart burst) + count
   - Comment system (threaded text replies)
   - Tap user avatar → user card / profile
   - Post sharing (native share sheet)
   - Event photo tagging ("Sarah, Jake, and 3 others were here")
   - Report/flag post
   - Pull-to-refresh + infinite scroll
   - Empty state for new collectives

2. src/pages/community/create-post.tsx:
   - Photo selection (camera/gallery, multiple photos)
   - Caption text
   - Tag event (optional)
   - Tag people (optional)
   - Post to specific collective

**Notifications:**
3. src/pages/notifications/index.tsx:
   - Notification bell with unread badge count (in header)
   - Notification list grouped by day
   - All notification types: event reminder, registration confirmation, waitlist promotion, event cancelled/updated, points earned, badge unlocked, new event in collective, event invite, global announcement, challenge update, chat @mention
   - Tap notification → deep link to relevant screen
   - Mark as read (individual + mark all)
   - Swipe left → mark read
   - "All caught up!" celebration state with nature illustration when empty

4. src/hooks/use-notifications.ts:
   - Subscribe to Supabase Realtime on notifications table
   - Unread count query
   - Mark read mutations
   - Notification batching/digest logic for chat (bundle "12 new messages" instead of 12 pushes)

5. Notification preferences (in settings):
   - Toggle by type
   - Quiet hours / DND schedule (e.g. 10pm-7am)
   - Distinct notification sounds for chat vs events vs announcements (configurable)

**Global Announcements:**
6. src/pages/announcements/index.tsx:
   - Announcements feed - accessible from bell icon or dedicated section
   - Announcement card: title, content, author (name + role), timestamp, optional image
   - Priority: normal (in feed), urgent (banner on home + push)
   - Pinned announcements at top
   - Read tracking + unread count
   - Announcement history (searchable)

7. src/pages/announcements/create.tsx (staff/admin):
   - Title, content, image upload
   - Priority selector (normal/urgent)
   - Target audience: all users, leaders only, specific collective(s)
   - Schedule for future publish
   - Preview before send
   - Auto-notify all targeted users

8. src/hooks/use-announcements.ts:
   - Supabase Realtime subscription
   - Read/unread tracking
   - Create announcement mutation (staff+)

**Content Moderation:**
9. Content moderation queue (admin view) - unified list of all flagged/reported posts, photos, chat messages with approve/remove/warn actions

Create all hooks and ensure proper Realtime subscriptions with cleanup.

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 10 - Donations, Merch Store & Payments

```
Read CLAUDE.md and TODO-MASTER.md sections 19 and 20.

Build the complete donation system and merch store for Co-Exist - both customer-facing and admin management. Uses Stripe for all payments. Use existing components.

**Donations:**
1. src/pages/donate/index.tsx:
   - Purpose description section ("Every dollar goes to...")
   - Preset amount buttons ($5, $10, $25, $50) + custom amount input
   - One-time vs recurring (monthly) toggle - recurring via Stripe Subscriptions
   - Optional message with donation
   - Optional "on behalf of organisation" for corporate donations
   - Donation goal/thermometer per project (animated fill)
   - "Donate" → Stripe Checkout (redirect or embedded)

2. src/pages/donate/thank-you.tsx:
   - Thank you with impact equivalency ("$25 plants ~10 native trees")
   - Share card (opt-in)
   - Points awarded notification

3. Donation management:
   - Donation history in profile settings
   - Manage recurring donation (cancel/change amount)
   - Tax-deductible receipt generation (if DGR status - PDF with ABN, DGR endorsement)

4. Donor wall - public page showing donor names/organisations (opt-in)

**Merch Store (Customer):**
5. src/pages/shop/index.tsx:
   - Product grid with NON-GENERIC card styling (image-forward, clean price tag, warm shadows)
   - "Sold out" overlay, "Low stock" badge
   - Related products section

6. src/pages/shop/product-detail.tsx:
   - Swipeable image gallery
   - Description, variant selector (size + colour)
   - Price + stock availability
   - Add to cart button (sticky bottom)
   - Product reviews/ratings (star rating + text)
   - Related products

7. Cart system:
   - src/hooks/use-cart.ts - Zustand store: add, remove, update quantity, clear
   - Cart page: items, quantities, variant display, subtotal
   - Promo code input + validation
   - Shipping rate display (flat rate or calculated)
   - Cart count badge on shop tab/icon

8. Checkout:
   - Shipping address form (with address memory for repeat orders)
   - Order summary
   - Stripe Checkout
   - Order confirmation page + email trigger

9. Order tracking:
   - Order history in profile
   - Order detail: items, shipping, status (pending/processing/shipped/delivered)
   - Tracking number when shipped

10. Returns flow: request return from order history → admin reviews

**Merch Admin (Admin Dashboard):**
11. src/pages/admin/merch/:
    - Product CRUD (create/edit/archive)
    - Multiple image upload per product (reorderable)
    - Variants management (size/colour combos)
    - Inventory tracking per variant (stock counts)
    - Low stock alerts (configurable threshold)
    - Stock adjustment (add/remove with reason)
    - Order management: all orders, filter by status, search
    - Order detail + update status (processing/shipped + tracking number/delivered)
    - Refund order (trigger Stripe refund)
    - Sales analytics: revenue, units sold, by product, by period
    - Promo code management: create/edit/deactivate codes (percentage/flat/free shipping, usage limits, expiry)
    - Shipping config: flat rate, free shipping threshold
    - Returns management: view requests, approve/deny, trigger refund
    - Review moderation: approve/remove reviews
    - Export orders CSV

**Stripe Integration:**
12. src/lib/stripe.ts - Stripe.js client setup
13. Supabase Edge Function stubs at supabase/functions/:
    - create-checkout/index.ts - creates Stripe Checkout session (donations + merch)
    - stripe-webhook/index.ts - handles payment_intent.succeeded, subscription events, refunds
    - Document the webhook event handling flow

Create hooks: use-donations.ts, use-merch.ts, use-cart.ts, use-orders.ts, use-admin-merch.ts

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 11 - Admin Dashboards & Reporting

```
Read CLAUDE.md and TODO-MASTER.md sections 14, 21, 22, 23, 24, 25, 26, and 33.

Build ALL admin dashboards, reporting, and management tools. This is a big one - leader dashboard, national admin, super admin, impact reporting, surveys, partners, and exports. Use existing components.

**Leader Dashboard** (src/pages/leader/):
1. leader/index.tsx - overview:
   - Stat cards: active members, upcoming events, hours this month, events this month
   - Upcoming events with RSVP counts + quick actions
   - Recent activity: new members, recent check-ins
   - Member engagement scores (active vs at-risk - inactive 30+ days)
   - Quick actions: create event, send announcement, view members, log impact, invite collective
   - Event calendar (month view with event dots)
   - Notification centre: pending items (impact not logged, etc.)
   - Charity impact reporting: generate collective reports
   - Event invite acceptance rate stats

**National Admin Dashboard** (src/pages/admin/):
2. admin/index.tsx - overview:
   - Total members, collectives, events, impact (all-time + period)
   - Trend charts: member growth, event frequency, impact over time (line/bar)
   - Configurable date ranges (week/month/quarter/year/custom)
   - Geographic heat map of activity (marker clusters)

3. admin/collectives.tsx - manage all collectives: list, health scores, leader info, create/archive
4. admin/users.tsx - user management (see Super Admin below)
5. admin/events.tsx - all events nationally, filter by collective/region/status
6. admin/partners.tsx - partner/sponsor CRUD, organisation directory, corporate programs
7. admin/challenges.tsx - create/edit/end national challenges
8. admin/surveys.tsx - survey builder, templates, aggregate results
9. admin/audit-log.tsx - action history (who did what when)
10. admin/system.tsx - Supabase usage dashboard, feature flags management
11. admin/moderation.tsx - content moderation queue (flagged posts/photos/chat)
12. admin/email.tsx - SendGrid bounce/complaint handling
13. admin/charity.tsx - ACNC details (ABN, DGR status), charity settings

**Super Admin** (src/pages/admin/super/):
14. Staff directory: list all staff with roles + permissions
15. Add/remove staff: assign national_staff/national_admin role
16. Granular permissions: manage_users, manage_collectives, manage_content, manage_merch, manage_finances, send_announcements
17. User management:
    - Search by name/email/collective/role
    - View any profile with full activity
    - Edit profile, change role, assign to collective
    - Suspend/ban (with reason, duration, appeal flow)
    - Ban history per user
    - Delete user (GDPR data removal)
    - Reset password
    - Bulk operations
18. Admin impersonation: "View as user" (read-only, audit logged)

**Charity Impact Reporting** (src/pages/reports/):
19. Report types: collective, national, per-event, annual charity (ACNC), donor impact
20. Report builder: date range, scope, metric selector, preview
21. Export: PDF (branded with Co-Exist logo + charts) and CSV
22. Schedule recurring reports (monthly email to board)
23. Report history

**National Impact Dashboard** (src/pages/impact/national.tsx):
24. Big animated counters: trees, hours, rubbish, coastline, events, members, collectives
25. Geographic heat map, monthly/quarterly trends
26. Breakdown by activity type, by state/region
27. Top performing collectives
28. Export to PDF, shareable link, embeddable widget concept

**Surveys:**
29. Survey builder: multiple choice, rating 1-5, free text, yes/no
30. Auto-send after event, survey notification, completion screen
31. Results dashboard with aggregate charts
32. Export CSV, pre-built templates

**Partners & Sponsors:**
33. Organisation CRUD, tag events with partners
34. Corporate volunteer tracking, organisation impact reporting
35. Sponsored challenges, invoice generation
36. Partner offers catalog: CRUD, redemption tracking

**Export Centre** (src/pages/admin/exports.tsx):
37. All exports: member list, attendance, impact (PDF+CSV), survey results, financial, orders
38. Financial reconciliation: Stripe vs Supabase comparison
39. GST report for merch, donation tax report per donor
40. Date range + scope filtering

All admin pages must use the sidebar layout, be responsive (desktop-optimised but mobile-usable), and role-gated.

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 12 - Settings, Email, Push & Native Config

```
Read CLAUDE.md and TODO-MASTER.md sections 34, 35, 36, 44, 45, and 47.

Build settings, email system, push notifications, security, and Capacitor native configuration. Use existing components.

**Settings** (src/pages/settings/):
1. settings/index.tsx - settings menu:
   - Notification preferences (toggle by type: events, chat, announcements, @mentions)
   - Chat preferences (mute collectives, mute except @mentions)
   - Quiet hours / DND schedule
   - Notification sounds (distinct for chat/events/announcements)
   - Sound toggle (in-app sounds on/off)
   - Privacy settings (profile visibility, leaderboard opt-in/out)
   - Email preferences (marketing opt-in/out)
   - Change password, change email
   - Delete account (GDPR flow with confirmation + data removal)
   - About Co-Exist (mission, website link, socials)
   - Aboriginal acknowledgment
   - Terms of Service page (with versioning - re-accept on update)
   - Privacy Policy page
   - Help / FAQ
   - Contact support (email link or in-app form)
   - Cookie consent management (web only)
   - App version display
   - Log out with confirmation

**Push Notifications:**
2. Configure Capacitor Push Notifications plugin
3. src/hooks/use-push.ts:
   - FCM (Android) + APNs (iOS) registration
   - Permission request flow (strategic timing, not first launch)
   - Token storage in Supabase (per device, per user)
   - Token refresh handling
   - Notification tap → deep link routing
   - Badge count management (app icon number)
   - Silent notifications for data sync
4. supabase/functions/send-push/index.ts - Edge Function for dispatching push via FCM/APNs

**Email System (SendGrid):**
5. supabase/functions/send-email/index.ts - SendGrid wrapper Edge Function
6. Email template definitions (as TypeScript objects with SendGrid dynamic template IDs):
   - Transactional: welcome, event confirmation, event reminder (24h), event cancelled, event invite, waitlist promoted, password reset, donation receipt, order confirmation, order shipped
   - Marketing: newsletter, challenge announcement, monthly impact recap, announcement digest
7. Unsubscribe handling (CAN-SPAM compliant one-click)
8. Document SendGrid setup: domain verification, API key config

**Security & Privacy:**
9. Cookie consent banner component (web only) - configurable per jurisdiction
10. Terms of Service versioning - store version + acceptance date per user, re-accept prompt on update
11. Data retention policy implementation (30-day grace after deletion, then permanent)
12. Child safety policy display (App Store / Play Store requirement)
13. Image content moderation stub - Edge Function skeleton for NSFW detection
14. GDPR: data export (user can request), data deletion, consent management

**Capacitor Native Config:**
15. Update capacitor.config.ts with full config (plugins, server, iOS/Android specifics)
16. Document iOS build workflow (MacInCloud): pull → install → build → cap copy → Xcode → archive
17. Document Android build workflow (Windows): build → cap copy → Android Studio → APK/AAB
18. App icon requirements (all sizes for iOS + Android adaptive icon)
19. Splash screen config (launch storyboard / splash screen XML)
20. Deep link / universal link configuration
21. Permission declarations (camera, location, notifications, calendar, microphone)

**CI/CD:**
22. vercel.json - SPA routing config with rewrites
23. .github/workflows/ci.yml - lint + type-check + build on PR
24. Environment config documentation (.env.local, .env.production)

**Analytics & Logging:**
25. src/lib/analytics.ts - event tracking abstraction (pluggable: PostHog, Mixpanel, or Plausible)
26. Track key events: signup, login, event view/register/checkin, collective join, badge unlock, donation, purchase, chat message, announcement read
27. src/lib/sentry.ts - Sentry error logging setup with React error boundary integration
28. Crash reporting for Capacitor

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 13 - Animations, Polish & Cohesive Experience

```
Read CLAUDE.md and TODO-MASTER.md sections 37, 38, 40, 41, 42, 52, 53, 54, 55, and 56.

This is the final polish pass. You are adding animations, micro-interactions, accessibility, performance optimisation, cohesive flow connectors, delight moments, contextual intelligence, transition choreography, and sound design to the EXISTING codebase. Do NOT rebuild features - enhance what's already built.

**Animations & Micro-interactions** (§37):
1. Page transitions: slide from right for push, fade for tab switches (ensure AnimatePresence is wired up properly)
2. Tab bar: icon bounce/morph on selection
3. Pull-to-refresh: nature-themed animation (leaf spinning)
4. Event registration: button morphs "Register" → checkmark with spring
5. Check-in success: confetti burst + points flying to counter
6. Badge unlock: card flip + glow + particles
7. Points awarded: number flies up and adds to total
8. Tier up: progress bar fills + burst + new tier reveal
9. Like/celebrate: leaf burst from button
10. Stat counters: count-up on load, sequenced left to right
11. Card press: scale(0.98) + shadow change (150ms)
12. Skeleton shimmer animation
13. Toast slide from top with spring
14. Bottom sheet spring physics on drag
15. Map marker pulse on selection
16. Chat message send: bubble slides up, typing dots animated
17. Leaderboard rank change animation
18. Donation thermometer liquid fill
19. Seasonal ambient particles (falling leaves autumn, etc. - Southern Hemisphere)
20. Splash → app transition: logo fade out, content fade in

**Transition Choreography** (§55):
21. Shared element transitions: event card → event detail hero, avatar → profile, badge → badge detail
22. Staggered list loading (30ms stagger)
23. Card reveal on scroll (subtle fade + slide up)
24. Hero parallax (1.15x speed)
25. Stats counter sequence (left to right, 200ms apart)
26. Map marker drop animation (closest first)
27. State change animations: register→registered button morph, empty→content, offline→online, unread→read, points increment slot machine, like animation, tier ring colour transition

**Sound Design** (§56):
28. src/hooks/use-sound.ts - sound player hook: lazy load, <50KB each, Web Audio API, respect system mute + settings toggle
29. Sound files placeholder structure in src/assets/sounds/
30. Sound + haptic pairing via Capacitor Haptics

**Cohesive Experience** (§52):
31. Ensure every entity is tappable everywhere (event names, user avatars, badges, collectives)
32. "What's next?" prompts after every completion action
33. Smart empty states with specific CTAs (not generic "No items")
34. Universal long-press action sheet on cards
35. Deep link from every surface (notifications, emails, shared links → correct screen)
36. Pull-to-refresh on every scrollable list
37. Swipe-to-action consistent pattern
38. Confirmation pattern (destructive = same bottom sheet + red button)
39. Loading pattern (skeleton → content, never blank)
40. Success pattern (toast/card/full-screen scaled by win size)
41. Scroll position memory on back navigation

**Delight & Emotional Design** (§53):
42. First event celebration: full-screen "Welcome to the movement!" with confetti
43. Milestone celebrations (5th, 10th, 25th, 50th, 100th event)
44. Context-aware greetings on home ("Big day tomorrow - ready for the cleanup?")
45. Nature-themed loading states (growing seedling, bird flying)
46. Impact equivalency translations ("That's the weight of a small car")
47. Social proof nudges ("12 from your collective are going")
48. Easter egg: tap logo 5x → hidden animation

**Contextual Intelligence** (§54):
49. Event day mode: home shows countdown + directions + check-in
50. Post-event mode: photo sharing CTA + survey nudge
51. Badge proximity alerts ("2 events away from Shore Keeper!")
52. Smart pre-fills on event creation and impact logging

**Accessibility** (§41):
53. Audit all components for: aria-labels, alt text, focus indicators, keyboard nav
54. Colour contrast verification (4.5:1 body, 3:1 large)
55. Screen reader landmarks and heading hierarchy
56. prefers-reduced-motion: disable all non-essential animation
57. Text scaling support (up to 200%)
58. Skip navigation link (web)

**Performance** (§42):
59. Verify all pages are lazy-loaded
60. Virtual scrolling for lists >50 items
61. Image lazy loading with blur → sharp progressive loading
62. Realtime subscription cleanup (unsubscribe when not in view)
63. Bundle analysis - verify <2MB initial, <5MB total
64. Service worker for static asset caching
65. Rate limiting on chat (client-side throttle)
66. App update version check (against Supabase feature_flags or config)
67. Maintenance mode page (branded, shown when backend unreachable)
68. i18n scaffold (react-i18next setup, extract strings to locale files, English only for now)

Do NOT rebuild features. Enhance existing code. Add animation wrappers, accessibility attributes, performance optimisations, and delight moments to what's already there.

Test build: `npx tsc --noEmit && npx vite build`
```

---

## PROMPT 14 - Public Pages, Seeding & Documentation

```
Read CLAUDE.md and TODO-MASTER.md sections 29, 32, 43, 48, 50, and 51.

Final batch: public-facing pages, offline support, photo system, testing setup, data seeding, and documentation. Use existing components.

**Public Pages** (§48):
1. src/pages/public/event.tsx - public event page (no auth required): event details + "Download app" / "Open in app" CTA + Open Graph meta
2. src/pages/public/collective.tsx - public collective overview
3. src/pages/public/download.tsx - app download landing page: App Store + Play Store links + web app
4. Open Graph meta tags for all shareable URLs (use react-helmet-async)
5. Deep link routing: shared URL → in-app screen via Capacitor App Links

**Offline & Connectivity** (§29):
6. src/hooks/use-offline.ts - detect offline via Capacitor Network plugin
7. Offline banner in app header
8. Cache critical data locally (TanStack Query persistence to IndexedDB/localStorage)
9. Offline event check-in: queue check-ins, sync when online
10. Optimistic UI with background sync
11. Online/offline transition animations

**Photo & Media System** (§32):
12. src/hooks/use-camera.ts - Capacitor Camera plugin wrapper (capture + gallery)
13. Image compression before upload (client-side, target <500KB)
14. Upload to Supabase Storage with progress indicator
15. Photo gallery view (masonry/grid) with full-screen viewer (pinch zoom, swipe between)
16. Photo moderation (leader/admin can remove)
17. Photo attribution

**Testing Setup** (§43):
18. Install and configure Vitest
19. Install React Testing Library
20. Write example tests:
    - Unit test for a utility function (cn, points calculation)
    - Component test for Button component
    - Hook test for useAuth (mocked Supabase)
21. Install Playwright for E2E
22. Write E2E test skeletons for critical journeys:
    - Signup → onboarding → join collective → register event
    - Leader: create event → manage attendance → log impact
23. Accessibility audit setup (axe-core)

**Data Seeding** (§50):
24. supabase/seed.sql - comprehensive seed data:
    - Badge definitions (all badges from §15.2 with criteria JSONB)
    - Activity type display names and icons
    - Sample collectives (Byron Bay, Sydney, Melbourne, Gold Coast, etc.)
    - Sample events across collectives
    - Sample users with various roles
    - Existing merch products (Community Tee $45, Cap $30, Bucket Hat $20, Tote $15, Stickers $5)
    - Sample partner offers
    - Feature flags with defaults

**Documentation** (§51):
25. Update the README.md with:
    - Project overview + tech stack
    - Setup instructions (clone, install, env vars, run dev)
    - Build commands (web, Android, iOS)
    - Database setup (run migration, run seed)
    - Deployment (Vercel web, Android Studio, MacInCloud iOS)
    - Project structure overview
    - Environment variables reference
    - Useful commands reference

26. Create supabase/DEPLOY.md - Supabase setup:
    - Create project, enable PostGIS
    - Run migration SQL
    - Configure auth providers (email, Google, Apple)
    - Create storage buckets with policies
    - Enable realtime on required tables
    - Deploy edge functions
    - Set edge function secrets (SendGrid, Stripe, FCM)

Test build: `npx tsc --noEmit && npx vite build`
Run tests: `npx vitest run`
```

---

## Order Summary

| # | Prompt | Sections | Depends On |
|---|--------|----------|------------|
| 1 | Design System & Components | §2 | Setup (done) |
| 2 | Database Schema | §3 | Nothing |
| 3 | Auth & Onboarding | §4, §5, §49 | 1, 2 |
| 4 | App Shell & Navigation | §6, §39 | 1, 3 |
| 5 | Home Feed & Explore | §7, §28 | 1-4 |
| 6 | Event System | §8, §9, §30, §31 | 1-5 |
| 7 | Collectives & Chat | §10, §11 | 1-6 |
| 8 | Profiles, Impact, Gamification | §12, §13, §15, §57 | 1-7 |
| 9 | Social Feed, Notifications, Announcements | §16, §17, §18 | 1-8 |
| 10 | Donations, Merch & Payments | §19, §20 | 1-9 |
| 11 | Admin Dashboards & Reporting | §14, §21-§26, §33 | 1-10 |
| 12 | Settings, Email, Push, Native | §34-§36, §44-§47 | 1-11 |
| 13 | Animations & Polish | §37, §38, §40-§42, §52-§56 | 1-12 |
| 14 | Public Pages, Seeding, Docs | §29, §32, §43, §48, §50, §51 | 1-13 |

Prompts 1 and 2 can run in parallel (no dependencies on each other).

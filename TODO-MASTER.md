# Co-Exist App - Master Build TODO

> Youth Conservation Movement | React + Capacitor + Supabase
> CEO/Founder: Kurt Jones | Website: coexistaus.org
> Logo: Black text wordmark on white background, with sages/nature elements
> Tagline: "Explore. Connect. Protect." | Philosophy: "Do good, feel good"
> Build targets: Capacitor static bundle (iOS via MacInCloud, Android via Android Studio on Windows) + Vercel web deployment
> No phased rollout - building everything.
> Prepared: 2026-03-19 | Updated: 2026-03-20

---

## TABLE OF CONTENTS

1. [Project Setup & Tooling](#1-project-setup--tooling)
2. [Brand Identity & Design System](#2-brand-identity--design-system)
3. [Database Schema & Supabase Config](#3-database-schema--supabase-config)
4. [Authentication & Onboarding](#4-authentication--onboarding)
5. [Role & Permission System](#5-role--permission-system)
6. [App Shell & Navigation](#6-app-shell--navigation)
7. [Home / Discovery Feed](#7-home--discovery-feed)
8. [Event System - Participant](#8-event-system--participant)
9. [Event System - Leader Tools](#9-event-system--leader-tools)
10. [Collective (Local Group) System](#10-collective-local-group-system)
11. [Collective Group Chat](#11-collective-group-chat)
12. [User Profile & Digital Membership](#12-user-profile--digital-membership)
13. [Impact Tracking & Stats](#13-impact-tracking--stats)
14. [Charity Impact Reporting](#14-charity-impact-reporting)
15. [Gamification & Rewards](#15-gamification--rewards)
16. [Social & Community Feed](#16-social--community-feed)
17. [Notifications & Communications](#17-notifications--communications)
18. [Global Announcements Feed](#18-global-announcements-feed)
19. [Donations & Merch Store](#19-donations--merch-store)
20. [Merch & Stock Management (Admin)](#20-merch--stock-management-admin)
21. [Leader Dashboard](#21-leader-dashboard)
22. [National Admin Dashboard](#22-national-admin-dashboard)
23. [Super Admin - Staff & User Management](#23-super-admin--staff--user-management)
24. [National Impact Dashboard](#24-national-impact-dashboard)
25. [Surveys & Feedback](#25-surveys--feedback)
26. [Partner & Sponsor System](#26-partner--sponsor-system)
27. [Challenges & Campaigns](#27-challenges--campaigns)
28. [Search & Filtering](#28-search--filtering)
29. [Offline & Connectivity](#29-offline--connectivity)
30. [Calendar Integration](#30-calendar-integration)
31. [QR Code System](#31-qr-code-system)
32. [Photo & Media System](#32-photo--media-system)
33. [Export & Reporting](#33-export--reporting)
34. [Settings & Account Management](#34-settings--account-management)
35. [Push Notifications (Native)](#35-push-notifications-native)
36. [Email System (SendGrid)](#36-email-system-sendgrid)
37. [Animations & Micro-interactions](#37-animations--micro-interactions)
38. [Mobile-First & Touch-First Design Enforcement](#38-mobile-first--touch-first-design-enforcement)
39. [Web Responsive Adaptation](#39-web-responsive-adaptation)
40. [Card Styling & Non-Generic UI](#40-card-styling--non-generic-ui)
41. [Accessibility (WCAG 2.1 AA)](#41-accessibility-wcag-21-aa)
42. [Performance & Optimisation](#42-performance--optimisation)
43. [Testing](#43-testing)
44. [Capacitor Native Builds](#44-capacitor-native-builds)
45. [CI/CD & Deployment](#45-cicd--deployment)
46. [Analytics & Logging](#46-analytics--logging)
47. [Security & Privacy](#47-security--privacy)
48. [Public-Facing / Shareable Pages](#48-public-facing--shareable-pages)
49. [Onboarding Flows (Detailed)](#49-onboarding-flows-detailed)
50. [Data Migration & Seeding](#50-data-migration--seeding)
51. [Documentation & Handover](#51-documentation--handover)
52. [Cohesive Experience & Flow Connectors](#52-cohesive-experience--flow-connectors)
53. [Delight & Emotional Design](#53-delight--emotional-design)
54. [Contextual Intelligence & Smart Defaults](#54-contextual-intelligence--smart-defaults)
55. [Transition & State Choreography](#55-transition--state-choreography)
56. [Sound Design](#56-sound-design)
57. [Shareable Identity & Social Proof](#57-shareable-identity--social-proof)

---

## 1. PROJECT SETUP & TOOLING

- [ ] 1.1 Initialise React (Vite) project with TypeScript
- [ ] 1.2 Install and configure Capacitor (iOS + Android)
- [ ] 1.3 Install Supabase client (`@supabase/supabase-js`)
- [ ] 1.4 Set up TailwindCSS with custom theme config
- [ ] 1.5 Configure path aliases (`@/components`, `@/lib`, `@/hooks`, etc.)
- [ ] 1.6 Set up ESLint + Prettier with shared config
- [ ] 1.7 Install React Router for routing
- [ ] 1.8 Install Zustand or Jotai for state management
- [ ] 1.9 Install Framer Motion for animations
- [ ] 1.10 Install `react-query` / TanStack Query for server state
- [ ] 1.11 Set up environment variables (`.env.local`, `.env.production`)
- [ ] 1.12 Create project folder structure:
  ```
  src/
    components/    (shared UI components)
    features/      (feature modules)
    hooks/         (custom hooks)
    lib/           (supabase client, utils, constants)
    pages/         (route pages)
    styles/        (global styles, tailwind)
    types/         (TypeScript types)
    assets/        (icons, images, fonts)
  ```
- [ ] 1.13 Set up Supabase project (remote) - database, auth, storage buckets
- [ ] 1.14 Install and configure Supabase CLI for local dev + migrations
- [ ] 1.15 Set up Git repo with `.gitignore`, branch strategy (main/develop/feature)
- [ ] 1.16 Configure Vite build for both SPA (Capacitor static bundle) and web (Vercel)
- [ ] 1.17 Vercel project setup - connect to Git repo, auto-deploy on push to main
- [ ] 1.18 Configure `capacitor.config.ts` to point to local build output (`dist/`)
- [ ] 1.19 Ensure build produces static bundle suitable for Capacitor (`npx cap copy`)

---

## 2. BRAND IDENTITY & DESIGN SYSTEM

### 2.1 Colour Palette (Fully Configurable via Tailwind Theme)
- [ ] 2.1.1 Define primary colour (sage green family - configurable via single CSS variable / Tailwind token)
- [ ] 2.1.2 Define secondary colour (warm earth tone - configurable)
- [ ] 2.1.3 Define accent colour (energetic - for CTAs, badges, highlights - configurable)
- [ ] 2.1.4 Define neutral scale (warm greys, not cold - off-white to charcoal)
- [ ] 2.1.5 Define success/warning/error/info semantic colours
- [ ] 2.1.6 Define surface colours (card backgrounds, modals, overlays)
- [ ] 2.1.7 Define gradient system (subtle nature-inspired gradients for headers/cards)
- [ ] 2.1.8 Ensure all colour combos pass WCAG 2.1 AA contrast ratios
- [ ] 2.1.9 **All colours configured in a single theme config file** - easy to swap entire palette by changing one file
- [ ] 2.1.10 Configure Tailwind `theme.extend.colors` referencing CSS custom properties for runtime flexibility
- [ ] 2.1.11 Dark mode palette variant (optional - flag for later decision with Kurt)

### 2.2 Typography
- [ ] 2.2.1 Select primary heading font (bold, modern, movement feel - e.g. Satoshi, General Sans, or similar)
- [ ] 2.2.2 Select body font (clean, highly readable on mobile - e.g. Inter, DM Sans)
- [ ] 2.2.3 Define type scale (h1–h6, body, caption, overline, button)
- [ ] 2.2.4 Define font weights used (regular, medium, semibold, bold)
- [ ] 2.2.5 Define line heights and letter spacing per size
- [ ] 2.2.6 Self-host fonts via `/assets/fonts` (no Google Fonts CDN dependency)
- [ ] 2.2.7 Configure Tailwind `fontFamily` and `fontSize` extensions

### 2.3 Iconography
- [ ] 2.3.1 Select icon library (Lucide, Phosphor, or Heroicons - consistent style)
- [ ] 2.3.2 Define custom conservation icons (tree, wave, habitat, wildlife, litter bag)
- [ ] 2.3.3 Define icon sizes: sm (16), md (20), lg (24), xl (32)
- [ ] 2.3.4 Create `<Icon>` wrapper component with size/colour props
- [ ] 2.3.5 **All icons in buttons must be perfectly centred** - use flex centering, not padding hacks

### 2.4 Spacing & Layout
- [ ] 2.4.1 Define spacing scale (4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- [ ] 2.4.2 Define border radius scale (sm: 6, md: 12, lg: 16, xl: 24, full: 9999)
- [ ] 2.4.3 Define max content width (mobile: 100%, tablet: 640px, desktop: 1024px)
- [ ] 2.4.4 Define safe area insets for notch/home-indicator (Capacitor)
- [ ] 2.4.5 Define bottom nav height (56px + safe area)
- [ ] 2.4.6 Define standard page padding (16px horizontal)

### 2.5 Component Library (Design System)
- [ ] 2.5.1 `<Button>` - primary, secondary, ghost, danger, sizes (sm/md/lg), loading state, **icons always flex-centered with text**
- [ ] 2.5.2 `<Input>` - text, email, password, search, textarea, with label+error
- [ ] 2.5.3 `<Card>` - **non-generic styling**: subtle shadows, rounded-2xl, optional gradient overlays, hover lift, never flat/boring
- [ ] 2.5.4 `<Badge>` - status badges, category tags, achievement badges
- [ ] 2.5.5 `<Avatar>` - user photo with fallback initials, sizes, online indicator
- [ ] 2.5.6 `<Modal>` - bottom sheet style (mobile-native feel), backdrop blur
- [ ] 2.5.7 `<Toast>` - success/error/info notifications, auto-dismiss
- [ ] 2.5.8 `<Skeleton>` - loading placeholder for cards, lists, stats
- [ ] 2.5.9 `<EmptyState>` - illustration + message + CTA for empty lists
- [ ] 2.5.10 `<TabBar>` - segmented control for switching views
- [ ] 2.5.11 `<Chip>` - filter chips, selectable tags
- [ ] 2.5.12 `<ProgressBar>` - linear and circular for stats/achievements
- [ ] 2.5.13 `<StatCard>` - number + label + trend arrow for dashboards, **styled with subtle gradient bg or glassmorphism**
- [ ] 2.5.14 `<ListItem>` - standard list row with icon, text, chevron
- [ ] 2.5.15 `<Divider>` - section dividers with optional label
- [ ] 2.5.16 `<Header>` - page header with back button, title, action buttons
- [ ] 2.5.17 `<BottomSheet>` - draggable bottom sheet for actions/filters
- [ ] 2.5.18 `<Dropdown>` / `<Select>` - mobile-friendly picker
- [ ] 2.5.19 `<Toggle>` - switch component for settings
- [ ] 2.5.20 `<Checkbox>` and `<Radio>` - form controls
- [ ] 2.5.21 `<DatePicker>` - mobile-native date/time selection
- [ ] 2.5.22 `<MapView>` - wrapper around map library (Mapbox or Leaflet)
- [ ] 2.5.23 `<PhotoGrid>` - event photo gallery layout
- [ ] 2.5.24 `<CountUp>` - animated number counter for impact stats
- [ ] 2.5.25 `<PullToRefresh>` - native-feel pull-to-refresh wrapper
- [ ] 2.5.26 `<ChatBubble>` - message bubble for group chat (sent/received variants)
- [ ] 2.5.27 `<MessageInput>` - chat text input with send button, attachment option
- [ ] 2.5.28 `<UserCard>` - tappable mini-profile card (avatar, name, collective, insta handle) for chat user taps
- [ ] 2.5.29 `<MapPin>` - custom styled map pin component (Co-Exist branded, not default markers)

### 2.6 Imagery & Photography Style
- [ ] 2.6.1 Define photography guidelines (real people, real events, no stock - matches coexistaus.org documentary style)
- [ ] 2.6.2 Define image aspect ratios (hero: 16:9, card: 3:2, avatar: 1:1)
- [ ] 2.6.3 Define image treatment (slight warm filter, rounded corners)
- [ ] 2.6.4 Create placeholder/fallback illustrations for empty states
- [ ] 2.6.5 Source or create nature-themed illustrations (onboarding, achievements)

### 2.7 Motion & Animation Principles
- [ ] 2.7.1 Define easing curves (ease-out for entrances, ease-in-out for transitions)
- [ ] 2.7.2 Define duration scale (fast: 150ms, normal: 250ms, slow: 400ms)
- [ ] 2.7.3 Define page transition style (slide from right, fade, or shared element)
- [ ] 2.7.4 Define micro-interaction patterns (button press, card tap, like/celebrate)

---

## 3. DATABASE SCHEMA & SUPABASE CONFIG

### 3.1 Core Tables
- [ ] 3.1.1 `profiles` - user profile data (extends Supabase auth.users)
  - id (FK → auth.users), display_name, pronouns, bio, avatar_url, date_of_birth, location, location_point (PostGIS), phone, instagram_handle, interests (text[]), membership_level, points, role (user_role enum), is_suspended, suspended_reason, suspended_until, tos_accepted_version, tos_accepted_at, created_at, updated_at
- [ ] 3.1.2 `collectives` - local groups
  - id, name, slug, description, location (PostGIS point), region, state, cover_image_url, leader_id (FK), created_at, is_active
- [ ] 3.1.3 `collective_members` - membership join table
  - id, collective_id (FK), user_id (FK), role (member/leader/co-leader/assist-leader), joined_at, status (active/inactive)
- [ ] 3.1.4 `events` - all events
  - id, collective_id (FK), created_by (FK), title, description, activity_type (enum), location (PostGIS point), address, date_start, date_end, capacity, cover_image_url, is_public, status (draft/published/cancelled/completed), created_at, updated_at
- [ ] 3.1.5 `event_registrations` - RSVPs
  - id, event_id (FK), user_id (FK), status (registered/waitlisted/cancelled/attended), registered_at, checked_in_at, invited_at (nullable - for collective event invites)
- [ ] 3.1.6 `event_invites` - collective-specific event invitations
  - id, event_id (FK), collective_id (FK), invited_by (FK), message, created_at
- [ ] 3.1.7 `event_impact` - post-event impact data
  - id, event_id (FK), logged_by (FK), trees_planted, rubbish_kg, coastline_cleaned_m, hours_total, area_restored_sqm, native_plants, wildlife_sightings, custom_metrics (JSONB), notes, logged_at
- [ ] 3.1.8 `badges` - achievement definitions
  - id, name, description, icon_url, category, criteria (JSONB), points_value, tier (bronze/silver/gold)
- [ ] 3.1.9 `user_badges` - earned badges
  - id, user_id (FK), badge_id (FK), earned_at, event_id (FK nullable)
- [ ] 3.1.10 `points_ledger` - point transactions
  - id, user_id (FK), amount, reason, event_id (FK nullable), created_at
- [ ] 3.1.11 `notifications` - in-app notifications
  - id, user_id (FK), type, title, body, data (JSONB), read_at, created_at
- [ ] 3.1.12 `posts` - social feed posts
  - id, user_id (FK), collective_id (FK nullable), event_id (FK nullable), content, images (text[]), type (photo/milestone/event_recap/announcement), created_at
- [ ] 3.1.13 `post_likes` - social engagement
  - id, post_id (FK), user_id (FK), created_at
- [ ] 3.1.14 `chat_messages` - collective group chat
  - id, collective_id (FK), user_id (FK), content, image_url (nullable), reply_to_id (FK nullable - self-ref for replies), is_pinned, is_deleted, created_at
- [ ] 3.1.15 `chat_read_receipts` - per-user last-read tracking
  - id, collective_id (FK), user_id (FK), last_read_at
- [ ] 3.1.16 `surveys` - post-event surveys
  - id, event_id (FK), created_by (FK), title, questions (JSONB), is_active, created_at
- [ ] 3.1.17 `survey_responses` - survey answers
  - id, survey_id (FK), user_id (FK), answers (JSONB), submitted_at
- [ ] 3.1.18 `partner_offers` - brand discounts/rewards
  - id, partner_name, description, offer_details, code, image_url, points_cost, valid_from, valid_to, is_active
- [ ] 3.1.19 `offer_redemptions` - tracking redemptions
  - id, offer_id (FK), user_id (FK), redeemed_at
- [ ] 3.1.20 `challenges` - national/seasonal challenges
  - id, title, description, cover_image_url, start_date, end_date, goal_type, goal_value, is_active, created_at
- [ ] 3.1.21 `challenge_participants` - challenge tracking
  - id, challenge_id (FK), user_id (FK nullable), collective_id (FK nullable), progress, joined_at
- [ ] 3.1.22 `donations` - donation records
  - id, user_id (FK), amount, currency, stripe_payment_id, project_name, message, created_at
- [ ] 3.1.23 `merch_products` - merchandise catalog
  - id, name, description, price, images (text[]), variants (JSONB - size/colour combos), is_active, stripe_price_id, created_at, updated_at
- [ ] 3.1.24 `merch_inventory` - stock tracking per variant
  - id, product_id (FK), variant_key (e.g. "M-Olive"), stock_count, low_stock_threshold (default 5), updated_at
- [ ] 3.1.25 `merch_orders` - merch purchases
  - id, user_id (FK), items (JSONB), total, stripe_payment_id, shipping_address (JSONB), status (pending/processing/shipped/delivered/cancelled), tracking_number, created_at, updated_at
- [ ] 3.1.26 `invites` - referral/invite tracking
  - id, inviter_id (FK), invitee_email, code, status (pending/accepted), created_at
- [ ] 3.1.27 `global_announcements` - admin announcements feed
  - id, author_id (FK), title, content, image_url (nullable), priority (normal/urgent), target_audience (all/leaders/collective_specific), target_collective_id (FK nullable), is_pinned, created_at, updated_at
- [ ] 3.1.28 `announcement_reads` - track who has read announcements
  - id, announcement_id (FK), user_id (FK), read_at
- [ ] 3.1.29 `staff_roles` - granular staff permissions (beyond basic role enum)
  - id, user_id (FK), permissions (JSONB - e.g. {manage_users, manage_collectives, manage_content, manage_merch, manage_finances, send_announcements}), assigned_by (FK), created_at
- [ ] 3.1.30 `audit_log` - all admin/staff actions
  - id, user_id (FK), action, target_type, target_id, details (JSONB), created_at
- [ ] 3.1.31 `organisations` - external partner organisations
  - id, name, logo_url, website, type (corporate/ngo/government/community), contact_name, contact_email, description, created_at
- [ ] 3.1.32 `event_organisations` - link events to partner orgs
  - id, event_id (FK), organisation_id (FK), role (co-host/sponsor/partner)
- [ ] 3.1.33 `promo_codes` - merch discount codes
  - id, code, type (percentage/flat/free_shipping), value, min_order_amount, max_uses, uses_count, valid_from, valid_to, is_active, created_at
- [ ] 3.1.34 `product_reviews` - merch product reviews
  - id, product_id (FK), user_id (FK), rating (1-5), review_text, is_approved, created_at
- [ ] 3.1.35 `feature_flags` - runtime feature toggles
  - id, key, enabled, target_collectives (text[] nullable - null means global), description, updated_by (FK), updated_at
- [ ] 3.1.36 `post_comments` - comments on social feed posts
  - id, post_id (FK), user_id (FK), content, is_deleted, created_at
- [ ] 3.1.37 `content_reports` - flagged content moderation queue
  - id, reporter_id (FK), content_type (post/comment/photo/chat_message), content_id, reason, status (pending/approved/removed/dismissed), reviewed_by (FK nullable), reviewed_at, created_at
- [ ] 3.1.38 `recurring_donations` - Stripe subscription tracking
  - id, user_id (FK), stripe_subscription_id, amount, currency, status (active/cancelled/paused), created_at, cancelled_at
- [ ] 3.1.39 `event_series` - linked recurring events
  - id, collective_id (FK), title_template, recurrence_rule (JSONB - e.g. {frequency: weekly, day: saturday}), created_by (FK), created_at
- [ ] 3.1.40 `impact_species` - species tracking per impact log
  - id, event_impact_id (FK), species_name, count, is_native (boolean)
- [ ] 3.1.41 `impact_areas` - GPS polygons for work areas
  - id, event_impact_id (FK), polygon (PostGIS geometry), area_sqm (calculated)

### 3.2 Enums & Types
- [ ] 3.2.1 `activity_type` enum: tree_planting, beach_cleanup, habitat_restoration, nature_walk, education, wildlife_survey, seed_collecting, weed_removal, waterway_cleanup, community_garden, other
- [ ] 3.2.2 `user_role` enum: participant, leader, co_leader, assist_leader, national_staff, national_admin, super_admin
- [ ] 3.2.3 `event_status` enum: draft, published, cancelled, completed
- [ ] 3.2.4 `registration_status` enum: registered, waitlisted, cancelled, attended, invited
- [ ] 3.2.5 `collective_role` enum: member, assist_leader, co_leader, leader
- [ ] 3.2.6 `order_status` enum: pending, processing, shipped, delivered, cancelled, refunded

### 3.3 Row Level Security (RLS)
- [ ] 3.3.1 RLS policies for `profiles` - users can read any, update own, admins can update any
- [ ] 3.3.2 RLS policies for `collectives` - public read, leader/admin write
- [ ] 3.3.3 RLS policies for `events` - public read for public events, leader create/edit for own collective
- [ ] 3.3.4 RLS policies for `event_registrations` - users manage own, leaders read collective's
- [ ] 3.3.5 RLS policies for `event_invites` - leaders create for own collective, members read own collective's
- [ ] 3.3.6 RLS policies for `event_impact` - leaders write for own events, all read
- [ ] 3.3.7 RLS policies for `notifications` - users read/update own only
- [ ] 3.3.8 RLS policies for `posts` - collective members read, authors write own
- [ ] 3.3.9 RLS policies for `chat_messages` - collective members only (read + write), leaders/assist-leaders can delete/pin
- [ ] 3.3.10 RLS policies for national admin tables - admin role check
- [ ] 3.3.11 RLS policies for donations/orders - users read own, admins read all
- [ ] 3.3.12 RLS policies for `global_announcements` - all authenticated read, admin/staff write
- [ ] 3.3.13 RLS policies for `staff_roles` - super_admin only
- [ ] 3.3.14 RLS policies for `audit_log` - super_admin read only
- [ ] 3.3.15 RLS policies for `merch_inventory` - admin/staff write, public read (stock counts)

### 3.4 Database Functions & Triggers
- [ ] 3.4.1 Trigger: auto-create `profiles` row on auth.users insert
- [ ] 3.4.2 Function: `get_user_impact_stats(user_id)` - aggregate impact for a user
- [ ] 3.4.3 Function: `get_collective_stats(collective_id)` - aggregate collective stats
- [ ] 3.4.4 Function: `get_national_stats()` - aggregate national impact dashboard
- [ ] 3.4.5 Function: `award_points(user_id, amount, reason)` - transactional point award
- [ ] 3.4.6 Function: `check_badge_criteria(user_id)` - evaluate and award badges
- [ ] 3.4.7 Trigger: on `event_registrations` insert → check capacity, auto-waitlist
- [ ] 3.4.8 Trigger: on `event_registrations` cancel → promote waitlist
- [ ] 3.4.9 Function: `get_leaderboard(collective_id, period)` - ranked members
- [ ] 3.4.10 Function: `get_collective_leaderboard(period)` - ranked collectives nationally
- [ ] 3.4.11 Function: `get_charity_impact_report(date_from, date_to, scope)` - registered charity impact data
- [ ] 3.4.12 Trigger: on `merch_orders` insert → decrement `merch_inventory` stock
- [ ] 3.4.13 Trigger: on `merch_inventory` update → notify admin if below low_stock_threshold
- [ ] 3.4.14 Function: `invite_collective_to_event(event_id, collective_id)` - create invites + notifications for all members

### 3.5 Storage Buckets
- [ ] 3.5.1 `avatars` bucket - profile photos (public, 2MB limit, image/* only)
- [ ] 3.5.2 `event-images` bucket - event cover photos (public, 5MB limit)
- [ ] 3.5.3 `post-images` bucket - social feed photos (public, 5MB limit)
- [ ] 3.5.4 `collective-images` bucket - collective covers (public, 5MB limit)
- [ ] 3.5.5 `badges` bucket - badge icon assets (public)
- [ ] 3.5.6 `chat-images` bucket - group chat photo attachments (authenticated, 5MB limit)
- [ ] 3.5.7 `merch-images` bucket - product photography (public, 5MB limit)
- [ ] 3.5.8 `chat-voice` bucket - voice message recordings (authenticated, 5MB limit, audio/*)
- [ ] 3.5.9 `chat-video` bucket - short video clips (authenticated, 20MB limit, video/*)
- [ ] 3.5.10 `impact-evidence` bucket - before/after photos for impact logging (authenticated, 5MB limit)
- [ ] 3.5.11 Configure image transforms (thumbnails: 200x200, medium: 600x600, large: 1200x1200)

### 3.6 Supabase Edge Functions
- [ ] 3.6.1 `send-email` - SendGrid integration wrapper
- [ ] 3.6.2 `stripe-webhook` - handle Stripe payment events (donations + merch + inventory updates)
- [ ] 3.6.3 `create-checkout` - Stripe checkout session for donations/merch
- [ ] 3.6.4 `process-event-complete` - post-event: trigger surveys, award points
- [ ] 3.6.5 `generate-qr` - generate QR codes for membership/check-in
- [ ] 3.6.6 `export-report` - generate CSV/PDF reports (impact, charity, members)
- [ ] 3.6.7 `send-push` - push notification dispatch (FCM/APNs)
- [ ] 3.6.8 `send-global-announcement` - create announcement + fan out notifications to target audience
- [ ] 3.6.9 `generate-charity-report` - formatted PDF for registered charity impact reporting

### 3.7 Realtime Subscriptions
- [ ] 3.7.1 Enable realtime on `notifications` table
- [ ] 3.7.2 Enable realtime on `event_registrations` (live RSVP counts)
- [ ] 3.7.3 Enable realtime on `posts` (live feed updates)
- [ ] 3.7.4 Enable realtime on `chat_messages` (live group chat)
- [ ] 3.7.5 Enable realtime on `global_announcements` (live announcement feed)

---

## 4. AUTHENTICATION & ONBOARDING

### 4.1 Auth Setup
- [ ] 4.1.1 Configure Supabase Auth - email/password provider
- [ ] 4.1.2 Configure Google OAuth provider
- [ ] 4.1.3 Configure Apple OAuth provider (required for iOS App Store)
- [ ] 4.1.4 Configure magic link / OTP email login option
- [ ] 4.1.5 Set up auth redirect URLs for Capacitor deep links
- [ ] 4.1.6 Configure email templates in Supabase (confirm, reset, magic link)
- [ ] 4.1.7 Auth state persistence via Capacitor secure storage
- [ ] 4.1.8 **Account merge handling** - if user signs up with email then tries Google OAuth with same email, link accounts automatically (Supabase identity linking)
- [ ] 4.1.9 **Suspended account handling** - show "Account suspended" screen with reason + appeal contact info (hello@coexistaus.org) when suspended user tries to login

### 4.2 Auth Screens
- [ ] 4.2.1 **Welcome/splash screen** - Co-Exist logo (black text on white), tagline, nature background, "Get Started" + "I have an account"
- [ ] 4.2.2 **Sign up screen** - email, password, name, agree to terms
- [ ] 4.2.3 **Login screen** - email + password, social buttons, forgot password link
- [ ] 4.2.4 **Forgot password screen** - email input, send reset link
- [ ] 4.2.5 **Email verification screen** - check your inbox message, resend button
- [ ] 4.2.6 Social auth buttons (Google, Apple) with native Capacitor plugin integration

### 4.3 Onboarding Flow (Post-signup)
- [ ] 4.3.1 **Step 1: Profile photo** - upload or skip
- [ ] 4.3.2 **Step 2: Your name & Instagram handle** - display name + optional @handle
- [ ] 4.3.3 **Step 3: Location** - "Where are you based?" to suggest local Collectives
- [ ] 4.3.4 **Step 4: Interests** - select conservation interests (multi-select chips: tree planting, beach cleanups, wildlife, etc.)
- [ ] 4.3.5 **Step 5: Join a Collective** - show nearby Collectives based on location, allow join or skip
- [ ] 4.3.6 **Step 6: Find your first event** - show upcoming events near them, one-tap RSVP
- [ ] 4.3.7 Progress dots/bar showing steps
- [ ] 4.3.8 "Skip for now" option on each step
- [ ] 4.3.9 Animated transitions between steps (slide/fade)

---

## 5. ROLE & PERMISSION SYSTEM

- [ ] 5.1 Define roles: `participant`, `assist_leader`, `co_leader`, `leader`, `national_staff`, `national_admin`, `super_admin`
- [ ] 5.2 Store user global role in `profiles.role` with default `participant`
- [ ] 5.3 Store collective-level role in `collective_members.role` (member/assist_leader/co_leader/leader)
- [ ] 5.4 `assist_leader` collective role - can moderate chat (pin/delete messages), help with check-ins, but cannot create events or manage members
- [ ] 5.5 Create `useAuth()` hook exposing: user, profile, role, isLeader, isAssistLeader, isStaff, isAdmin, isSuperAdmin
- [ ] 5.6 Create `<RoleGate>` component to conditionally render by role
- [ ] 5.7 Create route guards for leader-only, staff-only, and admin-only pages
- [ ] 5.8 Leader promotion flow - admin can promote participant to leader via dashboard
- [ ] 5.9 Co-leader assignment - leaders can assign co-leaders for their collective
- [ ] 5.10 Assist-leader assignment - leaders can assign assist-leaders for their collective
- [ ] 5.11 Role-based navigation - show/hide tabs and menu items by role
- [ ] 5.12 `staff_roles` granular permissions - super_admin can assign fine-grained permissions to staff (manage_users, manage_collectives, manage_content, manage_merch, manage_finances, send_announcements)

---

## 6. APP SHELL & NAVIGATION

### 6.1 Navigation Structure
- [ ] 6.1.1 **Bottom tab bar** (participant view):
  - Home (discovery feed)
  - Explore (map/search)
  - My Events (upcoming + past)
  - Community (social feed + chat)
  - Profile (me)
- [ ] 6.1.2 **Bottom tab bar** (leader view): same tabs, plus floating "+" button to create event
- [ ] 6.1.3 **Admin view**: separate web-responsive dashboard layout (sidebar nav) - accessible from both app and web
- [ ] 6.1.4 Tab bar icons - filled when active, outlined when inactive, **always perfectly centred in their hit area**
- [ ] 6.1.5 Tab bar labels below icons
- [ ] 6.1.6 Badge count on Community tab (unread chat messages + notifications)
- [ ] 6.1.7 Announcements bell icon in top header (unread announcement dot)

### 6.2 App Shell
- [ ] 6.2.1 Status bar styling (light/dark based on screen)
- [ ] 6.2.2 Safe area handling (notch, home indicator, Android nav bar)
- [ ] 6.2.3 Splash screen (Co-Exist logo - black text on white, brand colours, auto-dismiss)
- [ ] 6.2.4 App icon design (iOS + Android adaptive icon)
- [ ] 6.2.5 Haptic feedback on tab switch (Capacitor Haptics)
- [ ] 6.2.6 Back gesture handling (Android back, iOS swipe-back)
- [ ] 6.2.7 Web layout shell - same app, wider content area, sidebar on desktop, no bottom tabs (top nav instead)

---

## 7. HOME / DISCOVERY FEED

- [ ] 7.1 **Hero section** - featured event or campaign banner (carousel if multiple)
- [ ] 7.2 **"Upcoming near you"** - horizontal scroll of event cards (location-based)
- [ ] 7.3 **"Your Collective"** - card showing next event in user's collective + quick stats
- [ ] 7.4 **"Trending Collectives"** - horizontal scroll for users not yet in a collective
- [ ] 7.5 **"Your Impact"** - compact stat bar (events attended, trees planted, hours)
- [ ] 7.6 **"National Challenge"** - active challenge card with progress
- [ ] 7.7 **Category quick-filters** - chips for activity types (tree planting, beach cleanup, etc.)
- [ ] 7.8 Pull-to-refresh
- [ ] 7.9 Skeleton loading state for each section
- [ ] 7.10 Empty state for new users with no data yet (guided CTA)
- [ ] 7.11 Greeting with user's first name + time of day ("Good morning, Sarah")
- [ ] 7.12 **Latest announcement banner** - pinned/urgent announcements shown at top
- [ ] 7.13 **"People you may know"** - suggested connections from shared events/collectives (horizontal avatar scroll)

---

## 8. EVENT SYSTEM - PARTICIPANT

### 8.1 Event Discovery
- [ ] 8.1.1 **List view** - scrollable list of upcoming events with card preview
- [ ] 8.1.2 **Map view** - map with **custom styled Co-Exist pins** (not default markers), tappable for preview card
- [ ] 8.1.3 Filter by: activity type, date range, distance, collective
- [ ] 8.1.4 Sort by: date, distance, popularity
- [ ] 8.1.5 Search events by keyword
- [ ] 8.1.6 Toggle between list/map views

### 8.2 Event Detail Page
- [ ] 8.2.1 Cover image (hero, parallax scroll effect)
- [ ] 8.2.2 Event title, date/time, duration
- [ ] 8.2.3 Location with **nicely styled map pin** + "Get Directions" (opens native maps)
- [ ] 8.2.4 Activity type badge
- [ ] 8.2.5 Collective hosting info (tappable → collective page)
- [ ] 8.2.6 Description (expandable if long)
- [ ] 8.2.7 What to bring / what to expect / what to wear section
- [ ] 8.2.7a **Accessibility info** - wheelchair access, terrain type, difficulty rating (easy/moderate/challenging), facilities available
- [ ] 8.2.7b **Event countdown** - "Starts in 2 days" or "Starts in 3 hours" on registered event cards
- [ ] 8.2.8 Attendee count + capacity (e.g. "23/30 spots filled")
- [ ] 8.2.9 Attendee avatars row (first 5-8 faces)
- [ ] 8.2.10 **Register button** - sticky bottom CTA
- [ ] 8.2.11 Waitlist state when full (auto-join waitlist)
- [ ] 8.2.12 Already registered state - shows "You're going!" with cancel option
- [ ] 8.2.13 **"Invited" state** - if user was invited via collective event invite, show who invited
- [ ] 8.2.14 Share button (native share sheet - link to public event page)
- [ ] 8.2.15 Add to calendar button
- [ ] 8.2.16 Event photos section (post-event, from attendees)
- [ ] 8.2.17 Impact summary section (post-event, from leader logging)

### 8.3 My Events
- [ ] 8.3.1 **Upcoming tab** - events user is registered for, sorted by date
- [ ] 8.3.2 **Invited tab** - events user has been invited to via collective
- [ ] 8.3.3 **Past tab** - completed events with impact data shown
- [ ] 8.3.4 Event card shows: date, title, collective, status (registered/waitlisted/attended/invited)
- [ ] 8.3.5 Quick action: cancel registration (with confirmation)
- [ ] 8.3.6 Tap to view event detail

### 8.4 Event Check-in
- [ ] 8.4.1 QR code scanner page (camera permission flow)
- [ ] 8.4.2 Manual check-in option (enter code or leader marks attendance)
- [ ] 8.4.3 Check-in confirmation animation (confetti/celebration)
- [ ] 8.4.4 Points awarded notification after check-in
- [ ] 8.4.5 Offline check-in capability (queue and sync when back online)

---

## 9. EVENT SYSTEM - LEADER TOOLS

### 9.1 Event Creation Wizard
- [ ] 9.1.1 **Step 1: Basics** - title, activity type, description
- [ ] 9.1.2 **Step 2: Date & Time** - start date/time, end date/time, recurring option
- [ ] 9.1.2a **Recurring event series** - create linked series (weekly/fortnightly/monthly), "edit this event" vs "edit all future events" vs "edit entire series"
- [ ] 9.1.3 **Step 3: Location** - address search + map pin placement (styled pin)
- [ ] 9.1.4 **Step 4: Details** - capacity, what to bring, meeting point notes, **accessibility info** (wheelchair access, terrain difficulty, facilities), **difficulty rating** (easy/moderate/challenging), **what to wear** recommendations
- [ ] 9.1.5 **Step 5: Cover Image** - upload or choose from library
- [ ] 9.1.6 **Step 6: Visibility** - public (discoverable) or collective-only
- [ ] 9.1.7 **Step 7: Invite Collective** - option to auto-invite all collective members
- [ ] 9.1.8 **Step 8: Review & Publish** - preview card, publish or save as draft
- [ ] 9.1.9 Draft → Published → Completed lifecycle management
- [ ] 9.1.10 Edit event (pre-event only, notify registered users of changes)
- [ ] 9.1.11 Cancel event (with required reason, auto-notify all registered)
- [ ] 9.1.12 Duplicate event (quick copy for recurring sessions)
- [ ] 9.1.13 **Event co-hosting** - events can be co-hosted by multiple collectives (shows in both collectives' feeds, members from both can register)
- [ ] 9.1.14 **Partner/sponsor collaboration** - tag external organisation/company as event partner (logo shown on event page)
- [ ] 9.1.15 **Weather/cancellation advisory** - leader can post weather warning or cancellation advisory (push notification to registered), link to BOM conditions
- [ ] 9.1.16 **Capacity change after publish** - if capacity increased, auto-promote from waitlist; if decreased, warn if over-registered
- [ ] 9.1.17 **Carpooling/transport coordination** - optional "Lift offered" / "Lift needed" section on event for remote sites

### 9.2 Event Day Management
- [ ] 9.2.1 **Attendance view** - list of registered users with check-in status
- [ ] 9.2.2 **QR code display** - show QR for participants to scan
- [ ] 9.2.3 **Manual check-in** - tap to mark individual as attended
- [ ] 9.2.4 **Bulk check-in** - "Mark all present" with confirmation
- [ ] 9.2.5 Live attendee count vs registered count
- [ ] 9.2.6 No-show tracking (registered but didn't attend)

### 9.3 Post-Event Impact Logging
- [ ] 9.3.1 **Impact form** - triggered after event end time, or manually
- [ ] 9.3.2 Pre-populated fields based on activity type:
  - Tree planting: trees planted, native species, area (sqm)
  - Beach cleanup: rubbish collected (kg), coastline cleaned (m)
  - Habitat restoration: area restored (sqm), weeds removed, native plants
  - General: hours volunteered (auto-calc from duration × attendees)
- [ ] 9.3.3 Photo upload - event photos from leader
- [ ] 9.3.4 Notes field - qualitative observations
- [ ] 9.3.5 Submit & auto-distribute impact to attendee profiles
- [ ] 9.3.6 Edit impact data (within 48 hours)
- [ ] 9.3.7 **Photo evidence requirement** - optional toggle per event: require at least one photo as verification before impact submission
- [ ] 9.3.8 **Before/after photos** - structured upload: before photo (at start) + after photo (at end) for restoration sites, displayed as comparison slider
- [ ] 9.3.9 **Species tracking** - which native species were planted (select from species list or add custom), not just total count
- [ ] 9.3.10 **GPS area polygon** - draw area on map that was worked (polygon or circle), to visualise area restored/cleaned on impact dashboards
- [ ] 9.3.11 **Volunteer hour verification** - generate signed verification letter/PDF for a user's hours (for uni credit, Duke of Edinburgh, corporate volunteering requirements, resume)
- [ ] 9.3.12 **Impact data correction/dispute** - admin can flag and correct incorrect impact data, with audit trail of changes

### 9.4 Waitlist Management
- [ ] 9.4.1 View waitlist with position numbers
- [ ] 9.4.2 Auto-promote when spot opens (notify promoted user)
- [ ] 9.4.3 Manual override to add from waitlist

### 9.5 Event Invites
- [ ] 9.5.1 **Invite collective members** - send event invite to all members of the leader's collective
- [ ] 9.5.2 Invite notification sent to all collective members (push + in-app)
- [ ] 9.5.3 Invite shows in members' "Invited" events tab
- [ ] 9.5.4 One-tap accept (auto-register) or decline from invite
- [ ] 9.5.5 Track invite acceptance rate (leader dashboard stat)

---

## 10. COLLECTIVE (LOCAL GROUP) SYSTEM

### 10.1 Collective Pages
- [ ] 10.1.1 **Collective profile page** - cover image, name, location, description, member count
- [ ] 10.1.2 Leader(s) + assist leaders shown with avatar and name
- [ ] 10.1.3 Upcoming events list for this collective
- [ ] 10.1.4 Past events with impact summary
- [ ] 10.1.5 Member gallery (avatar grid)
- [ ] 10.1.6 Collective stats: total impact, events run, active members
- [ ] 10.1.7 "Join this Collective" button (or "You're a member" state)
- [ ] 10.1.8 Share collective link
- [ ] 10.1.9 **Map showing collective location** - with nicely styled Co-Exist branded pin
- [ ] 10.1.10 **"Chat" button** - jump to collective group chat

### 10.2 Collective Discovery
- [ ] 10.2.1 **Map view** - all collectives on a national map, cluster at zoom levels, **custom styled pins**
- [ ] 10.2.2 **List view** - collectives near user, sorted by distance
- [ ] 10.2.3 Search by name or location
- [ ] 10.2.4 Filter by state/region

### 10.3 Collective Membership
- [ ] 10.3.1 **Leave collective** - member can leave with confirmation ("Are you sure? You'll lose access to the group chat")
- [ ] 10.3.2 **Switch collective** - leave current + join another (or be in multiple - see 10.3.3)
- [ ] 10.3.3 **Multi-collective membership** - users can belong to multiple collectives (e.g. moved cities, or attends events in two areas)
- [ ] 10.3.4 Multi-collective UX - chat switcher, feed shows posts from all collectives, events from all collectives in My Events
- [ ] 10.3.5 **Primary collective** - user selects one as "primary" for leaderboards and profile display

### 10.4 Collective Management (Leader)
- [ ] 10.4.1 Edit collective profile (name, description, cover image)
- [ ] 10.4.2 View full member list with search
- [ ] 10.4.3 Remove member (with confirmation)
- [ ] 10.4.4 Assign/remove co-leader role
- [ ] 10.4.5 Assign/remove assist-leader role
- [ ] 10.4.6 Export member list (CSV)
- [ ] 10.4.7 Collective-wide announcement (push + in-app)
- [ ] 10.4.8 **Tap member → view user card** (avatar, name, insta handle, collective badge, location pin on map)

---

## 11. COLLECTIVE GROUP CHAT

### 11.1 Chat Core
- [ ] 11.1.1 **Chat page** - per-collective group chat, accessible from Community tab or collective page
- [ ] 11.1.2 Real-time messaging via Supabase Realtime (subscribe to `chat_messages` where collective_id matches)
- [ ] 11.1.3 Message list - newest at bottom, auto-scroll on new message
- [ ] 11.1.4 Send text message
- [ ] 11.1.5 Send photo message (camera or gallery → upload to `chat-images` bucket)
- [ ] 11.1.6 Reply to message (quote-reply style)
- [ ] 11.1.7 Message timestamp (relative: "2m ago", "Yesterday 3:12pm")
- [ ] 11.1.8 Sender avatar + name on each message
- [ ] 11.1.9 Unread count badge on chat entry point
- [ ] 11.1.10 Read receipt tracking (last_read_at per user per collective)
- [ ] 11.1.11 Infinite scroll for message history (load older on scroll up)

### 11.2 Chat User Interactions
- [ ] 11.2.1 **Tap user avatar/name in chat → user card popup**
- [ ] 11.2.2 User card shows: avatar, display name, Instagram handle (tappable → opens IG), collective membership badge, member since date
- [ ] 11.2.3 User card shows: **mini map with styled pin** of user's location (if they've set one)
- [ ] 11.2.4 User card: "View Profile" button → full profile page
- [ ] 11.2.5 User card: quick stats (events attended, impact highlights)

### 11.3 Chat Moderation (Leader + Assist Leader)
- [ ] 11.3.1 **Pin message** - pinned messages shown at top of chat
- [ ] 11.3.2 **Delete message** - soft delete with "[message removed by moderator]"
- [ ] 11.3.3 **Mute member** - temporarily prevent sending (with duration selector)
- [ ] 11.3.4 Leader/co-leader/assist-leader indicated with role badge next to name in chat

### 11.4 Chat Features
- [ ] 11.4.1 Typing indicator ("Sarah is typing...")
- [ ] 11.4.2 Link previews (basic URL unfurling)
- [ ] 11.4.3 @mention support (type @ to search collective members)
- [ ] 11.4.4 Notification for @mentions (separate from general chat notifications)
- [ ] 11.4.5 Chat notification preferences (mute chat, mute except @mentions, all)
- [ ] 11.4.6 **Message search** - search within chat history by keyword
- [ ] 11.4.7 **Chat export** (leader) - export chat log for a date range as text/CSV (for records or incident review)
- [ ] 11.4.8 **Edit message** - sender can edit own message (within 15 minutes), show "(edited)" indicator
- [ ] 11.4.9 **Video clip messages** - short video attachments (Capacitor Camera plugin, max 30s / 20MB)
- [ ] 11.4.10 **Voice message** - hold-to-record voice note, playback with waveform visualisation
- [ ] 11.4.11 **Location sharing** - share current location as tappable map pin in chat
- [ ] 11.4.12 **Event link in chat** - paste/share event link → renders as rich event card preview in chat (tappable → event detail)

---

## 12. USER PROFILE & DIGITAL MEMBERSHIP

### 12.1 Profile Page
- [ ] 12.1.1 **My profile** - avatar, name, pronouns, bio, location, Instagram handle, member since date
- [ ] 12.1.2 **Digital membership card** - visual card with QR code, member ID, name
- [ ] 12.1.3 Membership tier display (based on points/activity)
- [ ] 12.1.4 **My Collective(s) showcase** - collective badge/card showing which collective they belong to
- [ ] 12.1.5 Quick stats row: events attended, hours, trees planted
- [ ] 12.1.6 **Badge showcase** - grid of earned badges (greyed for locked)
- [ ] 12.1.7 **Impact timeline** - chronological feed of conservation contributions
- [ ] 12.1.8 **Instagram handle** - displayed with IG icon, tappable to open Instagram profile
- [ ] 12.1.9 **Location map** - small map preview with styled pin showing user's area
- [ ] 12.1.10 **Interests displayed** - conservation interest chips from onboarding shown on profile (editable)
- [ ] 12.1.11 **Share profile link** - shareable URL or card for social media (Instagram story-friendly)
- [ ] 12.1.12 **Pronouns field** - optional, shown next to name (he/him, she/her, they/them, custom)

### 12.2 View Other User's Profile (from chat tap, member list, etc.)
- [ ] 12.2.1 Same layout as own profile but read-only
- [ ] 12.2.2 Shows: avatar, name, bio, Instagram handle, collective(s), badges, stats
- [ ] 12.2.3 **Mini map with styled pin** showing their general location
- [ ] 12.2.4 "You're both in [Collective Name]" connection indicator if shared collective
- [ ] 12.2.5 **Mutual connections** - "You've attended 3 events together" / "You're both in Byron Bay Collective"
- [ ] 12.2.6 **"People you may know"** - suggested connections based on shared collective, shared events, nearby location

### 12.3 Edit Profile
- [ ] 12.3.1 Change avatar (camera or gallery, crop tool)
- [ ] 12.3.2 Edit display name
- [ ] 12.3.3 Edit pronouns
- [ ] 12.3.4 Edit bio
- [ ] 12.3.5 Edit Instagram handle
- [ ] 12.3.6 Edit location (with map pin selector)
- [ ] 12.3.7 Edit conservation interests (multi-select chips)
- [ ] 12.3.8 Edit contact details (email, phone)
- [ ] 12.3.9 Privacy settings (profile visibility: public/collective-only/private)

### 12.4 Membership Card
- [ ] 12.4.1 Visual card design (Co-Exist branded, nature texture background)
- [ ] 12.4.2 QR code containing user ID (for event check-in)
- [ ] 12.4.3 Member tier badge on card
- [ ] 12.4.4 "Add to Apple Wallet" / "Add to Google Wallet" integration
- [ ] 12.4.5 Screenshot-friendly layout

---

## 13. IMPACT TRACKING & STATS

### 13.1 Personal Impact Dashboard
- [ ] 13.1.1 **Hero stat cards** - total trees planted, hours volunteered, events attended, rubbish collected
- [ ] 13.1.2 Activity chart - events per month (bar chart)
- [ ] 13.1.3 Impact by category - breakdown pie/donut chart
- [ ] 13.1.4 Streak tracker - consecutive weeks/months active
- [ ] 13.1.5 "Conservation journey" timeline - key milestones
- [ ] 13.1.6 Comparison to national average ("You've planted 3x more trees than average!")
- [ ] 13.1.7 Shareable impact card (designed for Instagram stories)
- [ ] 13.1.8 **Annual recap / Year-in-Review** - "Your 2026 with Co-Exist" - auto-generated story-style recap of the year (events attended, trees planted, badges earned, collective highlights, top moments), shareable as Instagram story cards

### 13.2 Impact Data Model
- [ ] 13.2.1 Aggregate per-user from all attended events
- [ ] 13.2.2 Aggregate per-collective from all collective events
- [ ] 13.2.3 Aggregate national from all events
- [ ] 13.2.4 Time-series aggregation (weekly, monthly, quarterly, annual)
- [ ] 13.2.5 Supabase views/functions for fast dashboard queries

---

## 14. CHARITY IMPACT REPORTING

> Full registered charity impact reporting backend for leaders, Co-Exist staff, and external reporting

### 14.1 Report Types
- [ ] 14.1.1 **Collective Impact Report** - per-collective, date-range filtered, showing all impact metrics, event count, volunteer hours, member participation
- [ ] 14.1.2 **National Impact Report** - all collectives aggregated, for board/grant reporting
- [ ] 14.1.3 **Event Impact Report** - per-event detail with attendees, impact data, photos
- [ ] 14.1.4 **Annual Charity Report** - formatted for registered charity annual reporting obligations (ACNC in Australia)
- [ ] 14.1.5 **Donor Impact Report** - how donations were used, linked to conservation outcomes

### 14.2 Report Access
- [ ] 14.2.1 **Collective leaders** - can generate reports for their own collective
- [ ] 14.2.2 **Co-Exist staff** - can generate reports for any/all collectives
- [ ] 14.2.3 **National admins** - full access to all reporting
- [ ] 14.2.4 **Export formats**: PDF (branded with Co-Exist logo, charts, summary), CSV (raw data)

### 14.3 Report Builder UI
- [ ] 14.3.1 Date range selector (preset: this month, this quarter, this year, last FY, custom)
- [ ] 14.3.2 Scope selector (specific collective, state/region, national)
- [ ] 14.3.3 Metric selector (which impact metrics to include)
- [ ] 14.3.4 Preview before export
- [ ] 14.3.5 Schedule recurring reports (e.g. monthly email to board)
- [ ] 14.3.6 Report history - list of previously generated reports

---

## 15. GAMIFICATION & REWARDS

### 15.1 Points System
- [ ] 15.1.1 Define point values:
  - Event attendance: 100 pts
  - First event: 250 pts bonus
  - Event check-in (QR): 50 pts bonus
  - Referral (friend attends first event): 200 pts
  - Post event photo: 25 pts
  - Complete profile: 50 pts
  - Join a collective: 50 pts
  - Streak bonus: 50 pts per consecutive week
- [ ] 15.1.2 Points balance shown in profile and header
- [ ] 15.1.3 Points history page (ledger view)
- [ ] 15.1.4 Animated points award notification

### 15.2 Badges
- [ ] 15.2.1 **First Steps** badges:
  - "First Event" - attend your first event
  - "Profile Complete" - fill out full profile
  - "Connected" - join a collective
  - "Recruiter" - refer a friend who attends
- [ ] 15.2.2 **Activity milestones**:
  - "Seedling" → "Sapling" → "Canopy" (5/25/100 events)
  - "Tree Guardian" (100 trees planted)
  - "Shore Keeper" (10 beach cleanups)
  - "Trail Blazer" (10 nature walks)
  - "Habitat Hero" (10 restoration events)
- [ ] 15.2.3 **Streak badges**:
  - "Week Warrior" (4 consecutive weeks)
  - "Month Maven" (3 consecutive months)
  - "Year-Round" (12 months active)
- [ ] 15.2.4 **Special badges**:
  - "Founding Member" (joined in first 3 months)
  - "Challenge Champion" (complete a national challenge)
  - "Community Builder" (refer 10+ people)
  - "Leader" (become a collective leader)
- [ ] 15.2.5 Badge detail modal - description, criteria, progress bar, date earned
- [ ] 15.2.6 Badge unlock animation (celebration, confetti)
- [ ] 15.2.7 Badge share card (designed for social sharing)

### 15.3 Leaderboards
- [ ] 15.3.1 **Individual leaderboard** - within collective, by points (this month / all time)
- [ ] 15.3.2 **Collective leaderboard** - nationally, by total impact metrics
- [ ] 15.3.3 User's rank shown prominently
- [ ] 15.3.4 Top 3 highlighted with medals (gold/silver/bronze)
- [ ] 15.3.5 Filter by time period (week/month/quarter/year/all-time)
- [ ] 15.3.6 Filter by metric (points, trees, events, hours)

### 15.4 Rewards Store
- [ ] 15.4.1 Browse partner offers (card grid)
- [ ] 15.4.2 Offer detail - description, points cost, partner info, terms
- [ ] 15.4.3 Redeem flow - confirm spend points, receive code/voucher
- [ ] 15.4.4 My rewards - list of redeemed offers with codes
- [ ] 15.4.5 Expired/used tracking

### 15.5 Membership Tiers
- [ ] 15.5.1 Define tiers:
  - Seedling (0–499 pts)
  - Sapling (500–1999 pts)
  - Native (2000–4999 pts)
  - Canopy (5000–9999 pts)
  - Elder (10000+ pts)
- [ ] 15.5.2 Tier progression bar on profile
- [ ] 15.5.3 Tier-up celebration animation
- [ ] 15.5.4 Tier badge on membership card and avatar ring

---

## 16. SOCIAL & COMMUNITY FEED

- [ ] 16.1 **Feed view** - scrollable feed of posts from user's collective(s)
- [ ] 16.2 Post types:
  - Photo post (from events)
  - Milestone post (auto-generated: "Sarah earned Tree Guardian badge!")
  - Event recap (auto-generated from impact data)
  - Leader announcement
- [ ] 16.3 Like button with count + animation (heart/leaf)
- [ ] 16.4 Comment system (text replies on posts)
- [ ] 16.5 Create post - photo + caption, tag event
- [ ] 16.6 Report/flag post (any user can report, goes to moderation queue)
- [ ] 16.7 Pull-to-refresh + infinite scroll
- [ ] 16.8 Empty state for new collective feeds
- [ ] 16.9 **Tap user avatar on post → user card / profile** (same pattern as chat)
- [ ] 16.10 **Post sharing** - share post to other collectives or external (native share sheet)
- [ ] 16.11 **Event photo tagging** - tag people in photos ("Sarah, Jake, and 3 others were here")
- [ ] 16.12 **Content moderation queue** (admin) - single view of all flagged/reported posts, photos, and chat messages with approve/remove/warn actions
- [ ] 16.13 **Post by any member** - any collective member can create posts (not just leaders), leaders/assist-leaders moderate
- [ ] 16.14 **Post comments** - threaded comment replies on posts (not just likes)

---

## 17. NOTIFICATIONS & COMMUNICATIONS

### 17.1 In-App Notifications
- [ ] 17.1.1 Notification bell icon with unread badge count
- [ ] 17.1.2 Notification list page - grouped by day
- [ ] 17.1.3 Notification types:
  - Event reminder (24h before, 2h before)
  - Registration confirmation
  - Waitlist promotion
  - Event cancelled/updated
  - Points earned
  - Badge unlocked
  - New event in your collective
  - **Event invite from collective leader**
  - Leader announcement
  - **Global announcement from Co-Exist staff**
  - Challenge update
  - Waitlist spot opened
  - **Chat @mention**
  - **New chat message (configurable)**
- [ ] 17.1.4 Tap notification → deep link to relevant screen
- [ ] 17.1.5 Mark as read (individual + mark all)
- [ ] 17.1.6 Notification preferences (toggle by type)
- [ ] 17.1.7 **Notification batching/digest** - bundle multiple chat messages into one notification ("12 new messages in Byron Bay Collective") instead of 12 separate pushes
- [ ] 17.1.8 **Quiet hours / Do Not Disturb** - schedule (e.g. 10pm–7am) where push notifications are silenced, in-app still accumulate
- [ ] 17.1.9 **Distinct notification sounds** - different sounds for chat vs events vs announcements (configurable in settings)
- [ ] 17.1.10 **Empty inbox celebration** - when all notifications are read, show "All caught up!" with nature illustration + animation

### 17.2 Communication Channels
- [ ] 17.2.1 In-app push (Supabase realtime → local notification)
- [ ] 17.2.2 Native push via FCM (Android) + APNs (iOS)
- [ ] 17.2.3 Email via SendGrid (transactional + marketing templates)
- [ ] 17.2.4 SMS option for critical reminders (via SendGrid or Twilio)

---

## 18. GLOBAL ANNOUNCEMENTS FEED

> Connected to notifications - admin/staff can broadcast to all users, all leaders, or specific collectives

- [ ] 18.1 **Announcements feed page** - accessible from bell icon or dedicated section
- [ ] 18.2 **Announcement card** - title, content, author (staff name + role), timestamp, optional image
- [ ] 18.3 **Priority levels**: normal (appears in feed), urgent (appears as banner on home + push notification)
- [ ] 18.4 **Target audience**: all users, leaders only, specific collective(s)
- [ ] 18.5 **Pinned announcements** - stay at top of feed
- [ ] 18.6 **Read tracking** - mark as read, show unread count
- [ ] 18.7 **Create announcement** (staff/admin) - title, content, image, priority, target audience
- [ ] 18.8 **Schedule announcement** - publish at a future date/time
- [ ] 18.9 **Auto-notify** - announcement creation triggers push notification + in-app notification to all targeted users
- [ ] 18.10 Announcement history - all past announcements searchable
- [ ] 18.11 **Announcement analytics** - read rate, reach (admin view)

---

## 19. DONATIONS & MERCH STORE

### 19.1 Donations
- [ ] 19.1.1 **Donate page** - purpose description, project options
- [ ] 19.1.2 Preset amount buttons ($5, $10, $25, $50, custom)
- [ ] 19.1.3 Optional message with donation
- [ ] 19.1.4 Stripe Checkout integration (redirect or embedded)
- [ ] 19.1.5 Donation confirmation + thank you screen
- [ ] 19.1.6 Donation receipt email (via SendGrid)
- [ ] 19.1.7 Donation history in profile
- [ ] 19.1.8 Points awarded for donations (optional - discuss with Kurt)
- [ ] 19.1.9 **Recurring donations** - monthly giving option via Stripe Subscriptions, manage/cancel from profile
- [ ] 19.1.10 **Donation goal/thermometer** - per-project fundraising goals with visual progress bar ("$3,200 of $5,000 raised for Coastal Restoration")
- [ ] 19.1.11 **Tax-deductible receipts** - if Co-Exist has DGR (Deductible Gift Recipient) status, auto-generate ATO-compliant donation receipts with ABN, DGR endorsement number
- [ ] 19.1.12 **Corporate/group donation flow** - allow donations on behalf of an organisation, with organisation name on receipt
- [ ] 19.1.13 **Donor wall** - public recognition page (opt-in), showing donor names/organisations and amounts for transparency

### 19.2 Merch Store (Customer-Facing)
- [ ] 19.2.1 **Product listing page** - grid of merch items with **non-generic card styling**
- [ ] 19.2.2 **Product detail** - images (swipeable), description, variant selector (size + colour), price, stock availability
- [ ] 19.2.3 Add to cart
- [ ] 19.2.4 Cart page - items, quantities, variants, total
- [ ] 19.2.5 Checkout via Stripe
- [ ] 19.2.6 Shipping address input
- [ ] 19.2.7 Order confirmation + email
- [ ] 19.2.8 Order history in profile
- [ ] 19.2.9 Order status tracking (pending/processing/shipped/delivered)
- [ ] 19.2.10 "Out of stock" state with "Notify me when available" option
- [ ] 19.2.11 **Shipping rate display** - flat rate or calculated, shown before checkout
- [ ] 19.2.12 **Promo/discount codes** - apply at checkout for percentage or dollar off
- [ ] 19.2.13 **Cart abandonment recovery** - if user has items in cart but doesn't checkout within 24h, send reminder email (SendGrid)
- [ ] 19.2.14 **Product reviews/ratings** - star rating + text review by verified purchasers
- [ ] 19.2.15 **"Related products"** - show related items on product detail page
- [ ] 19.2.16 **Returns/exchanges flow** - request return from order history, admin approves, refund triggered

---

## 20. MERCH & STOCK MANAGEMENT (ADMIN)

- [ ] 20.1 **Product CRUD** - create/edit/archive merch products
- [ ] 20.2 **Product images** - upload multiple images per product, reorder
- [ ] 20.3 **Variants management** - define size/colour combinations per product
- [ ] 20.4 **Inventory tracking** - stock count per variant, auto-decrement on order
- [ ] 20.5 **Low stock alerts** - configurable threshold, notification to admin when stock drops below
- [ ] 20.6 **Stock adjustment** - manual add/remove stock with reason (restock, damage, return)
- [ ] 20.7 **Order management dashboard** - all orders, filter by status, search by customer
- [ ] 20.8 **Order detail** - items, shipping address, payment status, order timeline
- [ ] 20.9 **Update order status** - mark as processing/shipped (add tracking number)/delivered
- [ ] 20.10 **Refund order** - trigger Stripe refund, update status
- [ ] 20.11 **Sales analytics** - revenue, units sold, by product, by period
- [ ] 20.12 **Pricing management** - update prices, create sale pricing
- [ ] 20.13 **Export orders** - CSV export of all orders with filters
- [ ] 20.14 **Promo code management** - create/edit/deactivate promo codes (percentage off, flat amount, free shipping, usage limits, expiry)
- [ ] 20.15 **Shipping configuration** - set flat rate, free shipping threshold, state-based rates
- [ ] 20.16 **Returns management** - view return requests, approve/deny, trigger refunds
- [ ] 20.17 **Review moderation** - approve/remove product reviews

---

## 21. LEADER DASHBOARD

- [ ] 21.1 **Overview cards** - active members, upcoming events, total hours this month, events this month
- [ ] 21.2 **Upcoming events list** - with RSVP counts, quick actions
- [ ] 21.3 **Recent activity** - new members, recent check-ins
- [ ] 21.4 **Member engagement scores** - highlight highly active + at-risk (inactive 30+ days)
- [ ] 21.5 **Quick actions** - create event, send announcement, view members, log impact, invite collective to event
- [ ] 21.6 **Event calendar view** - month view with event dots
- [ ] 21.7 **Member list** - searchable, sortable, with attendance stats, **tap to view user card/profile**
- [ ] 21.8 **Export tools** - member list CSV, attendance CSV, impact report CSV
- [ ] 21.9 **Notification centre** - pending items needing attention (impact not logged, etc.)
- [ ] 21.10 Accessible from within the mobile app (responsive, not separate web portal)
- [ ] 21.11 **Charity impact reporting** - generate impact reports for their collective (see §14)
- [ ] 21.12 **Event invite stats** - acceptance rates for collective event invites

---

## 22. NATIONAL ADMIN DASHBOARD

- [ ] 22.1 **Web-responsive layout** - sidebar nav, works on desktop and tablet and mobile
- [ ] 22.2 **Overview** - total members, total collectives, total events, total impact (all-time + this period)
- [ ] 22.3 **Collectives management** - list all collectives, health scores, leader info, create/archive
- [ ] 22.4 **User management** - search users, view profile, change role, deactivate (see §23 for full detail)
- [ ] 22.5 **Event oversight** - all events nationally, filter by collective/region/status
- [ ] 22.6 **Impact reporting** - national aggregated stats with date range filters
- [ ] 22.7 **Geographic heat map** - activity density by region (Mapbox choropleth or marker clusters)
- [ ] 22.8 **Communications** - send national announcements via announcements feed (see §18)
- [ ] 22.9 **Partner management** - CRUD for partner offers and discounts
- [ ] 22.10 **Challenge management** - create/edit/end national challenges
- [ ] 22.11 **Survey management** - create survey templates, view aggregate results
- [ ] 22.12 **Export centre** - PDF and CSV export for impact reports, member data, event data
- [ ] 22.13 **Audit log** - admin action history (who did what, when)
- [ ] 22.14 **Trend charts** - member growth, event frequency, impact over time (line/bar charts)
- [ ] 22.15 **Configurable date ranges** - this week, this month, this quarter, this year, custom
- [ ] 22.16 **Merch & stock management** - full access to §20
- [ ] 22.17 **Charity impact reporting** - full access to §14, all scopes
- [ ] 22.18 **System health dashboard** - Supabase usage (database size, storage used, realtime connections, edge function invocations, auth users), alert if nearing limits
- [ ] 22.19 **Feature flags system** - toggle features on/off without deploy (e.g. disable merch store during restock, enable beta features for specific collectives), stored in Supabase `feature_flags` table
- [ ] 22.20 **Content moderation queue** - unified view of all flagged/reported posts, photos, chat messages with approve/remove/warn actions (see §16.12)
- [ ] 22.21 **Email bounce/complaint handling** - surface SendGrid bounces and spam complaints, auto-disable email to bounced addresses
- [ ] 22.22 **ACNC charity details** - store and display ABN, DGR status, charity subtype, registration date in app settings (used in reports and receipts)
- [ ] 22.23 **Admin impersonation** - "View as user" mode for support/debugging (read-only, audit logged, no actions taken as user)

---

## 23. SUPER ADMIN - STAFF & USER MANAGEMENT

### 23.1 Staff Management
- [ ] 23.1.1 **Staff directory** - list all Co-Exist staff with roles and permissions
- [ ] 23.1.2 **Add staff member** - assign national_staff or national_admin role to existing user
- [ ] 23.1.3 **Granular permissions** - assign specific capabilities per staff member:
  - manage_users (view/edit/deactivate user profiles and roles)
  - manage_collectives (create/archive/reassign collectives)
  - manage_content (moderate posts, photos, chat messages)
  - manage_merch (product CRUD, inventory, orders)
  - manage_finances (view donations, refunds, financial reports)
  - send_announcements (create/publish global announcements)
- [ ] 23.1.4 **Revoke staff access** - remove staff role and permissions
- [ ] 23.1.5 **Permission audit** - view who has what permissions

### 23.2 User Profile Management (Admin)
- [ ] 23.2.1 **User search** - search by name, email, collective, role
- [ ] 23.2.2 **View any user profile** - full detail including all activity, events, impact
- [ ] 23.2.3 **Edit user profile** - update name, email, avatar, bio, role (when user requests help)
- [ ] 23.2.4 **Change user role** - promote/demote (participant ↔ leader ↔ staff ↔ admin)
- [ ] 23.2.5 **Assign user to collective** - move user between collectives
- [ ] 23.2.6 **Deactivate/suspend user** - disable account with reason, set duration (temporary/permanent)
- [ ] 23.2.6a **Suspension appeal flow** - suspended user sees reason + appeal form → admin receives appeal → approve (reinstate) or deny with message
- [ ] 23.2.6b **Ban history** - track all suspensions/bans per user with reasons and dates
- [ ] 23.2.7 **Delete user** - GDPR data removal (with confirmation + audit log)
- [ ] 23.2.8 **Reset user password** - trigger password reset email
- [ ] 23.2.9 **User activity log** - view login history, event attendance, etc.
- [ ] 23.2.10 **Bulk operations** - select multiple users for role change, collective assignment, etc.

---

## 24. NATIONAL IMPACT DASHBOARD

> Public-facing or admin-facing aggregate view

- [ ] 24.1 **Total trees planted** - big animated counter
- [ ] 24.2 **Total hours volunteered**
- [ ] 24.3 **Total rubbish collected (kg)**
- [ ] 24.4 **Total coastline cleaned (km)**
- [ ] 24.5 **Total events held**
- [ ] 24.6 **Total active members**
- [ ] 24.7 **Total collectives**
- [ ] 24.8 Geographic heat map of activity
- [ ] 24.9 Monthly/quarterly trend charts
- [ ] 24.10 Breakdown by activity type
- [ ] 24.11 Breakdown by state/region
- [ ] 24.12 Top performing collectives
- [ ] 24.13 Export to PDF (branded report for sponsors/grants)
- [ ] 24.14 Shareable link or embeddable widget for website

---

## 25. SURVEYS & FEEDBACK

- [ ] 25.1 Survey builder (admin/leader) - question types: multiple choice, rating (1-5), free text, yes/no
- [ ] 25.2 Auto-send survey after event completion (configurable)
- [ ] 25.3 Survey notification with deep link
- [ ] 25.4 Survey completion screen with thank you
- [ ] 25.5 Survey results dashboard - aggregate charts per question
- [ ] 25.6 Export survey results to CSV
- [ ] 25.7 Pre-built templates (post-event satisfaction, new member welcome, annual feedback)

---

## 26. PARTNER, SPONSOR & EXTERNAL COLLABORATION SYSTEM

### 26.1 Partner Offers & Rewards
- [ ] 26.1.1 Partner offers catalog (cards with brand logos)
- [ ] 26.1.2 Offer categories (outdoor gear, food/drink, experiences, etc.)
- [ ] 26.1.3 Points-based redemption
- [ ] 26.1.4 Offer detail page with T&Cs
- [ ] 26.1.5 Redemption tracking for partners (admin can view analytics)
- [ ] 26.1.6 Partner logo on event pages if sponsored
- [ ] 26.1.7 Admin CRUD for partner offers
- [ ] 26.1.8 Offer expiry handling and notifications

### 26.2 External Organisation Collaboration
- [ ] 26.2.1 `organisations` table - id, name, logo_url, website, type (corporate/ngo/government/community), contact_name, contact_email, description, created_at
- [ ] 26.2.2 **Organisation directory** (admin) - manage external organisations that Co-Exist collaborates with
- [ ] 26.2.3 **Tag events with partner organisations** - organisation logo + name shown on event card and detail page
- [ ] 26.2.4 **Joint events** - events co-run with external organisations (e.g. council cleanup days, corporate team volunteering)
- [ ] 26.2.5 **Organisation impact reporting** - filter impact data by partner organisation (for partner reporting)
- [ ] 26.2.6 **Corporate volunteer programs** - track participation from corporate partners separately, generate reports for their CSR requirements
- [ ] 26.2.7 **Sponsored challenges** - link national challenges to sponsor organisations (sponsor logo on challenge card)
- [ ] 26.2.8 **Invoice generation** - generate branded invoices for corporate sponsors/partners (admin)

---

## 27. CHALLENGES & CAMPAIGNS

- [ ] 27.1 **Challenge card** - title, description, dates, goal, progress
- [ ] 27.2 **Active challenges page** - list of current national challenges
- [ ] 27.3 **Join challenge** - one-tap, as individual or collective
- [ ] 27.4 **Challenge leaderboard** - individuals and collectives ranked
- [ ] 27.5 **Progress tracking** - auto-updated from event attendance/impact
- [ ] 27.6 **Challenge completion** - badge award, celebration, share card
- [ ] 27.7 **Challenge types**:
  - Seasonal (e.g. "Plant 10,000 trees this winter")
  - Community (e.g. "Every collective runs at least one beach cleanup in March")
  - Personal (e.g. "Attend 5 events this month")
- [ ] 27.8 Admin create/edit/end challenges
- [ ] 27.9 Challenge history (past campaigns with results)

---

## 28. SEARCH & FILTERING

- [ ] 28.1 **Global search** - search bar accessible from explore tab
- [ ] 28.2 Search across: events, collectives, users (by name)
- [ ] 28.3 Recent searches / search suggestions
- [ ] 28.4 Filter bottom sheet with:
  - Activity type multi-select
  - Date range picker
  - Distance radius slider
  - State/region dropdown
- [ ] 28.5 Active filter chips shown above results
- [ ] 28.6 Clear all filters option
- [ ] 28.7 Search results grouped by type (events, collectives, people)

---

## 29. OFFLINE & CONNECTIVITY

- [ ] 29.1 Detect offline state (Capacitor Network plugin)
- [ ] 29.2 Offline banner/indicator in app header
- [ ] 29.3 Cache critical data locally (my events, my profile, my collective)
- [ ] 29.4 Offline event check-in - queue check-ins, sync when back online
- [ ] 29.5 Offline event browsing for already-loaded events
- [ ] 29.6 Optimistic UI updates with background sync
- [ ] 29.7 Conflict resolution strategy (server wins, with user notification)

---

## 30. CALENDAR INTEGRATION

- [ ] 30.1 "Add to Calendar" button on event detail
- [ ] 30.2 Generate .ics file or use Capacitor calendar plugin
- [ ] 30.3 Google Calendar deep link
- [ ] 30.4 Apple Calendar deep link
- [ ] 30.5 Include event title, time, location, description in calendar entry
- [ ] 30.6 Pre-event reminder set in calendar (default 1 day before)

---

## 31. QR CODE SYSTEM

- [ ] 31.1 **Membership QR** - unique per user, shown on membership card, encodes user ID
- [ ] 31.2 **Event QR** - unique per event, generated by leader, displayed on leader's screen
- [ ] 31.3 **Scanner** - participant scans event QR to check in, OR leader scans member QR
- [ ] 31.4 QR generation library (client-side, e.g. `qrcode.react`)
- [ ] 31.5 QR scanning via camera (Capacitor Barcode Scanner plugin)
- [ ] 31.6 Validation - server-side verify registration before confirming check-in
- [ ] 31.7 Error handling - invalid QR, already checked in, not registered

---

## 32. PHOTO & MEDIA SYSTEM

- [ ] 32.1 Camera capture (Capacitor Camera plugin)
- [ ] 32.2 Gallery selection
- [ ] 32.3 Image compression before upload (client-side, target <500KB)
- [ ] 32.4 Upload to Supabase Storage with progress indicator
- [ ] 32.5 Image thumbnails via Supabase image transforms
- [ ] 32.6 Photo gallery view on event pages (masonry or grid layout)
- [ ] 32.7 Full-screen photo viewer (pinch to zoom, swipe between)
- [ ] 32.8 Photo moderation (leader/admin can remove inappropriate photos)
- [ ] 32.9 Photo attribution (photographer name/avatar)

---

## 33. EXPORT & REPORTING

- [ ] 33.1 Member list export (CSV) - name, email, join date, events attended, total hours
- [ ] 33.2 Attendance export (CSV) - per event: name, checked in Y/N, time
- [ ] 33.3 Impact report export (PDF) - branded template, charts, summary stats
- [ ] 33.4 Impact report export (CSV) - raw data per event
- [ ] 33.5 Survey results export (CSV)
- [ ] 33.6 Financial report (donations received) - admin only
- [ ] 33.7 Date range filtering for all exports
- [ ] 33.8 Collective-level or national-level scope selection
- [ ] 33.9 Merch order export (CSV) - for fulfilment
- [ ] 33.10 Charity annual report export (PDF) - ACNC-formatted
- [ ] 33.11 **Financial reconciliation report** - compare Stripe payments vs Supabase records, flag discrepancies (admin)
- [ ] 33.12 **GST report** - Australian GST on merch sales, GST-inclusive pricing, BAS-ready export
- [ ] 33.13 **Donation tax report** - annual summary of tax-deductible donations per donor (for DGR purposes)

---

## 34. SETTINGS & ACCOUNT MANAGEMENT

- [ ] 34.1 **Notification preferences** - toggle by notification type (events, chat, announcements, @mentions)
- [ ] 34.2 **Chat preferences** - mute specific collectives, mute except @mentions
- [ ] 34.3 **Privacy settings** - profile visibility, show on leaderboards
- [ ] 34.4 **Email preferences** - marketing emails opt-in/out
- [ ] 34.5 **Change password**
- [ ] 34.6 **Change email**
- [ ] 34.7 **Delete account** - GDPR compliant, data removal flow with confirmation
- [ ] 34.8 **About Co-Exist** - link to website, social media, mission statement
- [ ] 34.9 **Terms of Service** page
- [ ] 34.10 **Privacy Policy** page
- [ ] 34.11 **Help / FAQ** - basic support info
- [ ] 34.12 **Contact support** - email link or in-app form
- [ ] 34.13 **App version** display
- [ ] 34.14 **Log out** with confirmation

---

## 35. PUSH NOTIFICATIONS (NATIVE)

- [ ] 35.1 Configure Firebase Cloud Messaging (FCM) for Android
- [ ] 35.2 Configure Apple Push Notification Service (APNs) for iOS
- [ ] 35.3 Capacitor Push Notifications plugin setup
- [ ] 35.4 Permission request flow (strategic timing, not on first launch)
- [ ] 35.5 FCM token storage in Supabase (per device)
- [ ] 35.6 Token refresh handling
- [ ] 35.7 Notification tap → deep link routing
- [ ] 35.8 Badge count management (app icon badge number)
- [ ] 35.9 Silent notifications for data sync

---

## 36. EMAIL SYSTEM (SENDGRID)

- [ ] 36.1 SendGrid account setup + API key config
- [ ] 36.2 Sender domain verification (coexistaus.org)
- [ ] 36.3 **Transactional email templates**:
  - Welcome email (post-registration)
  - Event registration confirmation
  - Event reminder (24h before)
  - Event cancelled notification
  - Event invite notification
  - Waitlist promotion notification
  - Password reset
  - Donation receipt
  - Order confirmation (merch)
  - Order shipped (with tracking)
- [ ] 36.4 **Marketing/announcement templates**:
  - National newsletter
  - New challenge announcement
  - Monthly impact recap
  - Global announcement digest
- [ ] 36.5 Email sending via Supabase Edge Function → SendGrid API
- [ ] 36.6 Unsubscribe handling (one-click, CAN-SPAM compliant)
- [ ] 36.7 Email analytics tracking (opens, clicks - via SendGrid dashboard)

---

## 37. ANIMATIONS & MICRO-INTERACTIONS

- [ ] 37.1 **Page transitions** - slide from right for push, fade for tab switches
- [ ] 37.2 **Tab bar** - icon bounce/morph on selection
- [ ] 37.3 **Pull to refresh** - nature-themed animation (leaf spinning, wave)
- [ ] 37.4 **Event registration** - button transforms from "Register" → checkmark with spring animation
- [ ] 37.5 **Check-in success** - confetti burst + points flying to counter
- [ ] 37.6 **Badge unlock** - card flip + glow + particles
- [ ] 37.7 **Points awarded** - number flies up and adds to total with counter animation
- [ ] 37.8 **Tier up** - progress bar fills + burst + new tier badge reveal
- [ ] 37.9 **Like/celebrate** - heart or leaf burst from button
- [ ] 37.10 **Stat counters** - count up animation on load (CountUp component)
- [ ] 37.11 **Card interactions** - subtle scale on press (0.97), shadow change
- [ ] 37.12 **Skeleton loading** - shimmer animation on placeholders
- [ ] 37.13 **Onboarding** - parallax/lottie illustrations between steps
- [ ] 37.14 **Empty states** - gentle floating/breathing animation on illustrations
- [ ] 37.15 **Toast notifications** - slide in from top with spring
- [ ] 37.16 **Bottom sheet** - spring physics on drag
- [ ] 37.17 **Map markers** - pulse animation on selected marker
- [ ] 37.18 **Progress bars** - animated fill with ease-out
- [ ] 37.19 **Haptic feedback** - on check-in, badge unlock, CTA taps
- [ ] 37.20 **Splash → app** - logo fade out, content fade in
- [ ] 37.21 **Chat message send** - message bubble slides up into position
- [ ] 37.22 **Chat typing indicator** - animated dots
- [ ] 37.23 **Leaderboard rank change** - when user's rank changes, number slides up/down to new position with colour flash (green for up, red for down)
- [ ] 37.24 **Donation thermometer fill** - goal progress bar fills with liquid-style animation when donation is made
- [ ] 37.25 **Referral success chain** - when referred friend attends, show animated chain/connection line between your avatar and theirs
- [ ] 37.26 **Seasonal ambient animations** - subtle background particles: falling leaves (autumn), floating pollen (spring), drifting snow (winter) - Southern Hemisphere calendar, only on home screen hero, respect reduced motion

---

## 38. MOBILE-FIRST & TOUCH-FIRST DESIGN ENFORCEMENT

> Every screen, component, and interaction must be designed mobile-first then adapted up

- [ ] 38.1 **All touch targets minimum 44x44px** - buttons, links, list items, icons
- [ ] 38.2 **Thumb-zone optimised** - primary actions in bottom 60% of screen
- [ ] 38.3 **Bottom-anchored CTAs** - sticky action buttons at bottom, not top
- [ ] 38.4 **Swipe gestures** - swipe to dismiss bottom sheets, swipe between tabs, swipe-back navigation
- [ ] 38.5 **One-handed operation** - all core flows completable with one thumb
- [ ] 38.6 **No hover-dependent interactions** - everything works on tap
- [ ] 38.7 **Input fields** - large enough for mobile keyboards, proper input types (tel, email, number), autocomplete attributes
- [ ] 38.8 **Scroll behaviour** - momentum scrolling, overscroll bounce on iOS, pull-to-refresh where appropriate
- [ ] 38.9 **Font sizes** - minimum 14px body text on mobile, 16px for inputs (prevents iOS zoom)
- [ ] 38.10 **Spacing** - generous tap spacing between interactive elements (min 8px gap)
- [ ] 38.11 **Bottom sheets over modals** - prefer bottom sheet pattern for actions/forms on mobile
- [ ] 38.12 **Safe area compliance** - all content respects device safe areas (notch, home indicator, camera cutout)
- [ ] 38.13 **Orientation** - portrait-locked for app, flexible for web
- [ ] 38.14 **Viewport meta** - proper viewport tag, no user-scalable=no (accessibility)
- [ ] 38.15 **Fast tap response** - no 300ms delay, use touch-action: manipulation
- [ ] 38.16 **Loading states** - skeleton screens not spinners, never block interaction

---

## 39. WEB RESPONSIVE ADAPTATION

> Same React app serves both Capacitor native bundle and Vercel web deployment

- [ ] 39.1 **Breakpoint system**: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- [ ] 39.2 **Mobile view** - bottom tab nav, full-width content, native-app feel
- [ ] 39.3 **Tablet view** - bottom tabs or side nav, wider content area, two-column layouts where appropriate
- [ ] 39.4 **Desktop view** - top nav bar (not bottom tabs), sidebar navigation, max-width content container, multi-column layouts
- [ ] 39.5 **Responsive navigation hook** - `useLayout()` that detects platform (Capacitor vs web) + viewport size, returns nav mode
- [ ] 39.6 **Platform detection** - `isPlatform('capacitor')` to conditionally show/hide native-only features (haptics, camera, push notifications)
- [ ] 39.7 **Web-specific features** - keyboard shortcuts, right-click context menus, wider data tables in admin
- [ ] 39.8 **Chat on web** - sidebar chat panel instead of full-screen on desktop
- [ ] 39.9 **Admin dashboard** - optimised for desktop with full sidebar, but fully usable on mobile
- [ ] 39.10 **Shared component responsiveness** - every component in §2.5 must work at all breakpoints
- [ ] 39.11 **Image responsive loading** - serve appropriate image sizes per viewport (srcset or Supabase transforms)
- [ ] 39.12 **Web deployment** - Vercel auto-build from Git push to main, SPA routing configured
- [ ] 39.13 **Web footer** (web only, NOT in native app) - site footer with: Co-Exist logo, Aboriginal acknowledgment, links (About, Privacy, Terms, Contact, Instagram, Facebook), "Download the app" (App Store + Play Store badges), © Co-Exist Australia Ltd
- [ ] 39.14 **Native app: no footer** - bottom tab bar is the only persistent bottom element, no website-style footer in native builds

---

## 40. CARD STYLING & NON-GENERIC UI

> The app must NOT look like a generic template. Every card, list, and surface should feel crafted.

- [ ] 40.1 **Event cards** - hero image with gradient overlay fading to content area, activity type badge overlapping image, subtle shadow with warm tint, rounded-2xl
- [ ] 40.2 **Collective cards** - cover photo as background, frosted-glass content overlay, member count with avatar stack
- [ ] 40.3 **Stat cards** - subtle gradient backgrounds (sage→transparent), large bold numbers, trend indicators with coloured arrows
- [ ] 40.4 **Profile cards** - rounded avatar with tier ring colour, name + collective tag, subtle bg pattern
- [ ] 40.5 **Badge cards** - centred icon, earned date, glow effect on recent unlocks, greyed with lock icon for unearned
- [ ] 40.6 **Announcement cards** - left colour bar for priority (sage=normal, amber=urgent), author avatar, timestamp
- [ ] 40.7 **Merch product cards** - image-forward, clean price tag, subtle hover/press lift, "Sold out" overlay when OOS
- [ ] 40.8 **Chat messages** - rounded bubbles with directional tails, sent (sage bg) vs received (neutral bg), photo messages as rounded thumbnails
- [ ] 40.9 **Challenge cards** - progress bar integrated into design, goal visualisation, days-remaining countdown
- [ ] 40.10 **Leaderboard rows** - medal icons for top 3, rank number, avatar, name, score - current user highlighted
- [ ] 40.11 **Notification items** - icon reflecting type (calendar, trophy, megaphone, chat), unread bold, time relative
- [ ] 40.12 **Button icon alignment** - all icons in buttons use flexbox `items-center justify-center gap-2`, never padding-based centering
- [ ] 40.13 **Consistent shadow system** - no default browser shadows, use defined shadow tokens (sm/md/lg) with warm tint
- [ ] 40.14 **Card hover/press states** - scale(0.98) + shadow lift on press, smooth transitions
- [ ] 40.15 **Empty states** - each empty state has unique illustration + contextual CTA, never just "No items found"
- [ ] 40.16 **Form styling** - inputs with floating labels, focus ring in brand colour, validation inline not modal

---

## 41. ACCESSIBILITY (WCAG 2.1 AA)

- [ ] 41.1 All interactive elements have accessible labels (aria-label)
- [ ] 41.2 All images have alt text
- [ ] 41.3 Colour contrast ratios meet AA minimum (4.5:1 text, 3:1 large text)
- [ ] 41.4 Focus indicators visible on all interactive elements
- [ ] 41.5 Touch targets minimum 44x44px
- [ ] 41.6 Screen reader testing (VoiceOver iOS, TalkBack Android)
- [ ] 41.7 Keyboard navigation support (web/tablet)
- [ ] 41.8 Reduced motion support (respect `prefers-reduced-motion`)
- [ ] 41.9 Text scaling support (up to 200% without breaking layout)
- [ ] 41.10 Semantic HTML (headings hierarchy, landmarks, lists)
- [ ] 41.11 Form error messages associated with inputs (aria-describedby)
- [ ] 41.12 Loading states announced to screen readers
- [ ] 41.13 Skip navigation link (web view)
- [ ] 41.14 Colour is never the only indicator of state

---

## 42. PERFORMANCE & OPTIMISATION

- [ ] 42.1 Code splitting by route (lazy loading pages)
- [ ] 42.2 Image lazy loading + progressive loading (blur → sharp)
- [ ] 42.3 Virtual scrolling for long lists (event lists, member lists, chat messages)
- [ ] 42.4 React Query caching strategy (stale-while-revalidate)
- [ ] 42.5 Bundle analysis + tree shaking verification
- [ ] 42.6 Service worker for caching static assets
- [ ] 42.7 Database query optimisation - indexes on FK columns, commonly filtered columns
- [ ] 42.8 Supabase connection pooling (PgBouncer)
- [ ] 42.9 Image CDN caching headers
- [ ] 42.10 Target: <3s initial load, <1s subsequent navigations
- [ ] 42.11 Lighthouse audit score >90 (performance, accessibility, best practices)
- [ ] 42.12 Test on mid-range Android devices (target: Samsung A-series)
- [ ] 42.13 **Chat performance** - only subscribe to active collective's chat, paginate message history, lazy-load images in chat
- [ ] 42.14 **Realtime subscription management** - unsubscribe from channels when not in view
- [ ] 42.15 **Static bundle size target** - <2MB initial JS, <5MB total with lazy chunks
- [ ] 42.16 **App update prompt** - check app version against minimum required version (stored in Supabase), force update for critical, soft prompt for optional
- [ ] 42.17 **Error boundary / crash recovery** - React error boundaries on every route, graceful fallback UI ("Something went wrong" with retry/go home), auto-report to Sentry
- [ ] 42.18 **Maintenance mode page** - when Supabase/backend is down, show branded maintenance page instead of broken UI (check via health endpoint)
- [ ] 42.19 **Rate limiting on chat** - max messages per minute per user to prevent spam (client-side throttle + server-side check)
- [ ] 42.20 **Data backup strategy** - document Supabase automatic backups, point-in-time recovery configuration, backup verification schedule
- [ ] 42.21 **i18n framework scaffold** - set up react-i18next or similar, extract all strings to locale files, even if launching English-only (cost is near-zero now, retrofit is expensive later)
- [ ] 42.22 **Deep link testing matrix** - document and test every notification type → correct deep link screen mapping (e.g. event reminder → event detail, badge unlock → badge detail, chat mention → chat at message)

---

## 43. TESTING

- [ ] 43.1 Unit tests - utility functions, hooks, state logic (Vitest)
- [ ] 43.2 Component tests - key UI components with React Testing Library
- [ ] 43.3 Integration tests - auth flows, event registration flow, impact logging, chat
- [ ] 43.4 E2E tests - critical user journeys (Playwright or Cypress)
  - Signup → onboarding → join collective → register for event → check in
  - Leader: create event → invite collective → manage attendance → log impact
  - Chat: send message → reply → @mention → view user card
- [ ] 43.5 Visual regression tests (optional - Chromatic or Percy)
- [ ] 43.6 Accessibility audit (axe-core automated + manual)
- [ ] 43.7 Performance benchmarking (Lighthouse CI)
- [ ] 43.8 Device testing matrix - iOS (iPhone 12+), Android (API 28+)
- [ ] 43.9 Web browser testing - Chrome, Safari, Firefox, Edge

---

## 44. CAPACITOR NATIVE BUILDS

### 44.1 iOS (Built on MacInCloud, pulled from Git repo)
- [ ] 44.1.1 Configure `capacitor.config.ts` for iOS
- [ ] 44.1.2 Set bundle ID (`org.coexistaus.app`)
- [ ] 44.1.3 Configure app icons (all required sizes)
- [ ] 44.1.4 Configure splash screen (launch storyboard)
- [ ] 44.1.5 Configure permissions (camera, location, notifications, calendar)
- [ ] 44.1.6 Configure deep links / universal links
- [ ] 44.1.7 Apple Sign-In capability
- [ ] 44.1.8 Push notification capability + provisioning profiles
- [ ] 44.1.9 TestFlight build and distribution
- [ ] 44.1.10 App Store submission (screenshots, description, metadata)
- [ ] 44.1.11 Document MacInCloud build workflow (pull repo → npm install → npm run build → npx cap copy → open Xcode → archive)

### 44.2 Android (Built on Windows via Android Studio)
- [ ] 44.2.1 Configure `capacitor.config.ts` for Android
- [ ] 44.2.2 Set package name (`org.coexistaus.app`)
- [ ] 44.2.3 Configure adaptive icon
- [ ] 44.2.4 Configure splash screen
- [ ] 44.2.5 Configure permissions in AndroidManifest
- [ ] 44.2.6 Configure deep links / app links
- [ ] 44.2.7 Firebase setup (google-services.json)
- [ ] 44.2.8 Signing config (keystore) - generated locally on Windows
- [ ] 44.2.9 Google Play Console setup
- [ ] 44.2.10 Internal testing track build
- [ ] 44.2.11 Play Store submission
- [ ] 44.2.12 Document Android Studio build workflow (npm run build → npx cap copy → open Android Studio → build APK/AAB)

---

## 45. CI/CD & DEPLOYMENT

- [ ] 45.1 GitHub repo - push local repo, set as origin
- [ ] 45.2 **Vercel web deployment** - connect to GitHub repo, auto-deploy on push to main
- [ ] 45.3 Vercel configuration - SPA routing (`rewrites: [{ source: "/(.*)", destination: "/index.html" }]`)
- [ ] 45.4 Staging environment (separate Supabase project) - deploy from `develop` branch
- [ ] 45.5 Production environment (separate Supabase project) - deploy from `main` branch
- [ ] 45.6 Database migrations workflow (Supabase CLI)
- [ ] 45.7 GitHub Actions workflow - lint, test, build on PR
- [ ] 45.8 **Android build** - manual via Android Studio on Windows (from local repo)
- [ ] 45.9 **iOS build** - manual via Xcode on MacInCloud (pull from Git repo)
- [ ] 45.10 Semantic versioning strategy
- [ ] 45.11 Changelog automation
- [ ] 45.12 Environment-specific config (dev/staging/prod) via `.env` files

---

## 46. ANALYTICS & LOGGING

- [ ] 46.1 Event tracking library setup (PostHog, Mixpanel, or Plausible)
- [ ] 46.2 Track key events:
  - Sign up, login, onboarding completion
  - Event view, register, check-in
  - Collective join
  - Badge unlock
  - Donation, purchase
  - Chat message sent
  - Announcement read
  - Feature usage (search, map, feed, leaderboard)
- [ ] 46.3 Error logging (Sentry)
- [ ] 46.4 Performance monitoring (Sentry or web-vitals)
- [ ] 46.5 Crash reporting (Capacitor + Sentry)
- [ ] 46.6 Admin analytics dashboard (or external PostHog/Mixpanel dashboard)
- [ ] 46.7 Funnel analysis (signup → first event → retained at 30 days)

---

## 47. SECURITY & PRIVACY

- [ ] 47.1 Supabase RLS enabled on ALL tables (no public access without policy)
- [ ] 47.2 API keys - only anon key in client, service role key in edge functions only
- [ ] 47.3 Input validation (client + server-side via Supabase functions)
- [ ] 47.4 Rate limiting on auth endpoints (Supabase built-in)
- [ ] 47.5 HTTPS everywhere
- [ ] 47.6 Secure storage for auth tokens (Capacitor Secure Storage)
- [ ] 47.7 GDPR compliance:
  - Data export (user can request their data)
  - Data deletion (user can delete account + all data)
  - Consent management (terms acceptance, marketing opt-in)
  - Privacy policy link in registration flow
- [ ] 47.8 Content moderation - photo reporting, chat reporting, admin review queue
- [ ] 47.9 No PII in logs or analytics
- [ ] 47.10 Age verification (18+ requirement noted in terms)
- [ ] 47.11 Stripe PCI compliance (handled by Stripe Checkout)
- [ ] 47.12 Chat content safety - basic profanity filter option, reporting mechanism
- [ ] 47.13 **Cookie consent banner** - for web deployment, compliant with applicable privacy laws, configurable per jurisdiction
- [ ] 47.14 **Aboriginal and Torres Strait Islander acknowledgment** - acknowledgment of Country in About page + Settings screen (not a footer - native apps don't have footers). On web, include in bottom of About page. Matches coexistaus.org
- [ ] 47.15 **Terms of Service versioning** - when T&Cs change, users must re-accept on next login; store T&Cs version + acceptance date per user
- [ ] 47.16 **Data retention policy** - define how long data is kept after account deletion (e.g. 30 days grace, then permanent removal), document in privacy policy
- [ ] 47.17 **Child safety policy** - even though 18+ required, display child safety information as required by App Store / Play Store policies
- [ ] 47.18 **Image content moderation** - automated NSFW/inappropriate image detection on uploaded photos (Supabase Edge Function → external moderation API or basic heuristics), auto-flag for review

---

## 48. PUBLIC-FACING / SHAREABLE PAGES

- [ ] 48.1 **Public event page** - accessible via link without auth, shows event details + "Download app" / "Open in app" CTA
- [ ] 48.2 **Public collective page** - overview without auth
- [ ] 48.3 **Shareable impact card** - Open Graph image for social sharing
- [ ] 48.4 **Shareable badge card** - share badge achievements
- [ ] 48.5 **App download landing page** - links to App Store + Play Store + web app
- [ ] 48.6 Open Graph meta tags for all shareable URLs
- [ ] 48.7 Deep link from shared URL → in-app screen (Capacitor App Links)

---

## 49. ONBOARDING FLOWS (DETAILED)

### 49.1 New Participant Onboarding
- [ ] 49.1.1 Welcome screen with movement value prop (3 slides max)
- [ ] 49.1.2 Sign up (email or social)
- [ ] 49.1.3 Profile setup (photo, name, Instagram handle, location)
- [ ] 49.1.4 Interest selection
- [ ] 49.1.5 Collective recommendation + join
- [ ] 49.1.6 First event suggestion + one-tap RSVP
- [ ] 49.1.7 Permission requests (notifications - strategic timing after showing value)
- [ ] 49.1.8 "You're all set!" celebration screen

### 49.2 New Leader Onboarding
- [ ] 49.2.1 Leader welcome after role assignment
- [ ] 49.2.2 Quick tour of leader tools (create event, manage members, log impact, invite collective, group chat moderation)
- [ ] 49.2.3 Create your first event guided flow
- [ ] 49.2.4 Tips & best practices card series

### 49.3 Returning User Re-engagement
- [ ] 49.3.1 "Welcome back" screen if inactive 30+ days
- [ ] 49.3.2 Show what they missed (events, badges, collective activity)
- [ ] 49.3.3 Suggest next event

---

## 50. DATA MIGRATION & SEEDING

- [ ] 50.1 Import existing member data from current systems (CSV → Supabase)
- [ ] 50.2 Import existing event history (if available)
- [ ] 50.3 Seed badge definitions
- [ ] 50.4 Seed activity type enums
- [ ] 50.5 Seed sample data for dev/staging (fake collectives, events, users)
- [ ] 50.6 Seed partner offers (initial set)
- [ ] 50.7 Seed existing merch products (Community Tee $45, Cap $30, Bucket Hat $20, Tote $15, Stickers $5)
- [ ] 50.8 Data validation scripts post-migration

---

## 51. DOCUMENTATION & HANDOVER

- [ ] 51.1 Technical architecture document
- [ ] 51.2 Database schema documentation (auto-generated from Supabase)
- [ ] 51.3 API documentation (edge functions)
- [ ] 51.4 Component library documentation (Storybook - optional)
- [ ] 51.5 Admin user guide (for Co-Exist national team)
- [ ] 51.6 Leader user guide (for Collective leaders)
- [ ] 51.7 Deployment runbook (Vercel web + Android Studio + MacInCloud iOS)
- [ ] 51.8 Environment setup guide for new developers
- [ ] 51.9 Known issues and future roadmap

---

## 52. COHESIVE EXPERIENCE & FLOW CONNECTORS

> The glue between features. Every screen should feel like it belongs to the same universe, and every action should naturally lead to the next one. No dead ends.

### 52.1 Cross-Feature Navigation (No Dead Ends)
- [ ] 52.1.1 **Every entity is tappable everywhere** - event name in chat → event detail, collective name on profile → collective page, user avatar anywhere → user card, badge on any screen → badge detail
- [ ] 52.1.2 **Contextual back navigation** - always returns to where you came from (not a fixed hierarchy), breadcrumb state in navigation stack
- [ ] 52.1.3 **"What's next?" prompts** - after completing any action, suggest the natural next step:
  - After event check-in → "Take a photo and share it!"
  - After impact logging → "Share this impact with your collective"
  - After earning a badge → "Share your achievement" / "See the leaderboard"
  - After joining a collective → "Say hi in the group chat" / "Check out upcoming events"
  - After first event → "How was it? Leave feedback" / "Invite a friend"
  - After donation → "See where your money goes" / "Share that you donated"
- [ ] 52.1.4 **Smart empty states that guide** - every empty state has a specific, actionable CTA that takes you to the right place:
  - No events registered → "Find events near you" (→ explore)
  - No collective joined → "Discover your local collective" (→ collective finder)
  - No badges earned → "Attend your first event to start earning" (→ events)
  - No impact stats → "Your conservation journey starts with your first event" (→ events)
  - Empty chat → "Be the first to say hello!" (auto-focus input)
  - No posts in feed → "Share a moment from your last event" (→ create post)
- [ ] 52.1.5 **Universal action sheet** - long-press any card (event, collective, user, post) → contextual action sheet (share, save, report, etc.)
- [ ] 52.1.6 **Deep link from every surface** - notifications, emails, shared links, QR codes, and in-app references all deep-link to the exact right screen with correct state

### 52.2 Consistent Interaction Patterns
- [ ] 52.2.1 **Pull-to-refresh on every scrollable list** - home feed, events, chat, notifications, member lists, leaderboards, announcements
- [ ] 52.2.2 **Swipe-to-action pattern** - consistent across the app: swipe left on event card → cancel registration, swipe left on notification → mark read, swipe left on chat message → reply
- [ ] 52.2.3 **Long-press pattern** - consistent: long-press message → react/reply/copy, long-press event card → quick actions, long-press photo → save/share
- [ ] 52.2.4 **Confirmation pattern** - destructive actions (cancel registration, leave collective, delete post) always use the same confirmation bottom sheet style with red action button
- [ ] 52.2.5 **Loading pattern** - never a blank screen. Skeleton → content for initial loads, subtle inline spinner for actions, optimistic updates for instant feedback
- [ ] 52.2.6 **Error pattern** - all errors use the same toast style, with retry action where possible. Never a dead-end error.
- [ ] 52.2.7 **Success pattern** - small wins get a toast, medium wins get a celebration card, big wins (badge unlock, tier up, 100th event) get a full-screen takeover with animation
- [ ] 52.2.8 **Scroll position memory** - returning to a list preserves scroll position (don't reset to top when navigating back)

### 52.3 Feature Interconnections
- [ ] 52.3.1 **Event → Impact → Stats → Badge pipeline** - attending event automatically updates impact stats, which automatically checks badge criteria, which triggers celebration if earned - all in one smooth flow the user sees unfold
- [ ] 52.3.2 **Event → Photo → Feed → Social pipeline** - photos taken at events auto-suggest posting to feed, tagged with event and collective, visible on event page gallery
- [ ] 52.3.3 **Chat ↔ Events integration** - new events auto-post to collective chat as a rich card, event updates posted to chat, event reminders in chat ("Tomorrow's beach cleanup - who's coming?")
- [ ] 52.3.4 **Profile ↔ Everything** - every stat on your profile links to the underlying data (tap "12 events attended" → My Events past tab, tap "Tree Guardian badge" → badge detail, tap collective → collective page)
- [ ] 52.3.5 **Leaderboard → Profile** - tap any user on the leaderboard → their profile
- [ ] 52.3.6 **Challenge → Events** - active challenge shows which upcoming events contribute to the challenge goal
- [ ] 52.3.7 **Donation → Impact** - donation confirmation shows tangible impact ("$25 plants ~10 native trees"), linked to national impact dashboard
- [ ] 52.3.8 **Merch → Identity** - merch items link to the Co-Exist story, each product page has a "Why this matters" section connecting merch purchase to mission
- [ ] 52.3.9 **Announcement → Action** - announcements can include action buttons (RSVP to event, join challenge, donate to project, open link)
- [ ] 52.3.10 **QR check-in → instant gratification chain** - scan QR → "You're checked in!" → points animation → "You just earned Seedling badge!" → share card → "23 others are here today" (attendee list)

### 52.4 Seamless State Transitions
- [ ] 52.4.1 **Pre-event → Event day → Post-event** - the event detail page transforms based on state:
  - Pre-event: registration CTA, countdown, what to bring
  - Event day: check-in button prominent, live attendee count, map directions
  - Post-event: impact summary, photo gallery, survey prompt, "You were here!" badge
- [ ] 52.4.2 **New user → Active user → Power user** - the home feed progressively reveals features:
  - New: emphasis on onboarding CTAs, "Find your first event", simple
  - Active (5+ events): show impact stats, leaderboard position, challenges
  - Power user (20+ events): show referral tools, leadership opportunities, advanced stats
- [ ] 52.4.3 **Member → Leader transition** - when promoted, the UI smoothly introduces new tools with guided tooltips, not a jarring layout change
- [ ] 52.4.4 **Online ↔ Offline** - graceful degradation: when going offline, subtle indicator appears, cached data works, actions queue silently. When back online, syncs with subtle "All synced" confirmation, no interruption

---

## 53. DELIGHT & EMOTIONAL DESIGN

> The moments that make people screenshot, share, and come back. This isn't decoration - it's what makes the difference between an app people use and an app people love.

### 53.1 Celebration Moments
- [ ] 53.1.1 **First event check-in** - full-screen celebration: "Welcome to the movement!" with confetti, animated Co-Exist logo, your impact has begun counter starting from zero
- [ ] 53.1.2 **Milestone events** (5th, 10th, 25th, 50th, 100th) - personalised celebration screen: "Your 25th event! Here's what you've achieved so far..." with mini impact recap
- [ ] 53.1.3 **Badge unlock ceremony** - badge card flips and reveals with glow + particle burst, shows rarity ("Only 12% of members have this!"), one-tap share to Instagram
- [ ] 53.1.4 **Tier promotion** - premium full-screen transition: old tier badge morphs into new tier with colour shift, progress stats, "Welcome to Canopy tier" with tier benefits
- [ ] 53.1.5 **Collective milestone** - when collective hits a milestone (100 members, 1000 trees, 50 events), all members see a celebration card in feed + chat
- [ ] 53.1.6 **Personal streak celebrations** - "4 weeks in a row! You're on fire 🔥" with streak-specific animation (growing plant, rising sun)
- [ ] 53.1.7 **Referral success** - when a referred friend attends their first event: "Your friend Sarah just completed their first event! You earned 200 pts"
- [ ] 53.1.8 **Challenge completion** - animated challenge card transforms: progress bar hits 100% → bursts → badge reveal → leaderboard position → share card
- [ ] 53.1.9 **Annual wrap celebration** - year-in-review story (auto-generated) with personal stats, collective highlights, national impact, shareable cards per slide

### 53.2 Micro-Delight
- [ ] 53.2.1 **Greeting variations** - not just "Good morning, Sarah" but context-aware: "Big day tomorrow - ready for the beach cleanup?", "Welcome back! Your collective missed you", "4-week streak! Keep it going"
- [ ] 53.2.2 **Nature-themed loading states** - instead of generic spinners: growing seedling, bird flying across screen, wave rolling, leaf unfurling
- [ ] 53.2.3 **Seasonal UI touches** - subtle background colour/illustration shifts per season (autumn leaves Oct-Nov, spring blossoms Sep, summer beach Dec-Feb, winter forest Jun-Aug - Southern Hemisphere)
- [ ] 53.2.4 **Impact counter "click" feel** - when your personal stat updates after an event, the counter rolls up with satisfying tick animation + subtle haptic per digit
- [ ] 53.2.5 **Photo memories** - "On this day last year" card on home feed showing a photo from a past event, linking back to the event
- [ ] 53.2.6 **Random encouragement** - occasional subtle messages in the feed: fun conservation facts, motivational quotes from David Attenborough, "Did you know your collective planted enough trees to fill 3 football fields?"
- [ ] 53.2.7 **Easter eggs** - tap the Co-Exist logo on the profile page 5 times → hidden animation (e.g. all the trees you've planted growing on screen), or tap impact stats → 3D globe showing your contributions
- [ ] 53.2.8 **Thank you from Kurt** - first-time users see a personal welcome video/message from Kurt Jones after their first event

### 53.3 Emotional Feedback Loops
- [ ] 53.3.1 **"You made a difference" post-event nudge** - 24 hours after an event, notification: "Yesterday you helped plant 47 trees at Byron Bay. That's enough to absorb 1 tonne of CO₂ per year."
- [ ] 53.3.2 **Collective pride moments** - when your collective climbs the national leaderboard: "Byron Bay Collective just moved up to #3 nationally! 🎉"
- [ ] 53.3.3 **Impact equivalency translations** - don't just say "1,200 kg rubbish collected", say "That's the weight of a small car kept out of the ocean"
- [ ] 53.3.4 **Social proof nudges** - "12 people from your collective are going to Saturday's cleanup - join them?"
- [ ] 53.3.5 **Contribution visibility** - after impact logging, each attendee gets a personal breakdown: "Your share: 8 trees planted, 2.5 hours volunteered, 4kg rubbish collected"
- [ ] 53.3.6 **Growth tracking** - monthly "Your conservation journey" email recap with trend arrows: "You attended 20% more events this month! Your impact is growing"

---

## 54. CONTEXTUAL INTELLIGENCE & SMART DEFAULTS

> The app should feel like it knows what you need before you ask. Smart suggestions, pre-fills, and contextual awareness.

### 54.1 Smart Suggestions
- [ ] 54.1.1 **Event recommendations** - based on: activity types you've attended before, your collective's upcoming events, events near your location, events your friends are attending
- [ ] 54.1.2 **Optimal event timing** - "Most popular time for events in your area is Saturday morning" (leader tool for event creation)
- [ ] 54.1.3 **Re-engagement nudges** - if user hasn't opened app in 7 days: "There's a beach cleanup near you this weekend - 8 spots left!"
- [ ] 54.1.4 **Post-event prompts** - smart timing: impact logging prompt to leader 1 hour after event ends, photo sharing prompt to attendees 2 hours after, survey 24 hours after
- [ ] 54.1.5 **Badge proximity alerts** - "You're 2 events away from earning Shore Keeper!" shown on relevant event cards
- [ ] 54.1.6 **Challenge momentum** - "Your collective needs 50 more trees to complete the Winter Planting Challenge - there are 3 tree planting events this month"
- [ ] 54.1.7 **Leader insights** - "Member activity is 30% lower this month - consider posting in chat or scheduling an event"

### 54.2 Smart Defaults & Pre-fills
- [ ] 54.2.1 **Event creation pre-fill** - when leader creates a new event, pre-fill location from collective's usual location, pre-fill capacity from average of past events
- [ ] 54.2.2 **Impact logging pre-fill** - pre-fill hours from event duration × attendee count, pre-fill activity-specific fields from collective's typical values
- [ ] 54.2.3 **Registration auto-complete** - for returning users, pre-fill any event-specific forms from profile data
- [ ] 54.2.4 **Shipping address memory** - remember last shipping address for merch repeat orders
- [ ] 54.2.5 **Search suggestions** - based on recent searches + popular in your area + your interests
- [ ] 54.2.6 **Notification timing** - learn when user typically opens the app, send non-urgent notifications at that time

### 54.3 Contextual UI Adaptation
- [ ] 54.3.1 **Event day mode** - if user has an event today, the home screen prominently shows: event countdown, directions button, check-in button (when in range), weather for event location
- [ ] 54.3.2 **Post-event mode** - for 48 hours after attending: prominent photo sharing CTA, survey nudge, impact summary, "Share your experience" card
- [ ] 54.3.3 **New user mode** - first 2 weeks: simplified home feed focused on discovery, tooltips on key features, progressive disclosure of advanced features
- [ ] 54.3.4 **Leader mode context** - dashboard cards adapt: pre-event shows RSVPs, event day shows check-in tools, post-event shows impact logging prompt
- [ ] 54.3.5 **Location-aware home feed** - if user is near a collective they haven't joined, show "There's a collective near you!" discovery card
- [ ] 54.3.6 **Weather integration** - show current weather on event detail page for outdoor events (basic OpenWeatherMap API), with rain/heat advisory if applicable

---

## 55. TRANSITION & STATE CHOREOGRAPHY

> How screens, elements, and states flow into each other. The difference between "it works" and "it flows."

### 55.1 Page Transitions
- [ ] 55.1.1 **Shared element transitions** - when tapping an event card, the card image expands into the event detail hero image (shared element animation)
- [ ] 55.1.2 **Collective card → Collective page** - cover image expands, content slides up underneath
- [ ] 55.1.3 **Avatar tap → Profile** - avatar grows into profile header position
- [ ] 55.1.4 **Badge grid → Badge detail** - badge icon expands into detail modal centre
- [ ] 55.1.5 **Tab switching** - crossfade with subtle horizontal slide (not abrupt swap)
- [ ] 55.1.6 **Bottom sheet entrance** - slides up with spring physics, slight overshoot then settle
- [ ] 55.1.7 **Modal dismiss** - swipe down with velocity-based snap: slow drag = rubber-band back, fast swipe = dismiss with momentum

### 55.2 Content Choreography
- [ ] 55.2.1 **Staggered list loading** - list items appear one by one with 30ms stagger delay (not all at once)
- [ ] 55.2.2 **Card reveal on scroll** - cards fade in and slide up slightly as they enter viewport (subtle, not distracting)
- [ ] 55.2.3 **Hero parallax** - event/collective cover images have subtle parallax on scroll (1.15x speed)
- [ ] 55.2.4 **Stats counter choreography** - on dashboard load, stat cards count up in sequence (not simultaneously), left to right, 200ms apart
- [ ] 55.2.5 **Badge grid reveal** - earned badges pop in with scale animation staggered, locked badges fade in after
- [ ] 55.2.6 **Map marker drop** - when map loads, pins drop in from top with stagger, closest first
- [ ] 55.2.7 **Feed content entrance** - new posts in feed slide in from bottom when pull-to-refresh completes
- [ ] 55.2.8 **Chat message cascade** - when opening chat, recent messages cascade in from bottom rapidly (100ms stagger) for a "catching up" feel

### 55.3 State Change Animations
- [ ] 55.3.1 **Register → Registered** - button morphs: text changes, colour shifts from primary to success, icon checkmark draws in
- [ ] 55.3.2 **Empty → Content** - when first item appears in an empty list, illustration shrinks and fades while content slides in from bottom
- [ ] 55.3.3 **Offline → Online** - offline banner collapses with slide-up, brief green "Back online" flash, then disappears
- [ ] 55.3.4 **Unread → Read** - notification dot shrinks to zero with scale animation when item is read
- [ ] 55.3.5 **Points increment** - counter doesn't just change number: old number slides up and out, new number slides up from below (slot machine effect)
- [ ] 55.3.6 **Progress bar milestones** - when progress bar crosses a threshold (25%, 50%, 75%, 100%), brief glow pulse at the marker
- [ ] 55.3.7 **Like animation** - leaf icon scales up 1.3x, fills with colour, pops back to 1x, small particles emit outward - inspired by Twitter/Instagram double-tap
- [ ] 55.3.8 **Tier ring on avatar** - when tier changes, the ring colour transitions smoothly (not abrupt swap), with a brief shimmer

---

## 56. SOUND DESIGN

> Optional, tasteful sound design that reinforces actions without being annoying. Always respects system mute and in-app sound toggle.

- [ ] 56.1 **Sound toggle in settings** - on/off for in-app sounds, independent of system volume (default: on, respects silent mode)
- [ ] 56.2 **Check-in success** - satisfying "ding" with natural overtone (like a wooden chime)
- [ ] 56.3 **Badge unlock** - achievement sound: bright ascending tone (think Zelda chest open, but subtle and organic)
- [ ] 56.4 **Points awarded** - soft "collect" sound: quick ascending xylophone notes
- [ ] 56.5 **Tier up** - layered reward sound: ascending chord progression, 2 seconds
- [ ] 56.6 **Message sent** - soft "whoosh" (like sending a paper airplane)
- [ ] 56.7 **Message received** - gentle "pop" (distinguishable from sent)
- [ ] 56.8 **Pull-to-refresh complete** - soft "click" when content refreshes
- [ ] 56.9 **Error** - low, brief "bonk" - communicates failure without being alarming
- [ ] 56.10 **Navigation tap** - extremely subtle tick (barely there), only on bottom tab switches
- [ ] 56.11 **Celebration moments** - richer sound: confetti events get a brief "cheer" sfx layered with chime
- [ ] 56.12 **All sounds must be <50KB each**, loaded lazily, cached after first play
- [ ] 56.13 **Sound files** - store in `assets/sounds/`, use Web Audio API for low-latency playback on mobile
- [ ] 56.14 **Haptic + Sound pairing** - every sound is paired with appropriate haptic (light tap for subtle, medium impact for achievements, heavy for celebrations)

---

## 57. SHAREABLE IDENTITY & SOCIAL PROOF

> Every user should feel proud to be a Co-Exist member and be armed with beautiful things to share that make others want to join.

### 57.1 Shareable Cards & Assets
- [ ] 57.1.1 **Impact share card** - beautifully designed card with user's stats, Co-Exist branding, nature illustration, optimised for Instagram story dimensions (1080x1920)
- [ ] 57.1.2 **Badge share card** - earned badge with user name, date, rarity stat, Co-Exist branding
- [ ] 57.1.3 **Event share card** - event details as a visual card (date, location, activity type, cover photo) with "Join me!" CTA and deep link
- [ ] 57.1.4 **Collective share card** - collective name, stats, member count, cover image, "Join us!" CTA
- [ ] 57.1.5 **Year-in-review share cards** - multiple slides: one per major stat, one collective highlight, one national impact, one "Join the movement" closer
- [ ] 57.1.6 **Challenge progress card** - shareable progress toward current challenge goal
- [ ] 57.1.7 **Milestone share card** - "I just attended my 50th Co-Exist event!" with total impact summary
- [ ] 57.1.8 **Donation share card** - "I just donated to Co-Exist" (optional, opt-in at donation time) with impact equivalency
- [ ] 57.1.9 **All share cards** - generated client-side as PNG (html2canvas or similar), ready for native share sheet

### 57.2 Social Proof Mechanics
- [ ] 57.2.1 **Attendee social proof on events** - "Sarah, Jake, and 12 others from your collective are going" with avatar stack
- [ ] 57.2.2 **Trending events** - "🔥 Filling fast - 28/30 spots taken" urgency indicator
- [ ] 57.2.3 **New member social proof** - "15 people joined this week" on collective pages
- [ ] 57.2.4 **Referral link with attribution** - "Join Co-Exist - invited by Sarah" branded landing page per referral code
- [ ] 57.2.5 **Public impact counter** - embeddable widget for coexistaus.org showing live national stats (trees planted counter ticking up)
- [ ] 57.2.6 **"I was there" event badges** - small visual markers on past events that can be shown on profile: "Beach Cleanup Champion - Feb 2026"
- [ ] 57.2.7 **Member count momentum** - "Co-Exist is growing - 47 new members this month!" shown periodically in feed

### 57.3 Invite & Referral System
- [ ] 57.3.1 **Personal referral code** - unique code per user, shareable as link or QR
- [ ] 57.3.2 **Invite flow** - "Invite a friend" screen: share link via native share sheet, copy link, show QR, send via SMS/WhatsApp
- [ ] 57.3.3 **Referral tracking** - who invited whom, how many accepted, how many attended first event
- [ ] 57.3.4 **Referral rewards chain** - inviter gets points when invitee joins, bonus when invitee attends first event, bonus when invitee attends 5th event
- [ ] 57.3.5 **Referral leaderboard** - "Top recruiters this month" on leaderboard page
- [ ] 57.3.6 **Collective referral challenge** - "Help your collective reach 50 members" with collective-wide progress tracking
- [ ] 57.3.7 **Branded invite page** - web landing page for invite links: shows inviter's name + collective + upcoming events + "Join the movement" signup CTA, Co-Exist branding

---

*Total checkbox items: 1,083*
*Sections: 57*
*Last updated: 2026-03-20*

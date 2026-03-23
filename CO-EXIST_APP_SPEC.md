# Co-Exist Australia — Mobile App Specification

**Prepared for:** Co-Exist Australia Board of Directors
**Prepared by:** TJD Development
**Date:** 23 March 2026
**Version:** 1.0

---

## 1. Executive Summary

Co-Exist Australia currently manages its 5,500+ volunteers, 13 collectives, and conservation events across fragmented tools — spreadsheets, social media, multiple platforms. This app replaces all of that with a single, purpose-built mobile and web application.

The app is a polished MVP — production-ready, covering all core workflows from event management to impact tracking to donations. It runs on iOS, Android, and web from a single codebase and is designed for the 18–30 age group that makes up Co-Exist's membership.

**Why it matters operationally:** The app removes friction from almost every part of running Co-Exist. Event sign-ins go from clipboards and spreadsheets to a single tap. Coordinating 13 collectives goes from group chats across three platforms to one integrated system. Advertising events goes from manual social media posts to automatic push notifications to every relevant member. Impact reporting for grants and ACNC compliance goes from chasing leaders for spreadsheet updates to real-time dashboards that are always current. Leaders spend less time on admin and more time running conservation events.

**What it does:**
- Members discover and register for conservation events
- Leaders manage their collectives, run events, and log environmental impact
- Staff manage the national organisation from an admin dashboard
- Everyone sees realtime, aggregated conservation impact data
- Integrated donations, merchandise shop, and group chats, and staff coordination.


**What it costs:**
- Initial development: **$5,000** (complete)
- Ongoing infrastructure: **~$65–75/month** (see Section 8)
- Optional continued development retainer: **$800/month** for 6 months

---

## 2. What The App Includes

### 2.1 Member Experience

| Feature | Description |
|---------|-------------|
| **Home Screen** | Parallax hero, next event with tap-to-check-in, upcoming events carousel, community updates feed, national/collective impact stats with toggles, donate & shop CTAs |
| **Events** | Unified page — browse all upcoming events or filter to "My Events". Register, get reminders, check in on the day. Post-event surveys sent automatically |
| **Collective Chat** | Real-time group messaging within your collective. Polls, announcements, image sharing. Opens straight to your main chat with a dropdown to switch |
| **Impact Dashboard** | Personal and national impact stats — trees planted, volunteer hours, rubbish collected, cleanup events, weeds pulled, leaders trained, number of collectives |
| **Donate** | One-time and recurring donations via Stripe. Tax-deductible receipt emailed automatically |
| **Merch Shop** | Browse and purchase Co-Exist merchandise. Full cart, checkout, order tracking |
| **Profile** | Personal info, event history, impact summary, notification preferences |
| **Notifications** | Push notifications for event reminders, chat messages, announcements, registration confirmations |
| **Offline Support** | Core features work offline and sync when connectivity returns |

### 2.2 Leader Experience

Leaders manage their collective from a dedicated dashboard:

| Feature | Description |
|---------|-------------|
| **Event Management** | Create, edit, and cancel events. Set capacity, location (with map), activity type, cover images |
| **Attendance & Check-In** | QR code check-in at events. Manual check-in fallback. Real-time attendance dashboard on event day |
| **Impact Logging** | Post-event form to log conservation outcomes — trees planted, rubbish collected (kg), area restored, native species, volunteer hours, before/after photos, GPS data |
| **Member Management** | View collective members, assign roles (assist leader, co-leader), remove members |
| **Chat Moderation** | Delete any message, remove members from chat. Automatic profanity filtering on all messages |
| **Post-Event Surveys** | Automated attendee surveys after events. Configurable questions |
| **Reports** | Collective-level impact reports, attendance rates, engagement metrics |

### 2.3 Admin (National Staff) Experience

| Feature | Description |
|---------|-------------|
| **Dashboard** | Organisation-wide overview — all collectives, users, events, impact |
| **User Management** | View/search all users, assign staff roles, suspend accounts |
| **Collective Management** | Create/edit collectives, assign leaders, view per-collective stats |
| **Event Oversight** | View and moderate all events nationally |
| **Partner Management** | Add/edit partner organisations displayed in the app |
| **Survey Builder** | Create and manage post-event survey templates |
| **Email Campaigns** | Send newsletters and announcements via SendGrid integration |
| **Merch Management** | Products, inventory, orders, promotions, shipping, returns, reviews, analytics |
| **Data Exports** | Export member data, event data, impact data for ACNC reporting and grant applications |
| **Moderation** | Content moderation tools, audit logs |
| **System Settings** | Branding, feature configuration, membership settings |

### 2.4 Canonical Event Types

The app supports these conservation activity types:

1. Shore Cleanup
2. Tree Planting
3. Land Regeneration
4. Nature Walks
5. Camp Out
6. Retreats
7. Film Screening
8. Marine Restoration
9. Workshop

Each type has a custom icon and can drive default impact logging fields (e.g., tree planting events prompt for trees planted).

### 2.5 Impact Metrics Tracked

These are the core metrics collected, displayed, and reported:

| Category | Metrics |
|----------|---------|
| **Community Events** | Event attendances (non-unique sign-ins), Volunteer hours |
| **Land Restoration** | Trees planted, Invasive weeds pulled |
| **Cleanup Sites** | Tonnes of rubbish collected, Number of cleanup events |
| **Organisation** | Number of collectives, Young adult leaders trained |

Impact is viewable at personal, collective, and national levels with all-time and current-year toggles.

---

## 3. Navigation Structure

### Mobile (Bottom Tab Bar)
| Tab | Destination |
|-----|-------------|
| Home | Home screen |
| Chat | Collective chat (direct to main chat) |
| Profile | User profile |
| More | Sidebar menu |

### Sidebar Menu (via "More" tab or desktop sidebar)
| Item | Notes |
|------|-------|
| Updates | Staff updates, news, community messages (top of menu) |
| Events | Unified events page |
| **Support** | Section header |
| — Leadership Opportunities | Info page about becoming a leader |
| — Contact Us | Contact form + Co-Exist contact details |
| — Our Partners | Partner showcase (data-driven from admin) |
| Donate | Donation page |
| Shop | Merchandise store |
| Settings | App and notification settings |

Leaders additionally see their Leader Dashboard. Staff see the Admin panel.

---

## 4. Technical Architecture

### 4.1 Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + TypeScript (Vite) | Single codebase for web + mobile |
| Mobile Shell | Capacitor | Wraps the web app into native iOS/Android apps |
| Backend | Supabase | Managed Postgres database, authentication, file storage, real-time subscriptions, edge functions — no custom server required |
| Styling | Tailwind CSS | Consistent design system, fast development |
| Payments | Stripe | Industry standard. PCI-compliant. Supports donations + commerce |
| Email | SendGrid | Transactional emails (receipts, reminders) + marketing (newsletters) |
| Maps | Leaflet + Mapbox | Event locations, collective maps. Leaflet is free and open-source |
| Push Notifications | Firebase Cloud Messaging (FCM) / APNs | Cross-platform push notifications |

### 4.2 Hosting & Deployment

| Target | How | Cost |
|--------|-----|------|
| **Web** | Vercel (auto-deploys from Git) | Free tier (sufficient) |
| **Android** | Built locally, published to Google Play | $25 one-time Play Store fee (already paid) |
| **iOS** | Built via MacInCloud, published to App Store | $139/year Apple Developer Program |
| **Database/Backend** | Supabase Cloud (Sydney region) | See Section 8 |
| **Domain** | Already owned (coexistaus.org) | $0 — app runs on app.coexistaus.org subdomain |

### 4.3 Security & Privacy

- **Row Level Security (RLS)** on every database table — users can only access their own data unless explicitly permitted by policy
- **Role-based access control** — 7 distinct roles across global and collective scopes
- **No secrets in client code** — all sensitive operations run in Supabase Edge Functions (server-side)
- **ACNC and privacy compliant** — data export tools for regulatory reporting, user data deletion capability
- **Profanity filtering** — automatic content moderation in chat
- **Audit logging** — admin actions tracked for accountability

### 4.4 Offline Capability

The app queues actions (event registrations, chat messages, profile updates) when offline and syncs them when connectivity returns. Critical data is cached locally so members can still browse events and view their profile without internet.

---

## 5. Email System

18 email templates configured via SendGrid:

**Transactional (automatic):**
- Welcome email on signup
- Event confirmation, reminder (24h before), cancellation, invitation
- Waitlist promotion notification
- Password reset
- Donation receipt (tax-deductible)
- Order confirmation, shipping notification
- Payment failed, subscription cancelled, refund confirmation
- Data export ready

**Marketing (staff-triggered):**
- Newsletter
- Challenge/campaign announcements
- Monthly impact recap
- Announcement digest

All emails use Co-Exist branding, are CAN-SPAM compliant with one-click unsubscribe, and send from the coexistaus.org domain.

---

## 6. Design Principles

The app is built for 18–30 year olds who expect consumer-grade UX. Key design decisions:

- **Mobile-first** — designed for phones, scaled up for tablets and desktop
- **Nature-inspired** — sage green palette, warm earth tones, warm shadows (never cold greys)
- **Touch-optimised** — 44px minimum touch targets, bottom-anchored CTAs, one-handed operation
- **Fast** — skeleton loading (never spinners), optimistic updates, lazy-loaded pages, sub-3-second initial load
- **Accessible** — WCAG 2.1 AA contrast compliance, screen reader labels, reduced-motion support
- **No dead ends** — every empty state guides users to their next action
- **Movement, not software** — the app should feel like joining a cause, not using a corporate tool

---

## 7. Roles & Permissions Summary

| Role | Scope | Access Level |
|------|-------|-------------|
| **Participant** | Global | Standard member — events, chat, impact, donations, shop |
| **Assist Leader** | Collective | + Chat moderation (pin, delete, mute), help with check-ins |
| **Co-Leader** | Collective | + Create events, manage members |
| **Leader** | Collective | + Full collective management, assign roles |
| **National Staff** | Global | Admin dashboard with configurable granular permissions |
| **National Admin** | Global | Full admin access |
| **Super Admin** | Global | Everything + staff management + system configuration |

A user can belong to multiple collectives with different roles in each.

---

## 8. Ongoing Costs

### 8.1 Infrastructure (Monthly)

| Service | Plan | Monthly Cost | What It Covers |
|---------|------|-------------|----------------|
| **Supabase** | Pro | **$25/month** | Postgres database (8 GB included), authentication (100K MAU), file storage (100 GB), 2M edge function invocations, 5M realtime messages, automatic backups. Sydney region hosting. |
| **SendGrid** | Essentials | **$19.95/month** | Up to 50,000 emails/month. Covers all transactional emails (event confirmations, receipts, reminders) and marketing campaigns. |
| **Stripe** | Pay-as-you-go | **~$0–20/month** | No monthly fee. Transaction fees: **1.75% + $0.30 AUD** per domestic card transaction. International cards add ~1.5%. Applied to donations and merch purchases. Stripe may offer reduced rates for registered charities — worth applying via ACNC/ABN verification. |
| **Vercel** | Free (Hobby) | **$0** | Web hosting with automatic deployments. Free tier is sufficient for current traffic. |
| **Leaflet/OpenStreetMap** | Free & open source | **$0** | Maps for event locations and collective discovery. No API key costs. |
| **Firebase (FCM)** | Free tier | **$0** | Push notifications. Free for unlimited notifications. |
| **Apple Developer Program** | Annual | **~$12/month** | $139/year for App Store publishing. Required to maintain iOS app listing. |
| **MacInCloud** | Pay-as-you-go | **~$5–10/month** | Remote Mac for iOS builds. Only needed when publishing iOS updates. |

**Estimated total infrastructure: $62–87/month** (varies with Stripe transaction volume)

### 8.2 Stripe Fee Examples

| Transaction | Fee Calculation | You Receive |
|-------------|----------------|-------------|
| $10 donation | $10 × 1.75% + $0.30 = $0.48 | $9.52 |
| $25 donation | $25 × 1.75% + $0.30 = $0.74 | $24.26 |
| $50 merch order | $50 × 1.75% + $0.30 = $1.18 | $48.83 |
| $100 donation | $100 × 1.75% + $0.30 = $2.05 | $97.95 |

**Note:** Co-Exist is an ACNC-registered charity. Stripe offers fee discounts for verified non-profits on tax-deductible donations. We recommend contacting Stripe with your ABN to apply — this could reduce donation processing fees meaningfully.

### 8.3 Scaling Considerations

Current infrastructure handles the target of 1,000 active users in year one comfortably. When scaling toward 10,000+ users:

| Threshold | Action Needed | Additional Cost |
|-----------|--------------|----------------|
| >100K monthly active users | Supabase MAU overage | ~$0.00325/user/month beyond 100K |
| >50K emails/month | SendGrid plan upgrade (Pro) | $89.95/month |
| >100 GB file storage | Supabase storage overage | ~$0.021/GB/month |
| High web traffic | Vercel Pro upgrade | $20/month |

These thresholds are well above projected year-one usage.

---

## 9. Development Investment

### 9.1 Initial Build (Complete)

| Item | Cost |
|------|------|
| Full app development — all features described in this document | **$5,000** |
| Includes: iOS + Android + Web, admin dashboard, leader tools, chat, events, impact tracking, donations, merch shop, email integration, offline support, 84+ UI components, 60+ data hooks | |

This covers the complete polished MVP as described in this specification.

**Built for growth, not just today.** The app's architecture is modular by design — features are built as self-contained systems (events, chat, impact, donations, merch, admin) that plug into shared infrastructure (authentication, roles, real-time sync, notifications). This means new capabilities can be added alongside existing ones without redesigning what's already working. When Co-Exist grows from 13 collectives to 50, or adds new event types, or needs new reporting — the foundations are already there. The app doesn't need to be rebuilt to scale; it's designed to be extended.

### 9.2 Continued Development Retainer (Proposed)

**$800/month for 6 months = $4,800 total**

This retainer keeps a developer who knows the codebase intimately on call — no ramp-up time, no knowledge gaps. The alternative (hiring a new developer later) typically costs $150+/hr with weeks of onboarding before they can make a single meaningful change.

The retainer covers:

| Activity | Description |
|----------|-------------|
| **Bug fixes & stability** | Respond to user-reported issues, fix edge cases, improve error handling |
| **Performance tuning** | Optimise load times, reduce bundle size, improve offline reliability |
| **UX refinement** | Iterate on user feedback, polish animations, improve flows based on real usage data |
| **Feature expansion** | Implement new features as priorities emerge (e.g., new event types, reporting enhancements, accessibility improvements) |
| **Platform updates** | Keep dependencies current, handle iOS/Android OS updates, maintain App Store and Play Store compliance |
| **Infrastructure support** | Monitor Supabase usage, optimise database queries, manage SendGrid deliverability |
| **App Store management** | Submit updates to App Store and Play Store, manage review processes |
| **Staff training** | Train leaders and admin staff on using the app's management tools effectively |

**Response time:** Issues addressed within 48 hours. Critical bugs (app down, data loss) within 24 hours.

### 9.3 Beyond the Retainer — Replacing External Software

The current MVP handles events, communication, impact tracking, donations, and merchandise. But the app's architecture is built to grow. Co-Exist currently pays for multiple external tools — Microsoft 365 licences, spreadsheet-based tracking, third-party form builders, separate email platforms, and other fragmented software.

Over time, the app can expand to replace these tools entirely:

| Currently Paying For | Can Be Built Into The App |
|---------------------|--------------------------|
| Microsoft 365 / spreadsheets for member tracking | Already replaced — member management is in the admin dashboard |
| Separate email platform | Already replaced — SendGrid integration handles all email |
| External form builders (surveys, registrations) | Already replaced — event registration and surveys are built in |
| Spreadsheet-based impact reporting | Already replaced — impact dashboard with export tools |
| Multiple communication channels | Partially replaced — collective chat is live; announcements, push notifications built in |
| External accounting/donation tracking | Partially replaced — Stripe integration with donation history and receipts |
| Volunteer hour tracking tools | Already replaced — automatic via event check-in |

**Every tool the app replaces is a subscription Co-Exist stops paying for.** At even modest Microsoft 365 licensing ($10–20/user/month across staff), the app pays for itself in software savings alone — before factoring in the hours saved by having everything in one place.

If the board chooses to continue development beyond the initial 6-month retainer, the same $800/month rate is available for further expansion. The goal is a single, self-managed platform that runs the entire organisation — no more juggling five different logins and three different spreadsheets to run one beach cleanup.

---

## 10. Summary of Costs

### Year One Projection

| Category | Cost |
|----------|------|
| Initial development | $5,000 (one-time) |
| 6-month development retainer | $4,800 ($800/month × 6) |
| Infrastructure (12 months) | ~$744–1,044 ($62–87/month × 12) |
| **Year one total** | **~$10,544–$10,844** |

### After Retainer Period (Month 7+)

| Category | Monthly Cost |
|----------|-------------|
| Infrastructure only | ~$62–87/month |
| **Annual infrastructure** | **~$744–1,044/year** |

The app is built to run independently after the retainer period. All code is owned by Co-Exist Australia. No vendor lock-in — the codebase can be handed to any React developer for future maintenance.

### Cost in Context

For comparison, a single Microsoft 365 Business Basic licence is $9/user/month. Across 10 staff and leaders, that's $108/month ($1,296/year) — and it doesn't do anything Co-Exist-specific. The app's entire infrastructure costs less than that, while doing everything: events, chat, impact tracking, donations, merch, email, reporting, and member management.

The $800/month retainer is the cost of keeping one developer available for ~10 hours/month. A single critical bug found after the retainer ends would cost more to fix through a new contractor than the retainer itself costs for the month.

---

## 11. What Co-Exist Owns

- Complete source code (hosted on Co-Exist's Git repository)
- All database schemas and migrations
- All email templates
- App Store and Play Store listings
- Domain and hosting accounts
- Stripe and SendGrid accounts
- Full admin access to everything

There are no licensing fees, no proprietary dependencies, and no ongoing developer lock-in. The app is yours.

---

## 12. Current Stats & Foundation

Co-Exist brings existing momentum to this platform:

| Metric | Current Value |
|--------|--------------|
| Total volunteers | 5,500+ |
| Active collectives | 13 |
| Native plants planted | 35,500+ |
| Litter removed | 4,900+ kg |
| Website | coexistaus.org |
| Social presence | @coexistaus (Instagram, Facebook) |

The app digitises and amplifies this existing impact, making it trackable, shareable, and scalable.

---

*This document reflects the application as built and deployed. All features described are implemented and functional. Questions can be directed to the development team or Kurt Jones (CEO, Co-Exist Australia).*

# Co-Exist App

> Youth Conservation Movement - "Explore. Connect. Protect."

A mobile-first conservation app for [Co-Exist Australia](https://www.coexistaus.org), a national youth-led environmental nonprofit (ages 18–30) that runs conservation events through local groups called **Collectives**.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript (Vite) |
| Mobile | Capacitor (iOS + Android) |
| Backend | Supabase (Auth, Postgres/PostGIS, Storage, Edge Functions, Realtime) |
| Styling | Tailwind CSS 4 |
| State | Zustand (client) + TanStack Query (server) |
| Animation | Framer Motion |
| Payments | Stripe |
| Email | SendGrid (via Edge Functions) |
| Testing | Vitest + React Testing Library + Playwright |

## Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (for local dev or managing migrations)
- Android Studio (for Android builds)
- Xcode on macOS (for iOS builds)

### Install & Run

```bash
# Clone the repo
git clone <repo-url> coexist && cd coexist

# Install dependencies
npm install

# Create env file from example
cp .env.example .env.local
# Edit .env.local with your Supabase project URL and anon key

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## Build Commands

```bash
# Type-check
npx tsc --noEmit

# Production build (web)
npm run build

# Preview production build
npm run preview

# Android
npm run build && npx cap copy android
# Then open Android Studio: npx cap open android

# iOS (on macOS)
npm run build && npx cap copy ios
# Then open Xcode: npx cap open ios
```

## Database

```bash
# Run the migration (creates all tables, enums, RLS policies)
psql -h <db-host> -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql

# Seed dev/staging data (badges, collectives, events, merch, feature flags)
psql -h <db-host> -U postgres -d postgres -f supabase/seed.sql
```

See [supabase/DEPLOY.md](supabase/DEPLOY.md) for full Supabase setup instructions.

## Testing

```bash
# Run unit + component tests
npx vitest run

# Run tests in watch mode
npx vitest

# E2E tests (requires running dev server)
npx playwright test

# Lint
npm run lint
```

## Deployment

### Web (Vercel)

Vercel auto-deploys from the `main` branch. SPA routing is handled via rewrites.

### Android

1. `npm run build && npx cap copy android`
2. Open in Android Studio: `npx cap open android`
3. Build → Generate Signed Bundle/APK
4. Upload to Google Play Console

### iOS

1. Pull repo on macOS (or MacInCloud)
2. `npm install && npm run build && npx cap copy ios`
3. Open in Xcode: `npx cap open ios`
4. Archive → Upload to App Store Connect / TestFlight

## Project Structure

```
src/
  assets/         fonts/, icons/, images/, sounds/
  components/     Shared UI components (Button, Card, Avatar, Modal, etc.)
  features/       Feature modules
  hooks/          Custom React hooks (useAuth, useOffline, useCamera, etc.)
  lib/            Utilities (supabase client, stripe, cn, constants)
  pages/          Route-level page components (lazy-loaded)
    public/       Public pages (no auth required)
    auth/         Authentication pages
    onboarding/   Onboarding flow
    events/       Event pages
    collectives/  Collective pages
    chat/         Chat pages
    profile/      Profile pages
    admin/        Admin dashboard pages
  styles/         globals.css (Tailwind theme)
  test/           Test setup and unit tests
  types/          TypeScript types (Supabase generated types)

supabase/
  migrations/     SQL migration files
  functions/      Deno Edge Functions (Stripe checkout, webhooks)
  seed.sql        Dev/staging seed data

e2e/              Playwright E2E test specs
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run all tests |
| `npx vitest` | Tests in watch mode |
| `npx playwright test` | Run E2E tests |
| `npx cap copy` | Copy web build to native projects |
| `npx cap open android` | Open Android Studio |
| `npx cap open ios` | Open Xcode |
| `npx supabase gen types typescript` | Regenerate DB types |

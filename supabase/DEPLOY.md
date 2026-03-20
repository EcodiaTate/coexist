# Supabase Deployment Guide

Step-by-step guide to setting up the Co-Exist Supabase project from scratch.

## 1. Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users (Sydney `ap-southeast-2` for Australia)
3. Set a strong database password and save it securely
4. Note your **Project URL** and **Anon Key** from Settings → API

## 2. Enable PostGIS

PostGIS is required for all location-based features (collectives, events, nearby search).

1. Go to **Database → Extensions**
2. Search for `postgis` and enable it
3. Also enable `pgcrypto` if not already enabled

## 3. Run Migration

Apply the database schema:

```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Direct SQL
psql -h db.<project-ref>.supabase.co -U postgres -d postgres \
  -f supabase/migrations/001_initial_schema.sql
```

This creates all tables, enums, indexes, RLS policies, and database functions.

## 4. Seed Data (Dev/Staging)

```bash
psql -h db.<project-ref>.supabase.co -U postgres -d postgres \
  -f supabase/seed.sql
```

Seeds: badge definitions, 13 collectives, sample events, merch products, partner offers, feature flags.

## 5. Configure Auth Providers

### Email (enabled by default)

1. Go to **Authentication → Providers → Email**
2. Enable "Confirm email" for production
3. Customize email templates in **Authentication → Email Templates**:
   - Confirmation email (add Co-Exist branding)
   - Password reset email
   - Magic link email

### Google OAuth

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Set authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase: **Authentication → Providers → Google** — paste Client ID and Secret

### Apple Sign-In

1. Set up in [Apple Developer Portal](https://developer.apple.com):
   - Create an App ID with Sign In with Apple
   - Create a Services ID
   - Create a Key for Sign In with Apple
2. In Supabase: **Authentication → Providers → Apple** — paste Service ID and Key

## 6. Storage Buckets

All 11 storage buckets, file constraints, MIME types, and RLS policies are created
automatically by the migration:

```bash
supabase/migrations/003_storage_buckets.sql
```

| Bucket | Public | Size Limit | Purpose |
|--------|--------|------------|---------|
| `avatars` | Yes | 2 MB | User profile photos |
| `event-images` | Yes | 5 MB | Event cover / gallery |
| `post-images` | Yes | 5 MB | Community feed images |
| `collective-images` | Yes | 5 MB | Collective covers |
| `badges` | Yes | 1 MB | Badge artwork (admin) |
| `merch-images` | Yes | 5 MB | Product images (admin) |
| `impact-evidence` | Yes | 10 MB | Impact logging photos/video |
| `announcements` | Yes | 5 MB | Staff announcement images |
| `chat-images` | No | 5 MB | Chat photos (collective-scoped) |
| `chat-voice` | No | 10 MB | Chat voice messages |
| `chat-video` | No | 50 MB | Chat video clips |

**Image transforms** must be enabled in the dashboard: Settings → Storage → Enable image transformations. See `src/lib/image-utils.ts` for the thumbnail/medium/large presets.

## 7. Enable Realtime

Go to **Database → Replication** and enable realtime on:

- `chat_messages`
- `notifications`
- `event_registrations`
- `posts`
- `global_announcements`

## 8. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

### Set Edge Function Secrets

```bash
# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid (for transactional email)
supabase secrets set SENDGRID_API_KEY=SG....

# FCM (for push notifications)
supabase secrets set FCM_SERVER_KEY=...
```

## 9. Configure Stripe Webhook

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks), create a webhook endpoint:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `charge.refunded`
2. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## 10. Production Checklist

- [ ] Database password is strong and stored securely
- [ ] RLS is enabled on all tables (verify: no table has RLS disabled)
- [ ] Email templates are branded
- [ ] Auth redirect URLs are configured for production domain
- [ ] Storage bucket policies are correct
- [ ] Edge function secrets are set
- [ ] Stripe webhook is receiving events
- [ ] Realtime is enabled only on required tables
- [ ] Database backups are enabled (Supabase Pro plan)
- [ ] Point-in-time recovery is enabled for production

# SendGrid Setup Guide - Co-Exist

Complete setup guide for transactional and marketing email via SendGrid.

---

## 1. SendGrid Account Setup

1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Choose the **Essentials** plan (40k emails/month for first 30 days, then 100/day free) or **Pro** for higher volume
3. Complete identity verification (required before sending)

## 2. Domain Authentication (coexistaus.org)

Authenticate `coexistaus.org` so emails come from `hello@coexistaus.org` and `donations@coexistaus.org`.

1. Go to **Settings → Sender Authentication → Domain Authentication**
2. Select your DNS host and enter `coexistaus.org`
3. Add these DNS records to your domain registrar:

| Type  | Host                              | Value                           | Purpose |
|-------|-----------------------------------|---------------------------------|---------|
| CNAME | `s1._domainkey.coexistaus.org`    | _(provided by SendGrid)_       | DKIM    |
| CNAME | `s2._domainkey.coexistaus.org`    | _(provided by SendGrid)_       | DKIM    |
| CNAME | `em1234.coexistaus.org`           | _(provided by SendGrid)_       | CNAME   |
| TXT   | `coexistaus.org`                  | `v=spf1 include:sendgrid.net ~all` | SPF |

4. Click **Verify** in SendGrid after DNS propagation (can take up to 48 hours)

## 3. API Key

1. Go to **Settings → API Keys → Create API Key**
2. Choose **Restricted Access**
3. Enable only: **Mail Send → Full Access**
4. Copy the key and set it as a Supabase secret:

```bash
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_FROM_EMAIL=hello@coexistaus.org
supabase secrets set SENDGRID_FROM_NAME="Co-Exist"
```

## 4. Unsubscribe Groups

Create unsubscribe groups to let users opt out of specific email categories (required for CAN-SPAM compliance).

1. Go to **Suppressions → Unsubscribe Groups → Create New Group**
2. Create these groups:

| Group Name          | Description                                       |
|---------------------|---------------------------------------------------|
| Marketing Emails    | Newsletters, challenge announcements, impact recaps |
| Event Notifications | Event reminders, invitations, cancellations        |

3. Note the group IDs - they can optionally be added to template sends via `asm.group_id`

---

## 5. Dynamic Templates

Create all 18 dynamic templates below in **Email API → Dynamic Templates → Create a Dynamic Template**.

Each template uses [Handlebars](https://docs.sendgrid.com/for-developers/sending-email/using-handlebars) syntax for dynamic data (e.g., `{{name}}`).

After creating each template, copy its Template ID (starts with `d-`) and set the corresponding Supabase environment variable.

### Environment Variables Summary

```bash
# Transactional templates
supabase secrets set SENDGRID_TPL_WELCOME=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_EVENT_CONFIRMATION=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_EVENT_REMINDER=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_EVENT_CANCELLED=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_EVENT_INVITE=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_WAITLIST_PROMOTED=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_PASSWORD_RESET=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_DONATION_RECEIPT=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_ORDER_CONFIRMATION=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_ORDER_SHIPPED=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_DATA_EXPORT=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_PAYMENT_FAILED=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_SUBSCRIPTION_CANCELLED=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_REFUND_CONFIRMATION=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Marketing templates
supabase secrets set SENDGRID_TPL_NEWSLETTER=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_CHALLENGE=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_IMPACT_RECAP=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDGRID_TPL_ANNOUNCEMENT_DIGEST=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 6. Template Specifications

### Transactional Templates (14)

---

#### T1: Welcome Email
- **Env var:** `SENDGRID_TPL_WELCOME`
- **Trigger:** User signs up (email/password, Google, Apple, or magic link)
- **Subject line:** `Welcome to Co-Exist, {{name}}!`
- **Dynamic variables:**

| Variable    | Type   | Description                        | Example                          |
|-------------|--------|------------------------------------|----------------------------------|
| `name`      | string | User's display name                | `"Alex"` |
| `app_url`   | string | Link to the app                    | `"https://app.coexistaus.org"` |

- **Content guidance:** Welcome message, brief intro to what Co-Exist does, encourage joining a collective and attending first event.

---

#### T2: Event Registration Confirmation
- **Env var:** `SENDGRID_TPL_EVENT_CONFIRMATION`
- **Trigger:** User registers for an event (status = `registered`)
- **Subject line:** `You're registered for {{event_title}}`
- **Dynamic variables:**

| Variable         | Type   | Description                    | Example                                    |
|------------------|--------|--------------------------------|--------------------------------------------|
| `name`           | string | User's display name            | `"Alex"`                                   |
| `event_title`    | string | Event name                     | `"Beach Cleanup at Collaroy"`              |
| `event_date`     | string | Formatted date/time            | `"Sat 28 Mar 2026, 9:00 AM AEDT"`         |
| `event_location` | string | Event address                  | `"Collaroy Beach, Sydney NSW"`             |
| `event_url`      | string | Deep link to event detail      | `"https://app.coexistaus.org/events/abc123"` |

- **Content guidance:** Confirmation, event details, add-to-calendar prompt, what to bring.

---

#### T3: Event Reminder
- **Env var:** `SENDGRID_TPL_EVENT_REMINDER`
- **Trigger:** Scheduled cron - 24 hours and 2 hours before event start
- **Subject line:** `Reminder: {{event_title}} is {{time_until}}`
- **Dynamic variables:**

| Variable         | Type   | Description                    | Example                                    |
|------------------|--------|--------------------------------|--------------------------------------------|
| `name`           | string | User's display name            | `"Alex"`                                   |
| `event_title`    | string | Event name                     | `"Beach Cleanup at Collaroy"`              |
| `event_date`     | string | Formatted date/time            | `"Sat 28 Mar 2026, 9:00 AM AEDT"`         |
| `event_location` | string | Event address                  | `"Collaroy Beach, Sydney NSW"`             |
| `event_url`      | string | Deep link to event detail      | `"https://app.coexistaus.org/events/abc123"` |
| `time_until`     | string | Human-readable time remaining  | `"tomorrow"` or `"in 2 hours"`             |

- **Content guidance:** Friendly reminder, event details, directions/map link, cancel link.

---

#### T4: Event Cancelled
- **Env var:** `SENDGRID_TPL_EVENT_CANCELLED`
- **Trigger:** Event organiser cancels an event (status → `cancelled`)
- **Subject line:** `{{event_title}} has been cancelled`
- **Dynamic variables:**

| Variable      | Type   | Description                  | Example                           |
|---------------|--------|------------------------------|-----------------------------------|
| `name`        | string | User's display name          | `"Alex"`                          |
| `event_title` | string | Event name                   | `"Beach Cleanup at Collaroy"`     |
| `event_date`  | string | Original date/time           | `"Sat 28 Mar 2026, 9:00 AM AEDT"` |
| `reason`      | string | Cancellation reason (optional)| `"Severe weather warning"`       |

- **Content guidance:** Apology, reason if provided, suggest other upcoming events.

---

#### T5: Event Invitation
- **Env var:** `SENDGRID_TPL_EVENT_INVITE`
- **Trigger:** Collective is invited to an event - sent to each member
- **Subject line:** `You're invited to {{event_title}}`
- **Dynamic variables:**

| Variable       | Type   | Description                    | Example                                    |
|----------------|--------|--------------------------------|--------------------------------------------|
| `name`         | string | Recipient's display name       | `"Alex"`                                   |
| `inviter_name` | string | Who sent the invitation        | `"Jordan"`                                 |
| `event_title`  | string | Event name                     | `"Beach Cleanup at Collaroy"`              |
| `event_date`   | string | Date/time                      | `"Sat 28 Mar 2026, 9:00 AM AEDT"`         |
| `event_url`    | string | Deep link to event detail      | `"https://app.coexistaus.org/events/abc123"` |

- **Content guidance:** Personal invite from their collective, event details, RSVP button.

---

#### T6: Waitlist Promoted
- **Env var:** `SENDGRID_TPL_WAITLIST_PROMOTED`
- **Trigger:** User promoted from waitlist to registered (spot opened up)
- **Subject line:** `A spot opened up - you're in for {{event_title}}!`
- **Dynamic variables:**

| Variable         | Type   | Description                    | Example                                    |
|------------------|--------|--------------------------------|--------------------------------------------|
| `name`           | string | User's display name            | `"Alex"`                                   |
| `event_title`    | string | Event name                     | `"Beach Cleanup at Collaroy"`              |
| `event_date`     | string | Date/time                      | `"Sat 28 Mar 2026, 9:00 AM AEDT"`         |
| `event_url`      | string | Deep link to event detail      | `"https://app.coexistaus.org/events/abc123"` |

- **Content guidance:** Exciting news, confirm their spot is secured, event details.

---

#### T7: Password Reset
- **Env var:** `SENDGRID_TPL_PASSWORD_RESET`
- **Trigger:** User requests password reset
- **Subject line:** `Reset your Co-Exist password`
- **Dynamic variables:**

| Variable    | Type   | Description           | Example                                              |
|-------------|--------|-----------------------|------------------------------------------------------|
| `name`      | string | User's display name   | `"Alex"`                                             |
| `reset_url` | string | Password reset link   | `"https://app.coexistaus.org/reset-password?token=..."` |

- **Content guidance:** Security notice, reset button/link, expiry warning (link valid 1 hour), "if you didn't request this" disclaimer.
- **Note:** Supabase Auth sends its own reset email by default. To use this custom template instead, configure Supabase Auth to use a custom SMTP or disable the built-in email and trigger via a database webhook on `auth.users` password reset events.

---

#### T8: Donation Receipt
- **Env var:** `SENDGRID_TPL_DONATION_RECEIPT`
- **Trigger:** Successful one-time or recurring donation payment
- **Subject line:** `Thank you for your ${{amount}} donation`
- **Dynamic variables:**

| Variable       | Type    | Description                         | Example                   |
|----------------|---------|-------------------------------------|---------------------------|
| `name`         | string  | Donor's display name                | `"Alex"`                  |
| `amount`       | string  | Formatted dollar amount             | `"25.00"`                 |
| `currency`     | string  | Currency code                       | `"AUD"`                   |
| `date`         | string  | Transaction date                    | `"20 March 2026"`         |
| `project_name` | string  | Donation project (if applicable)    | `"Koala Habitat Restoration"` |
| `message`      | string  | Donor's message (if any)            | `"For the koalas!"`       |
| `points_earned`| number  | Co-Exist points awarded             | `25`                      |
| `is_recurring` | boolean | Whether this is a recurring charge  | `false`                   |
| `receipt_url`  | string  | Link to donation history            | `"https://app.coexistaus.org/profile/donations"` |

- **Content guidance:** Thank you, tax-deductible receipt info (if applicable), impact statement, points earned.

---

#### T9: Order Confirmation
- **Env var:** `SENDGRID_TPL_ORDER_CONFIRMATION`
- **Trigger:** Successful merch checkout payment
- **Subject line:** `Order confirmed - #{{order_id}}`
- **Dynamic variables:**

| Variable           | Type   | Description                    | Example                                |
|--------------------|--------|--------------------------------|----------------------------------------|
| `name`             | string | Buyer's display name           | `"Alex"`                               |
| `order_id`         | string | Short order ID                 | `"ord-a1b2"`                           |
| `items`            | array  | List of items purchased        | `[{ "name": "Tote Bag", "variant": "Black", "qty": 1, "price": "$29.99" }]` |
| `subtotal`         | string | Subtotal before shipping       | `"$29.99"`                             |
| `shipping`         | string | Shipping cost                  | `"$9.95"`                              |
| `discount`         | string | Discount applied (if any)      | `"$0.00"`                              |
| `total`            | string | Total charged                  | `"$39.94"`                             |
| `shipping_address` | object | Delivery address               | `{ "line1": "123 Main St", "city": "Sydney", ... }` |
| `order_url`        | string | Link to order detail           | `"https://app.coexistaus.org/shop/orders/ord-a1b2"` |

- **Content guidance:** Order summary table, shipping address, estimated delivery, points earned.

---

#### T10: Order Shipped
- **Env var:** `SENDGRID_TPL_ORDER_SHIPPED`
- **Trigger:** Admin updates order status to `shipped` and adds tracking number
- **Subject line:** `Your order #{{order_id}} has shipped!`
- **Dynamic variables:**

| Variable          | Type   | Description              | Example                              |
|-------------------|--------|--------------------------|--------------------------------------|
| `name`            | string | Buyer's display name     | `"Alex"`                             |
| `order_id`        | string | Short order ID           | `"ord-a1b2"`                         |
| `tracking_number` | string | Carrier tracking number  | `"AP123456789AU"`                    |
| `tracking_url`    | string | Tracking link            | `"https://auspost.com.au/track/AP123456789AU"` |
| `carrier`         | string | Shipping carrier         | `"Australia Post"`                   |

- **Content guidance:** Tracking button, estimated delivery window, contact support link.

---

#### T11: Data Export Request
- **Env var:** `SENDGRID_TPL_DATA_EXPORT`
- **Trigger:** User requests data export from privacy settings
- **Subject line:** `Your Co-Exist data export is ready`
- **Dynamic variables:**

| Variable | Type   | Description           | Example          |
|----------|--------|-----------------------|------------------|
| `name`   | string | User's display name   | `"Alex"`         |
| `email`  | string | User's email address  | `"alex@example.com"` |

- **Content guidance:** Confirmation that data export has been requested, expected timeline (48 hours), privacy rights info.

---

#### T12: Payment Failed (Recurring Donation)
- **Env var:** `SENDGRID_TPL_PAYMENT_FAILED`
- **Trigger:** Stripe `invoice.payment_failed` for a recurring donation
- **Subject line:** `Action needed: your Co-Exist donation payment failed`
- **Dynamic variables:**

| Variable    | Type   | Description                          | Example                |
|-------------|--------|--------------------------------------|------------------------|
| `name`      | string | Donor's display name                 | `"Alex"`               |
| `amount`    | string | Failed payment amount                | `"10.00"`              |
| `update_url`| string | Link to update payment method        | `"https://app.coexistaus.org/profile/donations"` |

- **Content guidance:** Non-alarming notice, explain automatic retry, CTA to update payment method, reassure subscription won't be cancelled immediately.

---

#### T13: Subscription Cancelled
- **Env var:** `SENDGRID_TPL_SUBSCRIPTION_CANCELLED`
- **Trigger:** Stripe `customer.subscription.deleted`
- **Subject line:** `Your monthly donation has been cancelled`
- **Dynamic variables:**

| Variable     | Type   | Description                  | Example                |
|--------------|--------|------------------------------|------------------------|
| `name`       | string | Donor's display name         | `"Alex"`               |
| `donate_url` | string | Link to restart donations    | `"https://app.coexistaus.org/donate"` |

- **Content guidance:** Confirm cancellation, thank them for past support, invite to donate again, no guilt.

---

#### T14: Refund Confirmation
- **Env var:** `SENDGRID_TPL_REFUND_CONFIRMATION`
- **Trigger:** Stripe `charge.refunded` for a merch order
- **Subject line:** `Refund processed for order #{{order_id}}`
- **Dynamic variables:**

| Variable       | Type   | Description               | Example       |
|----------------|--------|---------------------------|---------------|
| `name`         | string | Buyer's display name      | `"Alex"`      |
| `order_id`     | string | Short order ID            | `"ord-a1b2"`  |
| `refund_amount`| string | Amount refunded           | `"39.94"`     |
| `currency`     | string | Currency code             | `"AUD"`       |

- **Content guidance:** Refund amount, 5-10 business day timeline, contact support if questions.

---

### Marketing Templates (4)

> Marketing emails check `profiles.marketing_opt_in` before sending. Users who have opted out will not receive these.

---

#### M1: Newsletter
- **Env var:** `SENDGRID_TPL_NEWSLETTER`
- **Trigger:** Manual send by admin (monthly)
- **Subject line:** `Co-Exist Monthly Update - {{month}}`
- **Dynamic variables:**

| Variable      | Type   | Description            | Example                          |
|---------------|--------|------------------------|----------------------------------|
| `name`        | string | Recipient's name       | `"Alex"`                         |
| `month`       | string | Newsletter month       | `"March 2026"`                   |
| `content_html`| string | Newsletter body HTML   | Rich HTML content                |

---

#### M2: Challenge Announcement
- **Env var:** `SENDGRID_TPL_CHALLENGE`
- **Trigger:** Admin creates a new challenge
- **Subject line:** `New Challenge: {{challenge_title}}`
- **Dynamic variables:**

| Variable                | Type   | Description               | Example                                    |
|-------------------------|--------|---------------------------|--------------------------------------------|
| `name`                  | string | Recipient's name          | `"Alex"`                                   |
| `challenge_title`       | string | Challenge name            | `"Plant 1000 Trees Challenge"`             |
| `challenge_description` | string | Brief description         | `"Help us plant 1000 trees by April!"`     |
| `challenge_url`         | string | Link to challenge         | `"https://app.coexistaus.org/challenges/xyz"` |
| `start_date`            | string | Challenge start date      | `"1 April 2026"`                           |
| `end_date`              | string | Challenge end date        | `"30 April 2026"`                          |

---

#### M3: Monthly Impact Recap
- **Env var:** `SENDGRID_TPL_IMPACT_RECAP`
- **Trigger:** Scheduled cron - 1st of each month
- **Subject line:** `Your {{month}} impact with Co-Exist`
- **Dynamic variables:**

| Variable       | Type   | Description                   | Example         |
|----------------|--------|-------------------------------|-----------------|
| `name`         | string | Recipient's name              | `"Alex"`        |
| `month`        | string | Recap month                   | `"February 2026"` |
| `events_count` | number | Events attended               | `3`             |
| `trees`        | number | Trees planted                 | `15`            |
| `hours`        | number | Volunteer hours               | `12`            |
| `rubbish_kg`   | number | Rubbish collected (kg)        | `8.5`           |
| `points`       | number | Points earned this month      | `120`           |
| `total_points` | number | Cumulative points             | `890`           |

---

#### M4: Announcement Digest
- **Env var:** `SENDGRID_TPL_ANNOUNCEMENT_DIGEST`
- **Trigger:** Scheduled cron - weekly (if there are new announcements)
- **Subject line:** `This week in Co-Exist`
- **Dynamic variables:**

| Variable        | Type  | Description                      | Example                          |
|-----------------|-------|----------------------------------|----------------------------------|
| `name`          | string| Recipient's name                 | `"Alex"`                         |
| `announcements` | array | List of announcement objects     | `[{ "title": "...", "body": "...", "url": "..." }]` |
| `week_of`       | string| Week start date                  | `"16 March 2026"`                |

---

## 7. Template Design Guidelines

- Use Co-Exist brand colours: primary green `#2D5F2D`, accent gold `#D4A843`, white `#FFFFFF`
- Include the Co-Exist logo at the top of every email
- Mobile-responsive design (most users on phones)
- Footer must include: unsubscribe link, Co-Exist ABN, physical address (PO Box), social links
- Keep email body under 100KB for deliverability
- Test with [Litmus](https://litmus.com) or [Email on Acid](https://emailonacid.com) before going live

## 8. Testing

1. Use SendGrid's **Design Editor** to create and preview templates
2. Send test emails using the SendGrid dashboard or:

```bash
# Test via the edge function locally
supabase functions serve send-email --env-file supabase/.env.local

curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "to": "test@example.com",
    "data": { "name": "Test User", "app_url": "https://app.coexistaus.org" }
  }'
```

## 9. Monitoring

- SendGrid dashboard: **Activity → Email Activity** for delivery/bounce/open tracking
- Co-Exist admin panel: `/admin/email` shows bounces, spam complaints, and suppressed addresses
- Set up **Event Webhooks** in SendGrid to POST delivery events to a Supabase edge function for the `email_events` table

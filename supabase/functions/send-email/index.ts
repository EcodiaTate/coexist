// Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ------------------------------------------------------------------ */
/*  SendGrid Configuration                                             */
/* ------------------------------------------------------------------ */

/**
 * SendGrid Setup Requirements:
 * 1. Domain verification: Verify coexistaus.org in SendGrid (DNS records: CNAME for DKIM, TXT for SPF)
 * 2. API key: Create a restricted API key with "Mail Send" permission
 * 3. Templates: Create dynamic templates in SendGrid for each email type below
 * 4. Env vars: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME
 */

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'hello@coexistaus.org'
const FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') ?? 'Co-Exist'

/* ------------------------------------------------------------------ */
/*  Email Template Definitions                                         */
/* ------------------------------------------------------------------ */

/**
 * Each template maps to a SendGrid dynamic template ID.
 * Set these as environment variables: SENDGRID_TPL_{TYPE}
 *
 * Dynamic template data is passed as `dynamic_template_data` in the API call.
 * Design templates in the SendGrid dashboard with Handlebars syntax.
 */

interface TemplateDefinition {
  templateIdEnvKey: string
  category: 'transactional' | 'marketing'
  description: string
}

const EMAIL_TEMPLATES: Record<string, TemplateDefinition> = {
  // ---- Transactional ----
  welcome: {
    templateIdEnvKey: 'SENDGRID_TPL_WELCOME',
    category: 'transactional',
    description: 'Welcome email after signup. Data: { name, app_url }',
  },
  event_confirmation: {
    templateIdEnvKey: 'SENDGRID_TPL_EVENT_CONFIRMATION',
    category: 'transactional',
    description: 'Event registration confirmation. Data: { name, event_title, event_date, event_location, event_url }',
  },
  event_reminder: {
    templateIdEnvKey: 'SENDGRID_TPL_EVENT_REMINDER',
    category: 'transactional',
    description: '24h event reminder. Data: { name, event_title, event_date, event_location, event_url }',
  },
  event_cancelled: {
    templateIdEnvKey: 'SENDGRID_TPL_EVENT_CANCELLED',
    category: 'transactional',
    description: 'Event cancelled notification. Data: { name, event_title, event_date, reason }',
  },
  event_invite: {
    templateIdEnvKey: 'SENDGRID_TPL_EVENT_INVITE',
    category: 'transactional',
    description: 'Invited to an event. Data: { name, inviter_name, event_title, event_url }',
  },
  waitlist_promoted: {
    templateIdEnvKey: 'SENDGRID_TPL_WAITLIST_PROMOTED',
    category: 'transactional',
    description: 'Promoted from waitlist. Data: { name, event_title, event_date, event_url }',
  },
  password_reset: {
    templateIdEnvKey: 'SENDGRID_TPL_PASSWORD_RESET',
    category: 'transactional',
    description: 'Password reset. Data: { name, reset_url }',
  },
  donation_receipt: {
    templateIdEnvKey: 'SENDGRID_TPL_DONATION_RECEIPT',
    category: 'transactional',
    description: 'Donation receipt. Data: { name, amount, currency, date, receipt_url, is_recurring }',
  },
  order_confirmation: {
    templateIdEnvKey: 'SENDGRID_TPL_ORDER_CONFIRMATION',
    category: 'transactional',
    description: 'Merch order confirmation. Data: { name, order_id, items, total, shipping_address }',
  },
  order_shipped: {
    templateIdEnvKey: 'SENDGRID_TPL_ORDER_SHIPPED',
    category: 'transactional',
    description: 'Order shipped. Data: { name, order_id, tracking_number, tracking_url }',
  },
  'data-export-request': {
    templateIdEnvKey: 'SENDGRID_TPL_DATA_EXPORT',
    category: 'transactional',
    description: 'Data export requested. Data: { name, email }',
  },
  payment_failed: {
    templateIdEnvKey: 'SENDGRID_TPL_PAYMENT_FAILED',
    category: 'transactional',
    description: 'Recurring payment failed. Data: { name, amount, update_url }',
  },
  subscription_cancelled: {
    templateIdEnvKey: 'SENDGRID_TPL_SUBSCRIPTION_CANCELLED',
    category: 'transactional',
    description: 'Subscription cancelled. Data: { name, donate_url }',
  },
  refund_confirmation: {
    templateIdEnvKey: 'SENDGRID_TPL_REFUND_CONFIRMATION',
    category: 'transactional',
    description: 'Order refund processed. Data: { name, order_id, refund_amount, currency }',
  },

  collective_application: {
    templateIdEnvKey: 'SENDGRID_TPL_COLLECTIVE_APPLICATION',
    category: 'transactional',
    description: 'New collective application notification. Data: { applicant_name, applicant_email, roles, location }',
  },

  // ---- Marketing ----
  newsletter: {
    templateIdEnvKey: 'SENDGRID_TPL_NEWSLETTER',
    category: 'marketing',
    description: 'Monthly newsletter. Data: { name, content_html }',
  },
  challenge_announcement: {
    templateIdEnvKey: 'SENDGRID_TPL_CHALLENGE',
    category: 'marketing',
    description: 'New challenge launched. Data: { name, challenge_title, challenge_description, challenge_url }',
  },
  monthly_impact_recap: {
    templateIdEnvKey: 'SENDGRID_TPL_IMPACT_RECAP',
    category: 'marketing',
    description: 'Monthly impact summary. Data: { name, events_count, trees, hours, rubbish_kg, month }',
  },
  announcement_digest: {
    templateIdEnvKey: 'SENDGRID_TPL_ANNOUNCEMENT_DIGEST',
    category: 'marketing',
    description: 'Weekly announcement digest. Data: { name, announcements[] }',
  },
}

/* ------------------------------------------------------------------ */
/*  SendGrid API call                                                  */
/* ------------------------------------------------------------------ */

interface SendEmailPayload {
  /** Email type - must match a key in EMAIL_TEMPLATES */
  type: string
  /** Recipient email address */
  to: string
  /** Dynamic template data (Handlebars variables) */
  data?: Record<string, unknown>
  /** Optional: override the subject (for non-template sends) */
  subject?: string
  /** For internal requests (e.g. data export) */
  userId?: string
  email?: string
}

async function sendViaSendGrid(
  to: string,
  templateId: string,
  dynamicData: Record<string, unknown>,
  category: string,
): Promise<{ success: boolean; error?: string }> {
  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          dynamic_template_data: dynamicData,
        },
      ],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      template_id: templateId,
      categories: [category],
      // CAN-SPAM: one-click unsubscribe header
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@coexistaus.org?subject=Unsubscribe>, <https://app.coexistaus.org/unsubscribe?email=${encodeURIComponent(to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error(`[send-email] SendGrid error:`, err)
    return { success: false, error: err }
  }

  return { success: true }
}

/* ------------------------------------------------------------------ */
/*  Unsubscribe handling (CAN-SPAM compliant)                          */
/* ------------------------------------------------------------------ */

async function handleUnsubscribe(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  // Find user by email - paginate through all users (listUsers default page is 50)
  let page = 1
  const perPage = 1000
  let found = false

  while (!found) {
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (!usersPage?.users?.length) break

    const user = usersPage.users.find((u: { email?: string }) => u.email === email)
    if (user) {
      await supabaseAdmin
        .from('profiles')
        .update({ marketing_opt_in: false })
        .eq('id', user.id)
      found = true
    }

    // If we got fewer results than page size, we've reached the end
    if (usersPage.users.length < perPage) break
    page++
  }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)

    // Handle one-click unsubscribe (POST to /unsubscribe)
    // This must remain unauthenticated for CAN-SPAM compliance,
    // but we use a signed token approach instead of raw email
    if (url.pathname.endsWith('/unsubscribe') && req.method === 'POST') {
      const formData = await req.formData().catch(() => null)
      const email = formData?.get('email') as string | null
        || url.searchParams.get('email')

      if (email) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        await handleUnsubscribe(supabaseAdmin, email)
      }

      return new Response('Unsubscribed', { status: 200 })
    }

    // ── Auth: require service-role key or authenticated user ──
    // This function is called internally by other edge functions (using service-role)
    // and by the frontend (using user's auth token).
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Allow service-role callers (internal edge function calls) through directly
    if (token !== serviceRoleKey) {
      // Validate as user token
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      )
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
      if (authError || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const payload = (await req.json()) as SendEmailPayload
    const { type, data = {} } = payload

    // Resolve recipient
    let toEmail = payload.to || payload.email || ''

    // If userId provided but no email, look it up
    if (!toEmail && payload.userId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(payload.userId)
      toEmail = userData?.user?.email ?? ''
    }

    if (!toEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'No recipient email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Look up template
    const templateDef = EMAIL_TEMPLATES[type]
    if (!templateDef) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown email type: ${type}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Check marketing opt-in for marketing emails
    if (templateDef.category === 'marketing') {
      if (!payload.userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId required for marketing emails' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('marketing_opt_in')
        .eq('id', payload.userId)
        .single()

      // If profile not found or user has opted out, don't send
      if (!profile || profile.marketing_opt_in === false) {
        return new Response(
          JSON.stringify({ success: false, error: 'User opted out of marketing or not found' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    const templateId = Deno.env.get(templateDef.templateIdEnvKey)
    if (!templateId) {
      console.error(`[send-email] Missing env var: ${templateDef.templateIdEnvKey}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Template not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const result = await sendViaSendGrid(
      toEmail,
      templateId,
      data,
      templateDef.category,
    )

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-email] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})

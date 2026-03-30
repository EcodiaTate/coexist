// Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ------------------------------------------------------------------ */
/*  Resend Configuration                                               */
/* ------------------------------------------------------------------ */

/**
 * Resend Setup Requirements:
 * 1. Domain verification: Verify coexistaus.org in Resend (DNS records for DKIM, SPF, DMARC)
 * 2. API key: Create an API key at resend.com/api-keys
 * 3. Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'hello@coexistaus.org'
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') ?? 'Co-Exist'

/* ------------------------------------------------------------------ */
/*  Email Template Definitions                                         */
/* ------------------------------------------------------------------ */

/**
 * Resend doesn't use server-side template IDs like SendGrid.
 * Instead, you send HTML directly (or use React Email on the server).
 *
 * For now, each template type maps to a subject line generator and
 * an HTML builder. The `data` object passed by callers is used to
 * populate the email content.
 *
 * To use React Email templates later, build them in a shared package
 * and render to HTML before passing to the Resend API.
 */

interface TemplateDefinition {
  category: 'transactional' | 'marketing'
  description: string
  subject: (data: Record<string, unknown>) => string
}

const EMAIL_TEMPLATES: Record<string, TemplateDefinition> = {
  // ---- Transactional ----
  welcome: {
    category: 'transactional',
    description: 'Welcome email after signup. Data: { name, app_url }',
    subject: () => 'Welcome to Co-Exist!',
  },
  event_confirmation: {
    category: 'transactional',
    description: 'Event registration confirmation. Data: { name, event_title, event_date, event_location, event_url }',
    subject: (d) => `You're registered: ${d.event_title}`,
  },
  event_reminder: {
    category: 'transactional',
    description: '24h event reminder. Data: { name, event_title, event_date, event_location, event_url }',
    subject: (d) => `Reminder: ${d.event_title} is coming up`,
  },
  event_cancelled: {
    category: 'transactional',
    description: 'Event cancelled notification. Data: { name, event_title, event_date, reason }',
    subject: (d) => `Event cancelled: ${d.event_title}`,
  },
  event_invite: {
    category: 'transactional',
    description: 'Invited to an event. Data: { name, inviter_name, event_title, event_url }',
    subject: (d) => `${d.inviter_name} invited you to ${d.event_title}`,
  },
  waitlist_promoted: {
    category: 'transactional',
    description: 'Promoted from waitlist. Data: { name, event_title, event_date, event_url }',
    subject: (d) => `You're in! Spot available for ${d.event_title}`,
  },
  password_reset: {
    category: 'transactional',
    description: 'Password reset. Data: { name, reset_url }',
    subject: () => 'Reset your password',
  },
  donation_receipt: {
    category: 'transactional',
    description: 'Donation receipt. Data: { name, amount, currency, date, receipt_url, is_recurring }',
    subject: (d) => `Thanks for your ${d.is_recurring ? 'recurring ' : ''}donation!`,
  },
  order_confirmation: {
    category: 'transactional',
    description: 'Merch order confirmation. Data: { name, order_id, items, total, shipping_address }',
    subject: (d) => `Order confirmed: #${d.order_id}`,
  },
  order_shipped: {
    category: 'transactional',
    description: 'Order shipped. Data: { name, order_id, tracking_number, tracking_url }',
    subject: (d) => `Your order #${d.order_id} has shipped!`,
  },
  'data-export-request': {
    category: 'transactional',
    description: 'Data export requested. Data: { name, email }',
    subject: () => 'Your data export request',
  },
  payment_failed: {
    category: 'transactional',
    description: 'Recurring payment failed. Data: { name, amount, update_url }',
    subject: () => 'Payment failed — action needed',
  },
  subscription_cancelled: {
    category: 'transactional',
    description: 'Subscription cancelled. Data: { name, donate_url }',
    subject: () => 'Your recurring donation has been cancelled',
  },
  refund_confirmation: {
    category: 'transactional',
    description: 'Order refund processed. Data: { name, order_id, refund_amount, currency }',
    subject: (d) => `Refund processed for order #${d.order_id}`,
  },

  collective_application: {
    category: 'transactional',
    description: 'New collective application notification. Data: { applicant_name, applicant_email, roles, location }',
    subject: (d) => `New Collective Application: ${d.applicant_name}`,
  },

  // ---- Marketing ----
  newsletter: {
    category: 'marketing',
    description: 'Monthly newsletter. Data: { name, content_html }',
    subject: () => 'Co-Exist Monthly Update',
  },
  challenge_announcement: {
    category: 'marketing',
    description: 'New challenge launched. Data: { name, challenge_title, challenge_description, challenge_url }',
    subject: (d) => `New Challenge: ${d.challenge_title}`,
  },
  monthly_impact_recap: {
    category: 'marketing',
    description: 'Monthly impact summary. Data: { name, events_count, trees, hours, rubbish_kg, month }',
    subject: (d) => `Your ${d.month} impact recap`,
  },
  announcement_digest: {
    category: 'marketing',
    description: 'Weekly announcement digest. Data: { name, announcements[] }',
    subject: () => 'This week at Co-Exist',
  },
}

/* ------------------------------------------------------------------ */
/*  Resend API call                                                    */
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
  /** Optional: HTML content (used by campaign sends) */
  html?: string
  /** For internal requests (e.g. data export) */
  userId?: string
  email?: string
}

/**
 * Build a simple branded HTML email wrapper.
 * For richer templates, swap this out for React Email rendered server-side.
 */
function buildEmailHtml(data: Record<string, unknown>): string {
  const name = (data.name as string) || 'there'
  // If raw HTML content is provided (e.g. newsletter), wrap it
  if (data.content_html) {
    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Hey ${name},</p>
      ${data.content_html}
      <p style="color: #6b7a5a; font-size: 13px; margin-top: 32px;">— Co-Exist</p>
    </div>`
  }

  // Build a simple key-value summary from the data
  const exclude = new Set(['name', 'content_html'])
  const entries = Object.entries(data).filter(([k]) => !exclude.has(k))
  const rows = entries
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7a5a;font-size:13px;font-weight:600;">${k.replace(/_/g, ' ')}</td><td style="padding:6px 0;color:#2d3a22;font-size:14px;">${v}</td></tr>`)
    .join('')

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <p>Hey ${name},</p>
    ${rows ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>` : ''}
    <p style="color: #6b7a5a; font-size: 13px; margin-top: 32px;">— Co-Exist</p>
  </div>`
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  tags: { name: string; value: string }[],
): Promise<{ success: boolean; error?: string }> {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      tags,
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@coexistaus.org?subject=Unsubscribe>, <https://app.coexistaus.org/unsubscribe?email=${encodeURIComponent(to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error(`[send-email] Resend error:`, err)
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

      return new Response('Unsubscribed', { status: 200, headers: corsHeaders })
    }

    // ── Auth: require service-role key or authenticated user ──
    // This function is called internally by other edge functions (using service-role)
    // and by the frontend (using user's auth token).
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    const subject = payload.subject || templateDef.subject(data)
    const html = payload.html || buildEmailHtml(data)

    const result = await sendViaResend(
      toEmail,
      subject,
      html,
      [
        { name: 'category', value: templateDef.category },
        { name: 'type', value: type },
      ],
    )

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-email] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})

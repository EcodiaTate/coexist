/* eslint-disable @typescript-eslint/no-explicit-any */
// Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ------------------------------------------------------------------ */
/*  SendGrid bulk campaign sender                                      */
/* ------------------------------------------------------------------ */

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'hello@coexistaus.org'
const FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') ?? 'Co-Exist'
const BATCH_SIZE = 50 // SendGrid personalizations per API call (max 1000)
const DELAY_MS = 200  // Pause between batches to respect rate limits

interface CampaignPayload {
  campaign_id: string
}

async function sendBatch(
  recipients: { email: string; name?: string }[],
  subject: string,
  htmlContent: string,
  textContent: string,
): Promise<{ success: boolean; error?: string }> {
  const personalizations = recipients.map((r) => ({
    to: [{ email: r.email, name: r.name }],
    dynamic_template_data: { name: r.name || 'there', subject },
  }))

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        { type: 'text/plain', value: textContent || 'View this email in a browser.' },
        { type: 'text/html', value: htmlContent },
      ],
      categories: ['campaign'],
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@coexistaus.org?subject=Unsubscribe>, <https://app.coexistaus.org/unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    console.error('[send-campaign] SendGrid error:', err)
    return { success: false, error: err }
  }
  return { success: true }
}

serve(async (req: Request) => {
  try {
    // ── Auth: require admin/staff ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller is admin/staff
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!callerProfile || !['national_staff', 'national_admin', 'super_admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      })
    }

    const { campaign_id } = (await req.json()) as CampaignPayload

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'campaign_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 1. Load campaign
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single()

    if (cErr || !campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return new Response(
        JSON.stringify({ success: false, error: `Campaign already ${campaign.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 2. Mark as sending
    await supabaseAdmin
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id)

    // 3. Resolve audience
    const { data: audience, error: aErr } = await supabaseAdmin
      .rpc('resolve_campaign_audience', {
        p_target_all: campaign.target_all,
        p_tag_ids: campaign.target_tag_ids || [],
        p_collective_ids: campaign.target_collective_ids || [],
      })

    if (aErr) {
      console.error('[send-campaign] Audience error:', aErr)
      await supabaseAdmin
        .from('email_campaigns')
        .update({ status: 'draft' })
        .eq('id', campaign_id)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to resolve audience' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!audience?.length) {
      await supabaseAdmin
        .from('email_campaigns')
        .update({ status: 'draft', total_recipients: 0 })
        .eq('id', campaign_id)
      return new Response(
        JSON.stringify({ success: false, error: 'No eligible recipients' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 4. Insert recipient records
    const recipientRows = audience.map((a: any) => ({
      campaign_id,
      profile_id: a.profile_id,
      email: a.email,
      status: 'queued',
    }))

    await supabaseAdmin.from('campaign_recipients').insert(recipientRows)

    // 5. Load names for personalisation
    const profileIds = audience.map((a: any) => a.profile_id)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, first_name')
      .in('id', profileIds)

    const nameMap = new Map<string, string>()
    for (const p of profiles || []) {
      nameMap.set(p.id, p.display_name || p.first_name || '')
    }

    // 6. Send in batches
    let totalSent = 0
    let totalFailed = 0

    for (let i = 0; i < audience.length; i += BATCH_SIZE) {
      const batch = audience.slice(i, i + BATCH_SIZE)
      const recipients = batch.map((a: any) => ({
        email: a.email,
        name: nameMap.get(a.profile_id) || undefined,
      }))

      const result = await sendBatch(
        recipients,
        campaign.subject,
        campaign.body_html,
        campaign.body_text || '',
      )

      // Update recipient statuses
      const batchIds = batch.map((a: any) => a.profile_id)
      if (result.success) {
        totalSent += batch.length
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('campaign_id', campaign_id)
          .in('profile_id', batchIds)
      } else {
        totalFailed += batch.length
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'failed', error_message: result.error?.slice(0, 500) })
          .eq('campaign_id', campaign_id)
          .in('profile_id', batchIds)
      }

      // Rate limit pause
      if (i + BATCH_SIZE < audience.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
    }

    // 7. Finalise campaign
    await supabaseAdmin
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: audience.length,
        total_delivered: totalSent,
        total_bounced: totalFailed,
      })
      .eq('id', campaign_id)

    return new Response(
      JSON.stringify({
        success: true,
        total: audience.length,
        sent: totalSent,
        failed: totalFailed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[send-campaign] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})

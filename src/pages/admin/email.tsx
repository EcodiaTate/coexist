import { useState, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import DOMPurify from 'dompurify'
import {
    AlertTriangle,
    XCircle,
    Send,
    Users,
    Tag,
    FileText,
    BarChart3,
    Plus,
    Search,
    Trash2,
    Copy,
    Eye,
    Edit3,
    CheckCircle2,
    MousePointerClick,
    Save,
    ArrowLeft,
    Sparkles,
    RefreshCw,
    MapPin,
    Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Dropdown } from '@/components/dropdown'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface EmailTag {
  id: string
  name: string
  colour: string
  description: string | null
  created_at: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  category: string
  created_by: string | null
  updated_at: string
  created_at: string
}

interface EmailCampaign {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  template_id: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  target_all: boolean
  target_tag_ids: string[]
  target_collective_ids: string[]
  scheduled_at: string | null
  sent_at: string | null
  total_recipients: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  total_unsubscribed: number
  created_by: string | null
  updated_at: string
  created_at: string
}

/* ================================================================== */
/*  Tabs                                                               */
/* ================================================================== */

const tabs = [
  { id: 'campaigns', label: 'Campaigns', icon: <Send size={14} /> },
  { id: 'templates', label: 'Templates', icon: <FileText size={14} /> },
  { id: 'subscribers', label: 'Subscribers', icon: <Users size={14} /> },
  { id: 'tags', label: 'Tags', icon: <Tag size={14} /> },
  { id: 'delivery', label: 'Delivery', icon: <BarChart3 size={14} /> },
]

/* ================================================================== */
/*  Hooks                                                              */
/* ================================================================== */

function useEmailMarketingStats() {
  return useQuery({
    queryKey: ['admin-email-marketing-stats'],
    queryFn: async () => {
      const [subscribersRes, campaignsRes, bouncesRes, suppressedRes] = await Promise.all([
        supabase.rpc('email_subscriber_count' as any),
        supabase
          .from('email_campaigns' as any)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent'),
        supabase
          .from('email_events' as any)
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'bounce'),
        supabase
          .from('email_suppressions' as any)
          .select('id', { count: 'exact', head: true }),
      ])

      return {
        subscribers: (subscribersRes.data as number) ?? 0,
        campaignsSent: campaignsRes.count ?? 0,
        bounces: bouncesRes.count ?? 0,
        suppressed: suppressedRes.count ?? 0,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useCampaigns() {
  return useQuery({
    queryKey: ['admin-email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as unknown as EmailCampaign[]
    },
    staleTime: 30 * 1000,
  })
}

function useTemplates() {
  return useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates' as any)
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as EmailTemplate[]
    },
    staleTime: 60 * 1000,
  })
}

function useSubscribers(search: string, tagFilter: string | null) {
  return useQuery({
    queryKey: ['admin-email-subscribers', search, tagFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          avatar_url,
          location,
          interests,
          membership_level,
          points,
          onboarding_completed,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,location.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      let profiles = (data ?? []) as any[]

      // Load marketing_opt_in from profiles (added by migration 005, not in generated types)
      // The select('*') would get it but we need to be explicit - use a separate query
      const profileIds = profiles.map((p: any) => p.id)
      const { data: optInData } = await supabase
        .from('profiles' as any)
        .select('id, marketing_opt_in')
        .in('id', profileIds.length ? profileIds : ['__none__'])
      const optInMap = new Map<string, boolean>()
      for (const row of (optInData ?? []) as any[]) {
        optInMap.set(row.id, row.marketing_opt_in !== false)
      }

      // If tag filter, filter by profile_tags
      if (tagFilter) {
        const { data: taggedIds } = await supabase
          .from('profile_tags' as any)
          .select('profile_id')
          .eq('tag_id', tagFilter)
        const idSet = new Set((taggedIds ?? []).map((t: any) => t.profile_id))
        profiles = profiles.filter((p: any) => idSet.has(p.id))
      }

      // Load tags for each profile
      const finalIds = profiles.map((p: any) => p.id)
      const { data: allTags } = await supabase
        .from('profile_tags' as any)
        .select('profile_id, tag_id, email_tags(id, name, colour)')
        .in('profile_id', finalIds.length ? finalIds : ['__none__'])

      const tagMap = new Map<string, EmailTag[]>()
      for (const pt of (allTags ?? []) as any[]) {
        const existing = tagMap.get(pt.profile_id) ?? []
        if (pt.email_tags) existing.push(pt.email_tags)
        tagMap.set(pt.profile_id, existing)
      }

      return profiles.map((p: any) => ({
        ...p,
        marketing_opt_in: optInMap.get(p.id) ?? true,
        tags: tagMap.get(p.id) ?? [],
      }))
    },
    staleTime: 30 * 1000,
  })
}

function useTags() {
  return useQuery({
    queryKey: ['admin-email-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_tags' as any)
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []) as unknown as EmailTag[]
    },
    staleTime: 60 * 1000,
  })
}

function useCollectives() {
  return useQuery({
    queryKey: ['admin-collectives-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives' as any)
        .select('id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as unknown as { id: string; name: string }[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useEmailBounces() {
  return useQuery({
    queryKey: ['admin-email-bounces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events' as any)
        .select('*')
        .eq('event_type', 'bounce')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as any[]
    },
    staleTime: 60 * 1000,
  })
}

function useEmailComplaints() {
  return useQuery({
    queryKey: ['admin-email-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events' as any)
        .select('*')
        .eq('event_type', 'complaint')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as any[]
    },
    staleTime: 60 * 1000,
  })
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
      'img', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code', 'sup', 'sub',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'width', 'height'],
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-primary-100', text: 'text-primary-600', label: 'Draft' },
  scheduled: { bg: 'bg-info-100', text: 'text-info-700', label: 'Scheduled' },
  sending: { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Sending' },
  sent: { bg: 'bg-success-100', text: 'text-success-700', label: 'Sent' },
  cancelled: { bg: 'bg-error-100', text: 'text-error-700', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.draft
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full',
        config.bg,
        config.text,
      )}
    >
      {config.label}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 flex-1">
      <div className="flex items-center gap-1 mb-0.5">
        {icon && <span className="text-white/50">{icon}</span>}
        <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/50 truncate">
          {label}
        </p>
      </div>
      <p className="text-base sm:text-xl font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}

function TagPill({ tag, size = 'sm' }: { tag: EmailTag; size?: 'sm' | 'xs' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-[10px] px-2 py-0.5',
      )}
      style={{
        backgroundColor: `${tag.colour}20`,
        color: tag.colour,
      }}
    >
      {tag.name}
    </span>
  )
}

/* ================================================================== */
/*  Campaign Composer (Create/Edit)                                    */
/* ================================================================== */

function CampaignComposer({
  campaign,
  onClose,
  onSaved,
}: {
  campaign?: EmailCampaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: templates } = useTemplates()
  const { data: tags } = useTags()
  const { data: collectives } = useCollectives()

  const [name, setName] = useState(campaign?.name ?? '')
  const [subject, setSubject] = useState(campaign?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(campaign?.body_html ?? '')
  const [bodyText, setBodyText] = useState(campaign?.body_text ?? '')
  const [targetAll, setTargetAll] = useState(campaign?.target_all ?? true)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(campaign?.target_tag_ids ?? [])
  const [selectedCollectiveIds, setSelectedCollectiveIds] = useState<string[]>(
    campaign?.target_collective_ids ?? [],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState(campaign?.template_id ?? '')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'compose' | 'audience' | 'preview'>('compose')

  // Template field values - filled in per-campaign
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [showHtmlEditor, setShowHtmlEditor] = useState(false)

  // Extract template variables
  const templateVars = useMemo(() => extractTemplateVariables(bodyHtml), [bodyHtml])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates?.find((t) => t.id === templateId)
    if (tpl) {
      setSubject(tpl.subject)
      setBodyHtml(tpl.body_html)
      setBodyText(tpl.body_text)
      if (!name) setName(tpl.name)
      // Reset field values when switching templates
      setFieldValues({})
    }
  }

  // Apply field values to the template HTML for preview / sending
  const resolvedHtml = useMemo(() => {
    let html = bodyHtml
    for (const [key, val] of Object.entries(fieldValues)) {
      html = html.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
    }
    return html
  }, [bodyHtml, fieldValues])

  const resolvedText = useMemo(() => {
    let text = bodyText
    for (const [key, val] of Object.entries(fieldValues)) {
      text = text.replaceAll(`{{${key}}}`, val || `{{${key}}}`)
    }
    return text
  }, [bodyText, fieldValues])

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  const toggleCollective = (collectiveId: string) => {
    setSelectedCollectiveIds((prev) =>
      prev.includes(collectiveId)
        ? prev.filter((id) => id !== collectiveId)
        : [...prev, collectiveId],
    )
  }

  const handleSave = async (andSend = false) => {
    if (!name.trim() || !subject.trim()) {
      toast.error('Campaign name and subject are required')
      return
    }
    if (!resolvedHtml.trim()) {
      toast.error('Email body cannot be empty')
      return
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      body_html: resolvedHtml,
      body_text: resolvedText,
      template_id: selectedTemplateId || null,
      target_all: targetAll,
      target_tag_ids: targetAll ? [] : selectedTagIds,
      target_collective_ids: targetAll ? [] : selectedCollectiveIds,
      status: andSend ? 'sending' as const : 'draft' as const,
      created_by: user?.id,
    }

    // Optimistic: add/update in cache and close immediately
    const tempId = campaign?.id ?? crypto.randomUUID()
    const optimistic: EmailCampaign = {
      id: tempId,
      ...payload,
      target_tag_ids: payload.target_tag_ids ?? [],
      target_collective_ids: payload.target_collective_ids ?? [],
      scheduled_at: null,
      sent_at: andSend ? new Date().toISOString() : null,
      total_recipients: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      total_bounced: 0,
      total_unsubscribed: 0,
      created_by: user?.id ?? null,
      created_at: campaign?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    queryClient.setQueryData<EmailCampaign[]>(['admin-email-campaigns'], (old) => {
      const filtered = (old ?? []).filter((c) => c.id !== tempId)
      return [optimistic, ...filtered]
    })
    onSaved()

    try {
      let campaignId = campaign?.id

      if (campaign) {
        const { error } = await supabase
          .from('email_campaigns' as any)
          .update(payload as any)
          .eq('id', campaign.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('email_campaigns' as any)
          .insert(payload as any)
          .select('id')
          .single()
        if (error) throw error
        campaignId = (data as any).id
      }

      if (andSend && campaignId) {
        const { error: sendErr } = await supabase.functions.invoke('send-campaign', {
          body: { campaign_id: campaignId },
        })
        if (sendErr) {
          toast.error('Campaign saved but sending failed. You can retry from the campaigns list.')
        } else {
          toast.success('Campaign is sending!')
        }
      } else {
        toast.success('Campaign saved as draft')
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save campaign')
    } finally {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['admin-email-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin-email-marketing-stats'] })
    }
  }

  const inputClasses = 'w-full rounded-xl bg-white px-4 py-3 text-sm text-primary-800 leading-relaxed placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 outline-none resize-y'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex items-center justify-center min-w-11 min-h-11 rounded-lg bg-primary-100/70 text-primary-500 hover:bg-primary-200/70 transition-colors cursor-pointer"
          aria-label="Back to campaigns"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-heading text-lg font-bold text-primary-800">
          {campaign ? 'Edit Campaign' : 'New Campaign'}
        </h2>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1">
        {(['compose', 'audience', 'preview'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={cn(
              'flex-1 min-h-11 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-150 capitalize cursor-pointer',
              step === s
                ? 'bg-primary-50 shadow-sm text-primary-800'
                : 'text-primary-400 hover:text-primary-600',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Step: Compose */}
      {step === 'compose' && (
        <div className="space-y-4">
          {/* Template selection */}
          <div>
            <label className="block text-xs font-medium text-primary-400 mb-1.5">
              Email Template
            </label>
            <Dropdown
              options={[
                { value: '', label: 'No template (write HTML directly)' },
                ...(templates ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={selectedTemplateId}
              onChange={handleTemplateSelect}
              placeholder="Choose a template..."
            />
            {!templates?.length && (
              <p className="text-[11px] text-primary-400 mt-1">
                No templates yet - create one in the Templates tab with AI
              </p>
            )}
          </div>

          <Input
            label="Campaign Name"
            placeholder="e.g. March Newsletter"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Subject Line"
            placeholder="What subscribers will see in their inbox"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          {/* Template field inputs */}
          {templateVars.length > 0 && (
            <div className="rounded-xl bg-white border border-primary-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Edit3 size={14} className="text-primary-500" />
                <h4 className="text-sm font-semibold text-primary-800">Fill in template fields</h4>
              </div>
              <p className="text-xs text-primary-400">
                These fields come from your template. Fill them in for this campaign.
              </p>
              {templateVars.map((varName) => (
                <Input
                  key={varName}
                  label={varName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  placeholder={`Enter ${varName.replace(/_/g, ' ')}...`}
                  value={fieldValues[varName] ?? ''}
                  onChange={(e) => updateField(varName, e.target.value)}
                />
              ))}
            </div>
          )}

          {/* Show/hide raw HTML editor for manual editing */}
          {bodyHtml && (
            <button
              onClick={() => setShowHtmlEditor(!showHtmlEditor)}
              className="text-xs font-medium text-primary-400 hover:text-primary-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Edit3 size={12} />
              {showHtmlEditor ? 'Hide' : 'Edit'} raw HTML
            </button>
          )}

          {showHtmlEditor && (
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={14}
              className="w-full rounded-xl bg-white px-4 py-3 text-xs text-primary-800 font-mono leading-relaxed placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 outline-none resize-y"
            />
          )}

          {/* No template selected - show blank HTML area */}
          {!selectedTemplateId && !bodyHtml && (
            <div>
              <label className="block text-xs font-medium text-primary-400 mb-1.5">
                Email Body (HTML)
              </label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder={'Select a template above, or write raw HTML here...'}
                rows={10}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-primary-800 font-mono leading-relaxed placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 outline-none resize-y"
              />
            </div>
          )}

          {/* Preview with field values applied */}
          {bodyHtml && !showHtmlEditor && (
            <div>
              <label className="block text-xs font-medium text-primary-400 mb-1.5">Preview</label>
              <div
                className="prose prose-sm max-w-none text-primary-800 rounded-xl bg-white p-4 border border-primary-200 shadow-sm max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolvedHtml) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step: Audience */}
      {step === 'audience' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white shadow-sm border border-primary-100 p-4">
            <Toggle
              checked={targetAll}
              onChange={setTargetAll}
              label="Send to all subscribers"
              description="Everyone who has opted in to marketing emails"
            />
          </div>

          {!targetAll && (
            <>
              <div className="rounded-xl bg-white shadow-sm border border-primary-100 p-4">
                <h4 className="text-sm font-semibold text-primary-800 mb-2">Filter by tags</h4>
                <p className="text-xs text-primary-400 mb-3">
                  Recipients who have ANY of these tags will receive the email
                </p>
                {tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          'inline-flex items-center rounded-full text-xs font-medium px-3 py-1 transition-all duration-150 cursor-pointer',
                          selectedTagIds.includes(tag.id)
                            ? 'ring-2 ring-offset-1 shadow-sm'
                            : 'opacity-60 hover:opacity-100',
                        )}
                        style={{
                          backgroundColor: `${tag.colour}20`,
                          color: tag.colour,
                        }}
                      >
                        {selectedTagIds.includes(tag.id) && <CheckCircle2 size={12} className="mr-1" />}
                        {tag.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-primary-400 italic">No tags created yet</p>
                )}
              </div>

              <div className="rounded-xl bg-white shadow-sm border border-primary-100 p-4">
                <h4 className="text-sm font-semibold text-primary-800 mb-2">Filter by collectives</h4>
                <p className="text-xs text-primary-400 mb-3">
                  Members of selected collectives will receive the email
                </p>
                {collectives?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {collectives.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggleCollective(c.id)}
                        className={cn(
                          'inline-flex items-center rounded-full text-xs font-medium px-3 py-1 transition-all duration-150 cursor-pointer',
                          'bg-primary-100 text-primary-600',
                          selectedCollectiveIds.includes(c.id)
                            ? 'ring-2 ring-primary-500 ring-offset-1 shadow-sm'
                            : 'opacity-60 hover:opacity-100',
                        )}
                      >
                        {selectedCollectiveIds.includes(c.id) && (
                          <CheckCircle2 size={12} className="mr-1" />
                        )}
                        {c.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-primary-400 italic">No collectives found</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white shadow-sm border border-primary-100 overflow-hidden">
            <div className="bg-primary-50/50 px-4 py-3 border-b border-primary-100/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-400 mb-0.5">
                Subject
              </p>
              <p className="text-sm font-medium text-primary-800">{subject || 'No subject set'}</p>
            </div>
            <div className="px-4 py-3 border-b border-primary-100/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-400 mb-0.5">
                Audience
              </p>
              <p className="text-sm text-primary-600">
                {targetAll
                  ? 'All opted-in subscribers'
                  : `${selectedTagIds.length} tag(s), ${selectedCollectiveIds.length} collective(s)`}
              </p>
            </div>
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-400 mb-2">
                Email Preview
              </p>
              {resolvedHtml ? (
                <div
                  className="prose prose-sm max-w-none text-primary-800 rounded-lg bg-primary-50/30 p-4 border border-primary-100/50"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolvedHtml) }}
                />
              ) : (
                <p className="text-sm text-primary-400 italic">No content to preview</p>
              )}
            </div>
          </div>

          {/* Unfilled fields warning */}
          {templateVars.length > 0 && templateVars.some((v) => !fieldValues[v]) && (
            <div className="rounded-xl bg-warning-50 border border-warning-200 p-3">
              <p className="text-xs font-medium text-warning-700">
                Some template fields are still empty:{' '}
                {templateVars.filter((v) => !fieldValues[v]).map((v) => `{{${v}}}`).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSave(false)}
          loading={saving}
          icon={<Save size={14} />}
          className="flex-1"
        >
          Save Draft
        </Button>
        <Button
          variant="primary"
          onClick={() => handleSave(true)}
          loading={saving}
          icon={<Send size={14} />}
          className="flex-1"
          disabled={!name.trim() || !subject.trim() || !resolvedHtml.trim()}
        >
          Send Now
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Template Editor                                                    */
/* ================================================================== */

function extractTemplateVariables(html: string): string[] {
  const matches = html.match(/\{\{([a-z_]+)\}\}/gi) ?? []
  return [...new Set(
    matches
      .map((m) => m.replace(/[{}]/g, ''))
      .filter((v) => v !== 'name' && v !== 'subject'),
  )]
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template?: EmailTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [name, setName] = useState(template?.name ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(template?.body_html ?? '')
  const [bodyText, setBodyText] = useState(template?.body_text ?? '')
  const [category, setCategory] = useState(template?.category ?? 'general')
  const [saving, setSaving] = useState(false)

  // AI generation
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showHtml, setShowHtml] = useState(!!template?.body_html)
  const [activeView, setActiveView] = useState<'preview' | 'html'>('preview')

  // Extract editable variables from the template
  const templateVars = useMemo(() => extractTemplateVariables(bodyHtml), [bodyHtml])

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Describe the template you want')
      return
    }
    setAiGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: { prompt: aiPrompt, subject: subject || undefined, mode: 'template' },
      })
      if (error) throw error
      if (data?.html) {
        setBodyHtml(data.html)
        if (data.plainText) setBodyText(data.plainText)
        setShowHtml(true)
        setActiveView('preview')
        toast.success('Template generated! Review the preview and tweak as needed.')
      } else {
        toast.error(data?.error || 'No content generated')
      }
    } catch {
      toast.error('Generation failed. Make sure ANTHROPIC_API_KEY is set in your Edge Function secrets.')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error('Name and subject are required')
      return
    }
    if (!bodyHtml.trim()) {
      toast.error('Generate or write template HTML first')
      return
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      body_html: bodyHtml,
      body_text: bodyText,
      category,
      updated_at: new Date().toISOString(),
      created_by: user?.id,
    }

    // Optimistic: update cache and close immediately
    const tempId = template?.id ?? crypto.randomUUID()
    const optimistic: EmailTemplate = {
      id: tempId,
      ...payload,
      created_by: user?.id ?? null,
      created_at: template?.created_at ?? new Date().toISOString(),
    }
    queryClient.setQueryData<EmailTemplate[]>(['admin-email-templates'], (old) => {
      const filtered = (old ?? []).filter((t) => t.id !== tempId)
      return [optimistic, ...filtered]
    })
    onSaved()

    try {
      if (template) {
        const { error } = await supabase
          .from('email_templates' as any)
          .update(payload as any)
          .eq('id', template.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('email_templates' as any)
          .insert(payload as any)
        if (error) throw error
      }

      toast.success(template ? 'Template updated' : 'Template created')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save template')
    } finally {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] })
    }
  }

  const inputClasses = 'w-full rounded-xl bg-white px-4 py-3 text-sm text-primary-800 leading-relaxed placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 outline-none resize-y'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex items-center justify-center min-w-11 min-h-11 rounded-lg bg-primary-100/70 text-primary-500 hover:bg-primary-200/70 transition-colors cursor-pointer"
          aria-label="Back to templates"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-heading text-lg font-bold text-primary-800">
          {template ? 'Edit Template' : 'New Template'}
        </h2>
      </div>

      {/* Basics */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Template Name"
          placeholder="e.g. Event Announcement"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Dropdown
          options={[
            { value: 'general', label: 'General' },
            { value: 'newsletter', label: 'Newsletter' },
            { value: 'announcement', label: 'Announcement' },
            { value: 'event', label: 'Event' },
            { value: 'impact', label: 'Impact Report' },
            { value: 'welcome', label: 'Welcome' },
          ]}
          value={category}
          onChange={setCategory}
          placeholder="Category"
        />
      </div>

      <Input
        label="Default Subject Line"
        placeholder="e.g. {{event_title}} - this Saturday!"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      {/* AI Generator */}
      <div className="rounded-xl bg-gradient-to-br from-primary-50 via-white to-secondary-50/30 border border-primary-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary-500" />
          <h4 className="text-sm font-semibold text-primary-800">
            {bodyHtml ? 'Regenerate with AI' : 'Generate Template with AI'}
          </h4>
        </div>
        <p className="text-xs text-primary-400 leading-relaxed">
          Describe the email template you need. AI knows Co-Exist&apos;s brand, colours, logos, links and will create editable {'{{fields}}'} you can fill in each time you send.
        </p>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder={
            'e.g. An event announcement template with a hero image, event title, date, location, a short description, and a register button. Include a section for impact stats from the last event.'
          }
          rows={3}
          className={inputClasses}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleAiGenerate}
          loading={aiGenerating}
          icon={aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          disabled={!aiPrompt.trim()}
        >
          {aiGenerating ? 'Generating...' : bodyHtml ? 'Regenerate' : 'Generate Template'}
        </Button>
      </div>

      {/* Template content area */}
      {showHtml && bodyHtml && (
        <>
          {/* Editable fields extracted from template */}
          {templateVars.length > 0 && (
            <div className="rounded-xl bg-white border border-primary-200 shadow-sm p-4">
              <h4 className="text-sm font-semibold text-primary-800 mb-1">
                Editable Fields
              </h4>
              <p className="text-xs text-primary-400 mb-3">
                These {'{{fields}}'} will appear as form inputs when creating a campaign from this template.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-600">
                  {'{{name}}'} <span className="ml-1 text-primary-400 font-normal">auto-filled</span>
                </span>
                {templateVars.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-secondary-50 text-secondary-700 border border-secondary-200"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preview / HTML toggle */}
          <div className="flex gap-1 bg-white rounded-xl p-1">
            <button
              onClick={() => setActiveView('preview')}
              className={cn(
                'flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer',
                activeView === 'preview' ? 'bg-primary-50 shadow-sm text-primary-800' : 'text-primary-400 hover:text-primary-600',
              )}
            >
              <Eye size={14} /> Preview
            </button>
            <button
              onClick={() => setActiveView('html')}
              className={cn(
                'flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer',
                activeView === 'html' ? 'bg-primary-50 shadow-sm text-primary-800' : 'text-primary-400 hover:text-primary-600',
              )}
            >
              <Edit3 size={14} /> Edit HTML
            </button>
          </div>

          {activeView === 'preview' ? (
            <div
              className="prose prose-sm max-w-none text-primary-800 rounded-xl bg-white p-4 border border-primary-200 shadow-sm max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
            />
          ) : (
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={20}
              className={cn(inputClasses, 'font-mono text-xs')}
            />
          )}

          {/* Plain text */}
          <div>
            <label className="block text-xs font-medium text-primary-400 mb-1.5">Plain Text Fallback</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Auto-generated with the template"
              rows={4}
              className={inputClasses}
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          icon={<Save size={14} />}
          className="flex-1"
          disabled={!name.trim() || !subject.trim() || !bodyHtml.trim()}
        >
          {template ? 'Update Template' : 'Save Template'}
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tag Manager Sheet                                                  */
/* ================================================================== */

function TagManagerSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [colour, setColour] = useState('#10B981')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const presetColours = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ]

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Tag name is required')
      return
    }
    setSaving(true)

    // Optimistic: add tag immediately
    const tempId = crypto.randomUUID()
    const optimisticTag: EmailTag = {
      id: tempId,
      name: name.trim(),
      colour,
      description: description.trim() || null,
      created_at: new Date().toISOString(),
    }
    queryClient.setQueryData<EmailTag[]>(['admin-email-tags'], (old) =>
      [...(old ?? []), optimisticTag].sort((a, b) => a.name.localeCompare(b.name)),
    )
    const savedName = name
    setName('')
    setDescription('')
    onClose()

    try {
      const { error } = await supabase
        .from('email_tags' as any)
        .insert({
          name: savedName.trim(),
          colour,
          description: optimisticTag.description,
        } as any)
      if (error) throw error
      toast.success(`Tag "${savedName}" created`)
    } catch (err: any) {
      // Rollback
      queryClient.setQueryData<EmailTag[]>(['admin-email-tags'], (old) =>
        (old ?? []).filter((t) => t.id !== tempId),
      )
      toast.error(err?.message ?? 'Failed to create tag')
    } finally {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['admin-email-tags'] })
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.55]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">Create Tag</h2>
      <div className="space-y-4">
        <Input
          label="Tag Name"
          placeholder="e.g. VIP, Active, Byron Bay"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="block text-xs font-medium text-primary-400 mb-2">Colour</label>
          <div className="flex flex-wrap gap-2">
            {presetColours.map((c) => (
              <button
                key={c}
                onClick={() => setColour(c)}
                className={cn(
                  'w-8 h-8 rounded-full transition-all duration-150 cursor-pointer',
                  colour === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105',
                )}
                style={{ backgroundColor: c, ['--tw-ring-color' as any]: c }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>
        <Input
          label="Description (optional)"
          placeholder="What this tag is used for"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button variant="primary" fullWidth loading={saving} onClick={handleCreate} icon={<Tag size={14} />}>
          Create Tag
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ================================================================== */
/*  Assign Tags Sheet                                                  */
/* ================================================================== */

function AssignTagsSheet({
  open,
  onClose,
  profileId,
  profileName,
  currentTags,
}: {
  open: boolean
  onClose: () => void
  profileId: string
  profileName: string
  currentTags: EmailTag[]
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: allTags } = useTags()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(currentTags.map((t) => t.id)),
  )
  const [saving, setSaving] = useState(false)

  const toggle = (tagId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)

    // Optimistic: update subscriber tags in cache immediately
    const prevSubscribers = queryClient.getQueryData(['admin-email-subscribers', '', null])
    const newTags = (allTags ?? []).filter((t) => selectedIds.has(t.id))
    queryClient.setQueryData(['admin-email-subscribers', '', null], (old: any[]) =>
      (old ?? []).map((sub: any) =>
        sub.id === profileId ? { ...sub, tags: newTags } : sub,
      ),
    )
    onClose()

    try {
      await supabase.from('profile_tags' as any).delete().eq('profile_id', profileId)

      if (selectedIds.size > 0) {
        const rows = Array.from(selectedIds).map((tag_id) => ({
          profile_id: profileId,
          tag_id,
        }))
        const { error } = await supabase.from('profile_tags' as any).insert(rows as any)
        if (error) throw error
      }

      toast.success(`Tags updated for ${profileName}`)
    } catch (err: any) {
      // Rollback
      if (prevSubscribers) queryClient.setQueryData(['admin-email-subscribers', '', null], prevSubscribers)
      toast.error(err?.message ?? 'Failed to update tags')
    } finally {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['admin-email-subscribers'] })
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.5]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-1">Manage Tags</h2>
      <p className="text-sm text-primary-400 mb-4">{profileName}</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {allTags?.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggle(tag.id)}
            className={cn(
              'inline-flex items-center rounded-full text-xs font-medium px-3 py-1.5 transition-all duration-150 cursor-pointer',
              selectedIds.has(tag.id)
                ? 'ring-2 ring-offset-1 shadow-sm'
                : 'opacity-50 hover:opacity-100',
            )}
            style={{
              backgroundColor: `${tag.colour}20`,
              color: tag.colour,
            }}
          >
            {selectedIds.has(tag.id) && <CheckCircle2 size={12} className="mr-1" />}
            {tag.name}
          </button>
        )) ?? <p className="text-sm text-primary-400">No tags available</p>}
      </div>
      <Button variant="primary" fullWidth loading={saving} onClick={handleSave}>
        Save Tags
      </Button>
    </BottomSheet>
  )
}

/* ================================================================== */
/*  Campaign Detail Sheet                                              */
/* ================================================================== */

function CampaignDetailSheet({
  open,
  onClose,
  campaign,
}: {
  open: boolean
  onClose: () => void
  campaign: EmailCampaign
}) {
  const rate = (n: number) =>
    campaign.total_recipients > 0
      ? `${((n / campaign.total_recipients) * 100).toFixed(1)}%`
      : '0%'

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.75]}>
      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary-800">{campaign.name}</h2>
          <p className="text-sm text-primary-400 mt-0.5">{campaign.subject}</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={campaign.status} />
          {campaign.sent_at && (
            <span className="text-xs text-primary-400">Sent {formatDateTime(campaign.sent_at)}</span>
          )}
        </div>

        {campaign.status === 'sent' && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Recipients', value: campaign.total_recipients, icon: <Users size={12} /> },
              { label: 'Delivered', value: `${campaign.total_delivered} (${rate(campaign.total_delivered)})`, icon: <CheckCircle2 size={12} /> },
              { label: 'Opened', value: `${campaign.total_opened} (${rate(campaign.total_opened)})`, icon: <Eye size={12} /> },
              { label: 'Clicked', value: `${campaign.total_clicked} (${rate(campaign.total_clicked)})`, icon: <MousePointerClick size={12} /> },
              { label: 'Bounced', value: `${campaign.total_bounced} (${rate(campaign.total_bounced)})`, icon: <XCircle size={12} /> },
              { label: 'Unsub\'d', value: `${campaign.total_unsubscribed} (${rate(campaign.total_unsubscribed)})`, icon: <AlertTriangle size={12} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl bg-primary-50/50 p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-primary-400">{icon}</span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">{label}</p>
                </div>
                <p className="text-sm font-bold text-primary-800 tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}

        {campaign.body_html && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-400 mb-2">
              Content Preview
            </p>
            <div
              className="prose prose-sm max-w-none text-primary-800 rounded-lg bg-primary-50/30 p-4 border border-primary-100/50 max-h-60 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(campaign.body_html) }}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

/* ================================================================== */
/*  Campaigns Tab                                                      */
/* ================================================================== */

function CampaignsTab() {
  const { data: campaigns, isLoading } = useCampaigns()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<EmailCampaign | null>(null)
  const [viewing, setViewing] = useState<EmailCampaign | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!campaigns) return []
    if (statusFilter === 'all') return campaigns
    return campaigns.filter((c) => c.status === statusFilter)
  }, [campaigns, statusFilter])

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns' as any).delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-email-campaigns'] })
      const prev = queryClient.getQueryData<EmailCampaign[]>(['admin-email-campaigns'])
      queryClient.setQueryData<EmailCampaign[]>(['admin-email-campaigns'], (old) =>
        (old ?? []).filter((c) => c.id !== id),
      )
      setDeletingId(null)
      return { prev }
    },
    onSuccess: () => toast.success('Campaign deleted'),
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-email-campaigns'], ctx.prev)
      toast.error('Failed to delete campaign')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-email-campaigns'] }),
  })

  const duplicateCampaign = async (c: EmailCampaign) => {
    // Optimistic: add placeholder immediately
    const tempId = crypto.randomUUID()
    const optimistic: EmailCampaign = {
      ...c,
      id: tempId,
      name: `${c.name} (copy)`,
      status: 'draft',
      total_recipients: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      total_bounced: 0,
      total_unsubscribed: 0,
      sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    queryClient.setQueryData<EmailCampaign[]>(['admin-email-campaigns'], (old) =>
      [optimistic, ...(old ?? [])],
    )
    toast.success('Campaign duplicated')

    const { error } = await supabase.from('email_campaigns' as any).insert({
      name: `${c.name} (copy)`,
      subject: c.subject,
      body_html: c.body_html,
      body_text: c.body_text,
      template_id: c.template_id,
      target_all: c.target_all,
      target_tag_ids: c.target_tag_ids,
      target_collective_ids: c.target_collective_ids,
      status: 'draft',
    } as any)
    if (error) {
      // Rollback
      queryClient.setQueryData<EmailCampaign[]>(['admin-email-campaigns'], (old) =>
        (old ?? []).filter((x) => x.id !== tempId),
      )
      toast.error('Failed to duplicate')
    }
    queryClient.invalidateQueries({ queryKey: ['admin-email-campaigns'] })
  }

  if (composing || editing) {
    return (
      <CampaignComposer
        campaign={editing}
        onClose={() => { setComposing(false); setEditing(null) }}
        onSaved={() => { setComposing(false); setEditing(null) }}
      />
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setComposing(true)} className="shrink-0 whitespace-nowrap">
          New Campaign
        </Button>
        <div className="w-36 shrink-0">
          <Dropdown
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'draft', label: 'Drafts' },
              { value: 'sent', label: 'Sent' },
              { value: 'sending', label: 'Sending' },
              { value: 'scheduled', label: 'Scheduled' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter..."
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton variant="list-item" count={5} />
      ) : !filtered?.length ? (
        <EmptyState
          illustration="empty"
          title="No campaigns yet"
          description="Create your first email campaign to reach your subscribers"
          action={{ label: 'Create Campaign', onClick: () => setComposing(true) }}
        />
      ) : (
        <StaggeredList className="space-y-2">
          {filtered.map((campaign) => (
            <StaggeredItem
              key={campaign.id}
              className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3" onClick={() => setViewing(campaign)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-primary-800 truncate">{campaign.name}</p>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="text-xs text-primary-400 truncate">{campaign.subject}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-primary-400">
                    {campaign.status === 'sent' && (
                      <>
                        <span className="flex items-center gap-1"><Users size={11} />{campaign.total_recipients}</span>
                        <span className="flex items-center gap-1"><Eye size={11} />{campaign.total_opened}</span>
                        <span className="flex items-center gap-1"><MousePointerClick size={11} />{campaign.total_clicked}</span>
                      </>
                    )}
                    <span>{formatDate(campaign.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {campaign.status === 'draft' && (
                    <button onClick={() => setEditing(campaign)} className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer" aria-label="Edit">
                      <Edit3 size={14} />
                    </button>
                  )}
                  <button onClick={() => duplicateCampaign(campaign)} className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer" aria-label="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => setDeletingId(campaign.id)} className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-error-100 hover:text-error-600 transition-colors cursor-pointer" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      {viewing && (
        <CampaignDetailSheet open={!!viewing} onClose={() => setViewing(null)} campaign={viewing} />
      )}

      <ConfirmationSheet
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteCampaign.mutate(deletingId)}
        title="Delete Campaign"
        description="This campaign and all its data will be permanently deleted."
        confirmLabel="Delete"
      />
    </>
  )
}

/* ================================================================== */
/*  Templates Tab                                                      */
/* ================================================================== */

function TemplatesTab() {
  const { data: templates, isLoading } = useTemplates()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editing, setEditing] = useState<EmailTemplate | null | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_templates' as any).delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-email-templates'] })
      const prev = queryClient.getQueryData<EmailTemplate[]>(['admin-email-templates'])
      queryClient.setQueryData<EmailTemplate[]>(['admin-email-templates'], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      )
      setDeletingId(null)
      return { prev }
    },
    onSuccess: () => toast.success('Template deleted'),
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-email-templates'], ctx.prev)
      toast.error('Failed to delete template')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] }),
  })

  if (editing !== undefined) {
    return (
      <TemplateEditor
        template={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => setEditing(undefined)}
      />
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing(null)}>
          New Template
        </Button>
      </div>

      {isLoading ? (
        <Skeleton variant="list-item" count={4} />
      ) : !templates?.length ? (
        <EmptyState
          illustration="empty"
          title="No templates"
          description="Save reusable email templates to speed up campaign creation"
          action={{ label: 'Create Template', onClick: () => setEditing(null) }}
        />
      ) : (
        <StaggeredList className="grid gap-3 sm:grid-cols-2">
          {templates.map((tpl) => (
            <StaggeredItem
              key={tpl.id}
              className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between gap-2" onClick={() => setEditing(tpl)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-800 truncate">{tpl.name}</p>
                  <p className="text-xs text-primary-400 truncate mt-0.5">{tpl.subject}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-500 capitalize">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] text-primary-400">Updated {formatDate(tpl.updated_at)}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditing(tpl)} className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer" aria-label="Edit">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => setDeletingId(tpl.id)} className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-error-100 hover:text-error-600 transition-colors cursor-pointer" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      <ConfirmationSheet
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Template"
        description="This template will be permanently deleted. Campaigns using it will not be affected."
        confirmLabel="Delete"
      />
    </>
  )
}

/* ================================================================== */
/*  Subscribers Tab                                                    */
/* ================================================================== */

function SubscribersTab() {
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: tags } = useTags()
  const { data: subscribers, isLoading } = useSubscribers(search, tagFilter)
  const [syncing, setSyncing] = useState(false)

  const [taggingProfile, setTaggingProfile] = useState<{
    id: string
    name: string
    tags: EmailTag[]
  } | null>(null)

  const handleSyncTags = async () => {
    setSyncing(true)
    try {
      const { error } = await supabase.rpc('sync_auto_tags' as any)
      if (error) throw error
      toast.success('Auto-tags synced from interests, collectives, tiers, and activity')
      queryClient.invalidateQueries({ queryKey: ['admin-email-subscribers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-email-tags'] })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to sync tags')
    } finally {
      setSyncing(false)
    }
  }

  const optedIn = useMemo(
    () => subscribers?.filter((s: any) => s.marketing_opt_in !== false) ?? [],
    [subscribers],
  )
  const optedOut = useMemo(
    () => subscribers?.filter((s: any) => s.marketing_opt_in === false) ?? [],
    [subscribers],
  )

  return (
    <>
      {/* Auto-sync bar */}
      <div className="flex items-center justify-between gap-3 mb-4 rounded-xl bg-gradient-to-r from-primary-50 to-secondary-50/30 border border-primary-200 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary-700">Auto-tagging</p>
          <p className="text-[11px] text-primary-400">
            Syncs tags from onboarding interests, collectives, tiers, attendance, and location
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSyncTags}
          loading={syncing}
          icon={<RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />}
        >
          Sync Now
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscribers..."
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-white text-sm text-primary-800 placeholder:text-primary-400 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        {tags && tags.length > 0 && (
          <Dropdown
            options={[
              { value: '', label: 'All Tags' },
              ...tags.map((t) => ({ value: t.id, label: t.name })),
            ]}
            value={tagFilter ?? ''}
            onChange={(v) => setTagFilter(v || null)}
            placeholder="Filter by tag"
          />
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-xl bg-success-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-success-600">Opted In</p>
          <p className="text-lg font-bold text-success-700 tabular-nums">{optedIn.length}</p>
        </div>
        <div className="flex-1 rounded-xl bg-primary-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">Opted Out</p>
          <p className="text-lg font-bold text-primary-600 tabular-nums">{optedOut.length}</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton variant="list-item" count={8} />
      ) : !subscribers?.length ? (
        <EmptyState
          illustration="empty"
          title="No subscribers found"
          description={search ? 'Try a different search term' : 'Users who sign up will appear here'}
        />
      ) : (
        <StaggeredList className="space-y-1">
          {subscribers.map((sub: any) => (
            <StaggeredItem key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 shrink-0">
                {sub.avatar_url ? (
                  <img src={sub.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <Users size={16} className="text-primary-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-800 truncate">
                  {sub.display_name || 'Anonymous'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {sub.location && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary-400">
                      <MapPin size={9} />{sub.location}
                    </span>
                  )}
                  {sub.membership_level && sub.membership_level !== 'Seedling' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success-50 text-success-600">
                      {sub.membership_level}
                    </span>
                  )}
                  {sub.marketing_opt_in === false && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-500">
                      Opted out
                    </span>
                  )}
                </div>
                {sub.tags?.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {sub.tags.map((tag: EmailTag) => (
                      <TagPill key={tag.id} tag={tag} size="xs" />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setTaggingProfile({
                  id: sub.id,
                  name: sub.display_name || 'User',
                  tags: sub.tags ?? [],
                })}
                className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer shrink-0"
                aria-label="Manage tags"
              >
                <Tag size={14} />
              </button>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      {taggingProfile && (
        <AssignTagsSheet
          open={!!taggingProfile}
          onClose={() => setTaggingProfile(null)}
          profileId={taggingProfile.id}
          profileName={taggingProfile.name}
          currentTags={taggingProfile.tags}
        />
      )}
    </>
  )
}

/* ================================================================== */
/*  Tags Tab                                                           */
/* ================================================================== */

function TagsTab() {
  const { data: tags, isLoading } = useTags()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('profile_tags' as any).delete().eq('tag_id', id)
      const { error } = await supabase.from('email_tags' as any).delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-email-tags'] })
      const prev = queryClient.getQueryData<EmailTag[]>(['admin-email-tags'])
      queryClient.setQueryData<EmailTag[]>(['admin-email-tags'], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      )
      setDeletingId(null)
      return { prev }
    },
    onSuccess: () => toast.success('Tag deleted'),
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-email-tags'], ctx.prev)
      toast.error('Failed to delete tag')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-tags'] })
      queryClient.invalidateQueries({ queryKey: ['admin-email-subscribers'] })
    },
  })

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          New Tag
        </Button>
      </div>

      {isLoading ? (
        <Skeleton variant="list-item" count={4} />
      ) : !tags?.length ? (
        <EmptyState
          illustration="empty"
          title="No tags"
          description="Create tags to organise and segment your subscribers for targeted campaigns"
          action={{ label: 'Create Tag', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <StaggeredList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <StaggeredItem key={tag.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.colour }} />
                  <p className="text-sm font-semibold text-primary-800">{tag.name}</p>
                </div>
                {tag.description && <p className="text-xs text-primary-400 mt-0.5">{tag.description}</p>}
                <p className="text-[10px] text-primary-400 mt-1.5">Created {formatDate(tag.created_at)}</p>
              </div>
              <button
                onClick={() => setDeletingId(tag.id)}
                className="flex items-center justify-center min-w-11 min-h-11 rounded-lg text-primary-400 hover:bg-error-100 hover:text-error-600 transition-colors cursor-pointer shrink-0"
                aria-label="Delete tag"
              >
                <Trash2 size={14} />
              </button>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      <TagManagerSheet open={showCreate} onClose={() => setShowCreate(false)} />

      <ConfirmationSheet
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Tag"
        description="This tag will be removed from all subscribers. Existing campaigns won't be affected."
        confirmLabel="Delete"
      />
    </>
  )
}

/* ================================================================== */
/*  Delivery Tab (Bounces + Complaints)                                */
/* ================================================================== */

function DeliveryTab() {
  const [subTab, setSubTab] = useState<'bounces' | 'complaints'>('bounces')
  const { data: bounces, isLoading: bouncesLoading } = useEmailBounces()
  const { data: complaints, isLoading: complaintsLoading } = useEmailComplaints()

  return (
    <>
      <div className="flex gap-1 bg-white rounded-xl p-1 mb-4">
        <button
          onClick={() => setSubTab('bounces')}
          className={cn(
            'flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer',
            subTab === 'bounces' ? 'bg-primary-50 shadow-sm text-primary-800' : 'text-primary-400 hover:text-primary-600',
          )}
        >
          <XCircle size={14} /> Bounces
        </button>
        <button
          onClick={() => setSubTab('complaints')}
          className={cn(
            'flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer',
            subTab === 'complaints' ? 'bg-primary-50 shadow-sm text-primary-800' : 'text-primary-400 hover:text-primary-600',
          )}
        >
          <AlertTriangle size={14} /> Complaints
        </button>
      </div>

      {subTab === 'bounces' && (
        <>
          {bouncesLoading ? (
            <Skeleton variant="list-item" count={5} />
          ) : !bounces?.length ? (
            <EmptyState illustration="empty" title="No bounces" description="Email bounces from SendGrid will appear here" />
          ) : (
            <StaggeredList className="space-y-1">
              {bounces.map((event: any) => (
                <StaggeredItem key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-error-100 shrink-0">
                    <XCircle size={16} className="text-error-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">{event.email}</p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      {event.reason ?? 'Hard bounce'} &middot; {formatDate(event.created_at)}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-error-100 text-error-700 shrink-0">Suppressed</span>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      )}

      {subTab === 'complaints' && (
        <>
          {complaintsLoading ? (
            <Skeleton variant="list-item" count={5} />
          ) : !complaints?.length ? (
            <EmptyState illustration="empty" title="No complaints" description="Spam complaints from SendGrid will appear here" />
          ) : (
            <StaggeredList className="space-y-1">
              {complaints.map((event: any) => (
                <StaggeredItem key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning-100 shrink-0">
                    <AlertTriangle size={16} className="text-warning-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">{event.email}</p>
                    <p className="text-xs text-primary-400 mt-0.5">Spam complaint &middot; {formatDate(event.created_at)}</p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning-100 text-warning-700 shrink-0">Suppressed</span>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      )}
    </>
  )
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function AdminEmailPage() {
  const [activeTab, setActiveTab] = useState('campaigns')
  const { data: stats, isLoading: statsLoading } = useEmailMarketingStats()
  const shouldReduceMotion = useReducedMotion()

  const heroStats = useMemo(
    () =>
      statsLoading ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton variant="stat-card" />
          <Skeleton variant="stat-card" />
          <Skeleton variant="stat-card" />
          <Skeleton variant="stat-card" />
        </div>
      ) : stats ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <StatCard label="Subscribers" value={stats.subscribers} icon={<Users size={12} />} />
          <StatCard label="Campaigns Sent" value={stats.campaignsSent} icon={<Send size={12} />} />
          <StatCard label="Bounces" value={stats.bounces} icon={<XCircle size={12} />} />
          <StatCard label="Suppressed" value={stats.suppressed} icon={<AlertTriangle size={12} />} />
        </div>
      ) : null,
    [stats, statsLoading],
  )

  useAdminHeader('Email Marketing', { heroContent: heroStats })

  return (
    <div>
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
      >
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
      </motion.div>

      <motion.div
        key={activeTab}
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.25 }}
      >
        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'subscribers' && <SubscribersTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'delivery' && <DeliveryTab />}
      </motion.div>
    </div>
  )
}

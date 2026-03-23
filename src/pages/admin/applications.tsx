import { useState, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Settings,
  Plus,
  Trash2,
  Bell,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Toggle } from '@/components/toggle'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Application {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  date_of_birth: string | null
  phone: string | null
  country: string
  address_line1: string
  address_line2: string | null
  suburb: string
  state: string
  postcode: string
  why_volunteer: string
  roles: string[]
  time_commitment: string
  attended_events: string | null
  skills: string[]
  resume_url: string | null
  additional_info: string | null
  how_heard: string
  news_opt_in: boolean
  user_id: string | null
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
}

interface NotificationRecipient {
  id: string
  event_type: string
  user_id: string
  notify_email: boolean
  notify_push: boolean
  profile?: { display_name: string; email?: string }
}

/* ------------------------------------------------------------------ */
/*  Label maps                                                         */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<string, string> = {
  social_media: 'Social Media & Content',
  collective_leader: 'Collective Leader',
  assistant_leader: 'Assistant Leader',
  other: 'Other',
}

const SKILL_LABELS: Record<string, string> = {
  public_speaking: 'Public Speaking',
  event_organisation: 'Event Organisation',
  event_facilitation: 'Event Facilitation',
  social_media_content: 'Social Media Content Creation',
}

const HOW_HEARD_LABELS: Record<string, string> = {
  social_media: 'Social Media',
  friend: 'Friend or Family',
  event: 'At an Event',
  school_uni: 'School or University',
  google: 'Google Search',
  news: 'News or Media',
  other: 'Other',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50' },
  reviewed: { label: 'Reviewed', color: 'text-blue-700', bg: 'bg-blue-50' },
  accepted: { label: 'Accepted', color: 'text-green-700', bg: 'bg-green-50' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' },
}

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */

function useApplications() {
  return useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from as any)('collective_applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Application[]
    },
    staleTime: 60 * 1000,
  })
}

function useNotificationRecipients() {
  return useQuery({
    queryKey: ['admin-application-recipients'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from as any)('notification_recipients')
        .select('*, profile:profiles!notification_recipients_user_id_fkey(display_name)')
        .eq('event_type', 'collective_application')
      if (error) throw error
      return (data ?? []) as NotificationRecipient[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useStaffUsers() {
  return useQuery({
    queryKey: ['admin-staff-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('role', ['national_staff', 'super_admin'])
        .order('display_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const tabs = [
  { id: 'applications', label: 'Applications', icon: <Users size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Application Detail Card                                            */
/* ------------------------------------------------------------------ */

function ApplicationCard({
  app,
  onUpdateStatus,
}: {
  app: Application
  onUpdateStatus: (id: string, status: string, notes?: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(app.notes ?? '')
  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending

  return (
    <div className="rounded-2xl bg-surface-0 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3.5 px-4 py-3.5 text-left',
          'transition-colors duration-150 cursor-pointer',
          'hover:bg-surface-2',
        )}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-50 text-primary-600 shrink-0">
          <Users size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-primary-900 truncate">
            {app.first_name} {app.last_name}
          </p>
          <p className="text-[12px] text-primary-400 mt-0.5">
            {app.suburb}, {app.state} &middot; {new Date(app.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', statusCfg.bg, statusCfg.color)}>
          {statusCfg.label}
        </span>
        {expanded ? <ChevronUp size={16} className="text-primary-400 shrink-0" /> : <ChevronDown size={16} className="text-primary-400 shrink-0" />}
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-primary-100/20 pt-4">
              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow icon={<Mail size={14} />} label="Email" value={app.email} />
                {app.phone && <DetailRow icon={<Phone size={14} />} label="Phone" value={app.phone} />}
                {app.date_of_birth && <DetailRow icon={<Calendar size={14} />} label="Date of Birth" value={app.date_of_birth} />}
                <DetailRow icon={<MapPin size={14} />} label="Location" value={`${app.address_line1}${app.address_line2 ? `, ${app.address_line2}` : ''}, ${app.suburb} ${app.state} ${app.postcode}`} />
                <DetailRow icon={<Clock size={14} />} label="Time Commitment" value={app.time_commitment} />
                {app.attended_events && <DetailRow icon={<Users size={14} />} label="Attended Events" value={app.attended_events} />}
                <DetailRow icon={<Users size={14} />} label="How Heard" value={HOW_HEARD_LABELS[app.how_heard] ?? app.how_heard} />
              </div>

              {/* Roles */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-400 mb-1.5">Interested Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {app.roles.map(r => (
                    <span key={r} className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-700">
                      {ROLE_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Why volunteer */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-400 mb-1.5">Why They Want to Volunteer</p>
                <p className="text-[14px] text-primary-800 leading-relaxed bg-primary-50/50 rounded-xl p-3">
                  {app.why_volunteer}
                </p>
              </div>

              {/* Skills */}
              {app.skills.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary-400 mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {app.skills.map(s => (
                      <span key={s} className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-sprout-100 text-sprout-700">
                        {SKILL_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              {app.resume_url && (
                <a
                  href={app.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <FileText size={14} />
                  View Resume
                </a>
              )}

              {/* Additional info */}
              {app.additional_info && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary-400 mb-1.5">Additional Notes from Applicant</p>
                  <p className="text-[14px] text-primary-700 leading-relaxed">{app.additional_info}</p>
                </div>
              )}

              {/* Staff notes */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-400 mb-1.5">Staff Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add internal notes..."
                  className={cn(
                    'w-full rounded-xl border border-primary-200 bg-white',
                    'px-3.5 py-2.5 text-[14px] text-primary-900',
                    'placeholder:text-primary-300',
                    'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
                    'resize-none',
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {app.status !== 'accepted' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 size={14} />}
                    onClick={() => onUpdateStatus(app.id, 'accepted', notes)}
                  >
                    Accept
                  </Button>
                )}
                {app.status !== 'rejected' && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={14} />}
                    onClick={() => onUpdateStatus(app.id, 'rejected', notes)}
                  >
                    Reject
                  </Button>
                )}
                {app.status === 'pending' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => onUpdateStatus(app.id, 'reviewed', notes)}
                  >
                    Mark Reviewed
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-primary-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-primary-400 leading-tight">{label}</p>
        <p className="text-[14px] text-primary-800 break-words">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Notification Settings Tab                                          */
/* ------------------------------------------------------------------ */

function NotificationSettingsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: recipients, isLoading } = useNotificationRecipients()
  const { data: staffUsers } = useStaffUsers()
  const [addingUserId, setAddingUserId] = useState('')

  const addRecipient = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase
        .from as any)('notification_recipients')
        .insert({ event_type: 'collective_application', user_id: userId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-recipients'] })
      setAddingUserId('')
      toast.success('Staff member added to notifications')
    },
    onError: () => toast.error('Failed to add recipient'),
  })

  const removeRecipient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from as any)('notification_recipients')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-recipients'] })
      toast.success('Recipient removed')
    },
    onError: () => toast.error('Failed to remove'),
  })

  const toggleNotifType = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'notify_email' | 'notify_push'; value: boolean }) => {
      const { error } = await (supabase
        .from as any)('notification_recipients')
        .update({ [field]: value })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-application-recipients'] })
    },
  })

  const availableStaff = (staffUsers ?? []).filter(
    s => !(recipients ?? []).some(r => r.user_id === s.id)
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-surface-0 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="font-heading text-[15px] font-semibold text-primary-900">
            Who gets notified?
          </h3>
          <p className="text-[13px] text-primary-400 mt-0.5">
            Configure which staff members receive email and push notifications when a new collective application is submitted.
          </p>
        </div>

        {/* Current recipients */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : (recipients ?? []).length === 0 ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
            No staff members configured. Add someone below to receive notifications.
          </div>
        ) : (
          <div className="space-y-2">
            {(recipients ?? []).map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-primary-50/50 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-primary-800 truncate">
                    {(r as any).profile?.display_name ?? r.user_id.slice(0, 8)}
                  </p>
                </div>
                <Toggle
                  label="Email"
                  size="sm"
                  checked={r.notify_email}
                  onChange={(v) => toggleNotifType.mutate({ id: r.id, field: 'notify_email', value: v })}
                />
                <Toggle
                  label="Push"
                  size="sm"
                  checked={r.notify_push}
                  onChange={(v) => toggleNotifType.mutate({ id: r.id, field: 'notify_push', value: v })}
                />
                <button
                  onClick={() => removeRecipient.mutate(r.id)}
                  className="text-primary-400 hover:text-error transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add recipient */}
        {availableStaff.length > 0 && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Dropdown
                options={availableStaff.map(s => ({ value: s.id, label: s.display_name ?? s.id }))}
                value={addingUserId}
                onChange={setAddingUserId}
                placeholder="Select staff member..."
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              disabled={!addingUserId}
              onClick={() => addRecipient.mutate(addingUserId)}
              loading={addRecipient.isPending}
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Status filter                                                      */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminApplicationsPage() {
  const shouldReduceMotion = useReducedMotion()
  const { stagger, fadeUp } = adminVariants(shouldReduceMotion ?? false)
  const [activeTab, setActiveTab] = useState('applications')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: applications, isLoading } = useApplications()
  const showLoading = useDelayedLoading(isLoading)

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await (supabase
        .from as any)('collective_applications')
        .update({
          status,
          notes: notes || null,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
      await logAudit({
        action: `application_${status}`,
        target_type: 'collective_application',
        target_id: id,
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      toast.success(`Application ${vars.status}`)
    },
    onError: () => toast.error('Failed to update application'),
  })

  const handleUpdateStatus = (id: string, status: string, notes?: string) => {
    updateStatus.mutate({ id, status, notes })
  }

  // Stats
  const stats = useMemo(() => {
    const apps = applications ?? []
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      accepted: apps.filter(a => a.status === 'accepted').length,
    }
  }, [applications])

  // Filtered list
  const filtered = useMemo(() => {
    let list = applications ?? []
    if (statusFilter !== 'all') {
      list = list.filter(a => a.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.suburb.toLowerCase().includes(q)
      )
    }
    return list
  }, [applications, statusFilter, searchQuery])

  // Hero stats
  const heroStats = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[20px] font-bold text-white">{stats.total}</p>
        <p className="text-[11px] text-white/60 font-medium">Total</p>
      </div>
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[20px] font-bold text-amber-300">{stats.pending}</p>
        <p className="text-[11px] text-white/60 font-medium">Pending</p>
      </div>
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[20px] font-bold text-green-300">{stats.accepted}</p>
        <p className="text-[11px] text-white/60 font-medium">Accepted</p>
      </div>
    </div>
  ), [stats])

  useAdminHeader('Applications', {
    subtitle: 'Collective leadership applications',
    heroContent: heroStats,
  })

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </motion.div>

      {activeTab === 'applications' ? (
        <>
          {/* Filters */}
          <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="search"
                placeholder="Search by name, email, suburb..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dropdown
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Status"
              triggerClassName="!w-auto min-w-[140px]"
            />
          </motion.div>

          {/* List */}
          {showLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration={<Users size={40} />}
              title="No applications"
              description={statusFilter !== 'all' ? 'No applications match the current filter.' : 'Applications will appear here when people apply to lead a collective.'}
            />
          ) : (
            <StaggeredList className="space-y-2">
              {filtered.map(app => (
                <StaggeredItem key={app.id}>
                  <ApplicationCard app={app} onUpdateStatus={handleUpdateStatus} />
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      ) : (
        <motion.div variants={fadeUp}>
          <NotificationSettingsTab />
        </motion.div>
      )}
    </motion.div>
  )
}

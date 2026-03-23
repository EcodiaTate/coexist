import { useState, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
    ArrowLeft,
    Users,
    CalendarDays,
    MapPin,
    TreePine, Clock,
    Crown,
    Shield,
    ShieldCheck,
    ShieldAlert,
    UserMinus,
    UserPlus,
    RotateCcw,
    Search,
    Download,
    Archive,
    AlertTriangle,
    ExternalLink,
    Eye,
    Leaf,
    TrendingUp,
    Sparkles,
    Camera,
    ImagePlus,
    Trash2,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Modal } from '@/components/modal'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCountUp } from '@/components/stat-card'
import { useImageUpload } from '@/hooks/use-image-upload'
import {
    useAdminCollectiveDetail,
    useAdminCollectiveMembers,
    useAdminCollectiveEvents,
    useAdminCollectiveStats,
    useAdminUpdateCollective,
    useAdminUpdateMemberRole,
    useAdminRemoveMember,
    useAdminRestoreMember,
    useAdminAddMember,
    useArchiveCollective,
    useDeleteCollective,
    useSearchUsers,
    exportAdminMembersCSV,
    type AdminCollectiveMember,
    type AdminCollectiveEvent,
} from '@/hooks/use-admin-collectives'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Role helpers                                                       */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<CollectiveRole, string> = {
  leader: 'Leader',
  co_leader: 'Co-Leader',
  assist_leader: 'Assist Leader',
  member: 'Member',
}

const ROLE_ICONS: Record<CollectiveRole, typeof Crown> = {
  leader: Crown,
  co_leader: ShieldCheck,
  assist_leader: ShieldAlert,
  member: Users,
}

const ROLE_COLORS: Record<CollectiveRole, string> = {
  leader: 'bg-warning-100 text-warning-700',
  co_leader: 'bg-primary-100 text-primary-700',
  assist_leader: 'bg-info-100 text-info-700',
  member: 'bg-neutral-100 text-neutral-600',
}

const ROLE_CARD_ACCENTS: Record<CollectiveRole, { bg: string; border: string; icon: string }> = {
  leader: { bg: 'bg-gradient-to-br from-warning-50 to-warning-100/60', border: 'border-warning-200/60', icon: 'bg-warning-100 text-warning-600' },
  co_leader: { bg: 'bg-gradient-to-br from-primary-50 to-primary-100/60', border: 'border-primary-200/60', icon: 'bg-primary-100 text-primary-600' },
  assist_leader: { bg: 'bg-gradient-to-br from-info-50 to-info-100/60', border: 'border-info-200/60', icon: 'bg-info-100 text-info-600' },
  member: { bg: 'bg-gradient-to-br from-neutral-50 to-neutral-100/60', border: 'border-neutral-200/60', icon: 'bg-neutral-100 text-neutral-500' },
}

const ALL_ROLES: CollectiveRole[] = ['leader', 'co_leader', 'assist_leader', 'member']

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const

type TabKey = 'overview' | 'members' | 'events' | 'settings'

/* ------------------------------------------------------------------ */
/*  Rich stat card - gradient surface with icon & countUp             */
/* ------------------------------------------------------------------ */

function RichStatCard({
  label,
  value,
  icon,
  color,
  reducedMotion,
  delay = 0,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  reducedMotion: boolean
  delay?: number
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: reducedMotion ? 0 : delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 rounded-xl bg-white shadow-sm px-4 py-3.5 active:scale-[0.98] transition-transform duration-150"
      aria-label={`${label}: ${value}`}
    >
      <span className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', color)} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className="text-xl sm:text-2xl font-bold text-primary-800 tabular-nums"
        >
          {display.toLocaleString()}
        </p>
        <p className="text-xs text-primary-400 font-medium truncate">{label}</p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero stat - large gradient card (used for top 4 stats)            */
/* ------------------------------------------------------------------ */

function HeroStat({
  value,
  label,
  icon,
  variant = 'default',
  reducedMotion,
  delay = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  variant?: 'primary' | 'dark' | 'accent' | 'default'
  reducedMotion: boolean
  delay?: number
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  const variantStyles = {
    primary: 'bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white',
    dark: 'bg-gradient-to-br from-primary-900 via-primary-950 to-neutral-900 text-white',
    accent: 'bg-gradient-to-br from-accent-500 via-accent-600 to-primary-700 text-white',
    default: 'bg-white text-primary-800 shadow-sm',
  }
  const iconBg = { primary: 'bg-white/15', dark: 'bg-white/10', accent: 'bg-white/15', default: 'bg-primary-50' }
  const iconColor = { primary: 'text-white/80', dark: 'text-white/70', accent: 'text-white/80', default: 'text-primary-500' }
  const labelColor = { primary: 'text-white/65', dark: 'text-white/55', accent: 'text-white/65', default: 'text-primary-400' }
  const valColor = { primary: 'text-white', dark: 'text-white', accent: 'text-white', default: 'text-primary-800' }

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: reducedMotion ? 0 : delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ willChange: 'transform' }}
      className={cn('relative overflow-hidden rounded-2xl p-4 sm:p-5', variantStyles[variant])}
    >
      {variant !== 'default' && (
        <>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/[0.05]" />
          <div className="absolute -left-3 -bottom-6 w-16 h-16 rounded-full bg-white/[0.03]" />
        </>
      )}
      {variant === 'default' && (
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-primary-50/60" />
      )}
      <div className="relative z-10">
        <span className={cn('flex items-center justify-center w-9 h-9 rounded-xl mb-3', iconBg[variant], iconColor[variant])} aria-hidden="true">
          {icon}
        </span>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} className={cn('text-2xl sm:text-3xl font-bold tracking-tight tabular-nums', valColor[variant])}>
          {display.toLocaleString()}
        </p>
        <p className={cn('mt-0.5 text-sm font-medium', labelColor[variant])}>{label}</p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overview tab                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ collectiveId, reducedMotion }: { collectiveId: string; reducedMotion: boolean }) {
  const rm = reducedMotion
  const { data: detail } = useAdminCollectiveDetail(collectiveId)
  const { data: stats, isLoading: statsLoading } = useAdminCollectiveStats(collectiveId)
  const showStatsLoading = useDelayedLoading(statsLoading)
  const { data: members = [] } = useAdminCollectiveMembers(collectiveId)
  const { data: events = [] } = useAdminCollectiveEvents(collectiveId)

  const leaders = members.filter((m) =>
    ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  const recentEvents = events.slice(0, 5)

  // Build impact items (only show non-zero)
  const impactItems: { value: number; label: string; icon: React.ReactNode; color: string }[] = stats
    ? [
        { value: stats.trees_planted, label: 'Trees Planted', icon: <TreePine size={20} className="text-success-700" />, color: 'bg-success-50' },
        { value: Math.round(stats.rubbish_kg), label: 'Rubbish (kg)', icon: <span className="text-lg text-primary-700" aria-hidden="true">&#9851;</span>, color: 'bg-primary-50' },
        ...(Math.round(stats.area_restored_sqm) > 0 ? [{ value: Math.round(stats.area_restored_sqm), label: 'Area (sqm)', icon: <MapPin size={20} className="text-primary-600" />, color: 'bg-primary-50' }] : []),
        ...(stats.native_plants > 0 ? [{ value: stats.native_plants, label: 'Native Plants', icon: <Leaf size={20} className="text-success-600" />, color: 'bg-success-50' }] : []),
        ...((stats.wildlife_sightings ?? 0) > 0 ? [{ value: stats.wildlife_sightings, label: 'Wildlife Sightings', icon: <Eye size={20} className="text-warning-600" />, color: 'bg-warning-50' }] : []),
      ].filter((i) => i.value > 0)
    : []

  return (
    <div className="space-y-8">
      {/* ── Collective hero card ── */}
      <motion.div
        initial={rm ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-900 to-primary-950 shadow-lg"
      >
        {/* Decorative shapes */}
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full border border-white/[0.04]" />
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full border border-white/[0.02]" />
        <div className="absolute left-[8%] bottom-[20%] w-2 h-2 rounded-full bg-primary-400/25" />
        <div className="absolute right-[15%] top-[30%] w-1.5 h-1.5 rounded-full bg-success-400/20" />

        {/* Cover image with gradient overlay */}
        {detail?.cover_image_url && (
          <div className="absolute inset-0">
            <img
              src={detail.cover_image_url}
              alt=""
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/95 via-primary-900/80 to-primary-800/60" />
          </div>
        )}

        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
                {detail?.name}
              </h2>
              {(detail?.region || detail?.state) && (
                <p className="text-sm text-white/50 flex items-center gap-1.5 mt-1">
                  <MapPin size={14} />
                  {[detail.region, detail.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            {!detail?.is_active && (
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/60 border border-white/10">
                Archived
              </span>
            )}
          </div>
          {detail?.description && (
            <p className="text-sm text-white/45 leading-relaxed max-w-2xl">
              {detail.description}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Primary stats - 4 hero cards ── */}
      {showStatsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : statsLoading ? null : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <HeroStat value={stats.member_count} label="Members" icon={<Users size={20} />} variant="primary" reducedMotion={rm} delay={0.05} />
          <HeroStat value={stats.event_count} label="Events" icon={<CalendarDays size={20} />} variant="accent" reducedMotion={rm} delay={0.1} />
          <HeroStat value={Math.round(stats.hours_total)} label="Volunteer Hours" icon={<Clock size={20} />} variant="dark" reducedMotion={rm} delay={0.15} />
          <HeroStat value={stats.trees_planted} label="Trees Planted" icon={<TreePine size={20} />} variant="default" reducedMotion={rm} delay={0.2} />
        </div>
      ) : null}

      {/* ── Environmental impact pills ── */}
      {impactItems.length > 0 && (
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-primary-500" />
            <h3 className="font-heading text-sm font-semibold text-primary-800">Environmental Impact</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {impactItems.map((item, i) => (
              <RichStatCard
                key={item.label}
                value={item.value}
                label={item.label}
                icon={item.icon}
                color={item.color}
                reducedMotion={rm}
                delay={0.3 + i * 0.04}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Leadership team ── */}
      <motion.div
        initial={rm ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Crown size={16} className="text-warning-500" />
          <h3 className="font-heading text-sm font-semibold text-primary-800">
            Leadership Team
          </h3>
          <span className="text-xs text-primary-400 font-medium">({leaders.length})</span>
        </div>
        {leaders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary-200 p-6 text-center">
            <p className="text-sm text-primary-400">No leaders assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaders.map((m, i) => {
              const Icon = ROLE_ICONS[m.role]
              const accent = ROLE_CARD_ACCENTS[m.role]
              return (
                <motion.div
                  key={m.id}
                  initial={rm ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: rm ? 0 : 0.4 + i * 0.05 }}
                  className={cn(
                    'relative overflow-hidden rounded-2xl p-4 border',
                    accent.bg,
                    accent.border,
                  )}
                >
                  <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/30" />
                  <div className="relative z-10 flex items-center gap-3">
                    <Avatar
                      src={m.profiles?.avatar_url}
                      name={m.profiles?.display_name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800 truncate">
                        {m.profiles?.display_name ?? 'Unknown'}
                      </p>
                      {m.profiles?.instagram_handle && (
                        <p className="text-xs text-primary-400 truncate">
                          @{m.profiles.instagram_handle}
                        </p>
                      )}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold mt-1.5',
                          ROLE_COLORS[m.role],
                        )}
                      >
                        <Icon size={10} />
                        {ROLE_LABELS[m.role]}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── Recent events ── */}
      <motion.div
        initial={rm ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-accent-500" />
            <h3 className="font-heading text-sm font-semibold text-primary-800">Recent Events</h3>
            <span className="text-xs text-primary-400 font-medium">({events.length} total)</span>
          </div>
        </div>
        {recentEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary-200 p-6 text-center">
            <p className="text-sm text-primary-400">No events yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev, i) => (
              <EventRow key={ev.id} event={ev} reducedMotion={rm} delay={0.5 + i * 0.04} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Event row - rich card style                                        */
/* ------------------------------------------------------------------ */

const EVENT_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  published: { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  completed: { bg: 'bg-success-100', text: 'text-success-700', dot: 'bg-success-500' },
  cancelled: { bg: 'bg-error-100', text: 'text-error-600', dot: 'bg-error-500' },
}

function EventRow({ event, reducedMotion, delay = 0 }: { event: AdminCollectiveEvent; reducedMotion: boolean; delay?: number }) {
  const date = new Date(event.date_start)
  const status = EVENT_STATUS_STYLES[event.status] ?? EVENT_STATUS_STYLES.draft

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: reducedMotion ? 0 : Math.min(delay, 0.3) }}
      className="flex items-center gap-3.5 rounded-2xl bg-white shadow-sm px-4 py-3 hover:shadow-md transition-shadow duration-200"
    >
      {/* Date block */}
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/60 border border-primary-100/60 shrink-0">
        <span className="text-[11px] font-bold text-primary-500 uppercase leading-none">
          {date.toLocaleDateString('en-AU', { month: 'short' })}
        </span>
        <span className="text-base font-bold text-primary-800 leading-tight">
          {date.getDate()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-800 truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-primary-400">
          <span className="capitalize">{event.activity_type.replace(/_/g, ' ')}</span>
          <span className="w-1 h-1 rounded-full bg-primary-300" />
          <span>{event.registrationCount} registered</span>
          {event.capacity && (
            <>
              <span>/</span>
              <span>{event.capacity} cap</span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full capitalize shrink-0',
          status.bg,
          status.text,
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
        {event.status}
      </span>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Members tab                                                        */
/* ------------------------------------------------------------------ */

function MembersTab({ collectiveId }: { collectiveId: string }) {
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [roleAssignMember, setRoleAssignMember] = useState<AdminCollectiveMember | null>(null)
  const [removingMember, setRemovingMember] = useState<AdminCollectiveMember | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)

  const { data: detail } = useAdminCollectiveDetail(collectiveId)
  const { data: members = [], isLoading } = useAdminCollectiveMembers(
    collectiveId,
    showInactive ? 'all' : 'active',
  )
  const showLoading = useDelayedLoading(isLoading)
  const updateRole = useAdminUpdateMemberRole()
  const removeMember = useAdminRemoveMember()
  const restoreMember = useAdminRestoreMember()

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) =>
        m.profiles?.display_name?.toLowerCase().includes(q) ||
        m.profiles?.instagram_handle?.toLowerCase().includes(q),
    )
  }, [members, search])

  const handleRoleChange = async (userId: string, role: CollectiveRole) => {
    try {
      await updateRole.mutateAsync({ collectiveId, userId, role })
      setRoleAssignMember(null)
      toast.success(`Role updated to ${ROLE_LABELS[role]}`)
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleRemove = async () => {
    if (!removingMember) return
    try {
      await removeMember.mutateAsync({
        collectiveId,
        userId: removingMember.user_id,
      })
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
    setRemovingMember(null)
  }

  const handleRestore = async (member: AdminCollectiveMember) => {
    try {
      await restoreMember.mutateAsync({
        collectiveId,
        userId: member.user_id,
      })
      toast.success('Member restored')
    } catch {
      toast.error('Failed to restore member')
    }
  }

  const handleExport = () => {
    exportAdminMembersCSV(members, detail?.name ?? 'collective')
    toast.success('CSV downloaded')
  }

  if (showLoading) return <Skeleton variant="list-item" count={8} />

  return (
    <div className="space-y-5">
      {/* ── Search & controls ── */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-50/80 via-white to-primary-50/60 border border-primary-100/60 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or handle..."
              className={cn(
                'w-full rounded-full bg-white py-2.5 pl-10 pr-4 text-sm text-primary-800',
                'placeholder:text-primary-300 shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-shadow duration-200',
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInactive((p) => !p)}
              className={cn(
                'h-10 px-3.5 rounded-full text-xs font-semibold',
                'transition-[color,background-color,box-shadow] duration-200 cursor-pointer select-none',
                showInactive
                  ? 'bg-primary-700 text-white shadow-md'
                  : 'bg-white text-primary-500 hover:bg-primary-50 shadow-sm',
              )}
            >
              {showInactive ? 'All statuses' : 'Active only'}
            </button>
            <Button
              variant="ghost"
              size="sm"
              icon={<UserPlus size={16} />}
              onClick={() => setShowAddMember(true)}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={16} />}
              onClick={handleExport}
            >
              CSV
            </Button>
          </div>
        </div>
        <p className="text-xs text-primary-400 mt-3 pl-1">
          {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* ── Member list ── */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No members found"
          description={search ? 'Try a different search' : 'This collective has no members yet'}
        />
      ) : (
        <div className="space-y-1.5">
          {filteredMembers.map((member) => {
            const Icon = ROLE_ICONS[member.role]
            const isInactive = member.status !== 'active'

            return (
              <div
                key={member.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 transition-[color,background-color,box-shadow] duration-200',
                  isInactive
                    ? 'opacity-50 bg-neutral-50/80'
                    : 'bg-white shadow-sm hover:shadow-md',
                )}
              >
                <Avatar
                  src={member.profiles?.avatar_url}
                  name={member.profiles?.display_name}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-800 truncate">
                    {member.profiles?.display_name ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        ROLE_COLORS[member.role],
                      )}
                    >
                      <Icon size={10} />
                      {ROLE_LABELS[member.role]}
                    </span>
                    {member.profiles?.instagram_handle && (
                      <span className="text-[11px] text-primary-400 truncate">
                        @{member.profiles.instagram_handle}
                      </span>
                    )}
                    {isInactive && (
                      <span className="text-[11px] font-semibold text-error-500 capitalize">
                        {member.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isInactive ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(member)}
                      className="p-2.5 rounded-xl text-primary-400 hover:bg-primary-100 cursor-pointer transition-colors"
                      aria-label="Restore member"
                    >
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setRoleAssignMember(member)}
                        className="p-2.5 rounded-xl text-primary-400 hover:bg-primary-100 cursor-pointer transition-colors"
                        aria-label="Change role"
                      >
                        <Shield size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemovingMember(member)}
                        className="p-2.5 rounded-xl text-primary-400 hover:bg-error-50 hover:text-error-500 cursor-pointer transition-colors"
                        aria-label="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Role assignment sheet */}
      {roleAssignMember && (
        <BottomSheet open={!!roleAssignMember} onClose={() => setRoleAssignMember(null)}>
          <div className="space-y-4 pb-2">
            <div>
              <h3 className="font-heading text-lg font-semibold text-primary-800">
                Change Role
              </h3>
              <p className="text-sm text-primary-500 mt-1">
                {roleAssignMember.profiles?.display_name ?? 'Member'} is currently{' '}
                <strong className="text-primary-700">{ROLE_LABELS[roleAssignMember.role]}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              {ALL_ROLES.map((role) => {
                const RoleIcon = ROLE_ICONS[role]
                const isActive = roleAssignMember.role === role
                const accent = ROLE_CARD_ACCENTS[role]

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(roleAssignMember.user_id, role)}
                    disabled={isActive}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-4 py-3.5 min-h-11 text-sm',
                      'active:scale-[0.97] transition-[color,background-color,box-shadow,transform] duration-150 cursor-pointer select-none border',
                      isActive
                        ? cn(accent.bg, accent.border, 'text-primary-700')
                        : 'bg-white border-transparent text-primary-800 hover:bg-primary-50',
                    )}
                  >
                    <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg', isActive ? accent.icon : 'bg-primary-50 text-primary-400')}>
                      <RoleIcon size={16} />
                    </span>
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                    {isActive && (
                      <span className="ml-auto text-xs text-primary-500 font-semibold bg-white/80 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Remove confirmation */}
      <ConfirmationSheet
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemove}
        title="Remove member?"
        description={`${removingMember?.profiles?.display_name ?? 'This member'} will be removed from the collective and lose access to chat and events.`}
        confirmLabel="Remove Member"
        variant="danger"
      />

      {/* Add member modal */}
      {showAddMember && (
        <AddMemberModal
          collectiveId={collectiveId}
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add member modal                                                   */
/* ------------------------------------------------------------------ */

function AddMemberModal({
  collectiveId,
  open,
  onClose,
}: {
  collectiveId: string
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<CollectiveRole>('member')
  const { data: results = [], isLoading } = useSearchUsers(query)
  const showLoading = useDelayedLoading(isLoading)
  const addMember = useAdminAddMember()

  const handleAdd = async (userId: string) => {
    try {
      await addMember.mutateAsync({
        collectiveId,
        userId,
        role: selectedRole,
      })
      toast.success('Member added')
      onClose()
    } catch {
      toast.error('Failed to add member')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <div className="space-y-4">
        <Input
          label="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
        />

        <div>
          <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1.5">
            Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as CollectiveRole)}
            className={cn(
              'w-full rounded-xl bg-primary-50/50 px-3 py-2.5 text-sm text-primary-800',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
            )}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {showLoading ? (
              <Skeleton variant="list-item" count={3} />
            ) : results.length === 0 ? (
              <p className="text-sm text-primary-400 py-4 text-center">
                No users found for &quot;{query}&quot;
              </p>
            ) : (
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleAdd(user.id)}
                  disabled={addMember.isPending}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                    'hover:bg-primary-50 active:scale-[0.98] transition-[color,background-color,transform] duration-150',
                    'cursor-pointer select-none',
                  )}
                >
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {user.display_name ?? 'Unknown'}
                    </p>
                    {user.instagram_handle && (
                      <p className="text-xs text-primary-400 truncate">@{user.instagram_handle}</p>
                    )}
                  </div>
                  <UserPlus size={16} className="text-primary-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Events tab                                                         */
/* ------------------------------------------------------------------ */

function EventsTab({ collectiveId, reducedMotion }: { collectiveId: string; reducedMotion: boolean }) {
  const rm = reducedMotion
  const { data: events = [], isLoading } = useAdminCollectiveEvents(collectiveId)
  const showLoading = useDelayedLoading(isLoading)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return events
    return events.filter((e) => e.status === statusFilter)
  }, [events, statusFilter])

  const statuses = ['all', 'published', 'completed', 'draft', 'cancelled']

  const statusColors: Record<string, { active: string; inactive: string }> = {
    all: { active: 'bg-primary-700 text-white', inactive: 'bg-white text-primary-500' },
    published: { active: 'bg-primary-600 text-white', inactive: 'bg-white text-primary-500' },
    completed: { active: 'bg-success-600 text-white', inactive: 'bg-white text-success-600' },
    draft: { active: 'bg-neutral-600 text-white', inactive: 'bg-white text-neutral-500' },
    cancelled: { active: 'bg-error-600 text-white', inactive: 'bg-white text-error-500' },
  }

  if (showLoading) return <Skeleton variant="list-item" count={5} />

  return (
    <div className="space-y-5">
      {/* ── Status filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((s) => {
          const isActive = statusFilter === s
          const colors = statusColors[s] ?? statusColors.all
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'h-9 px-4 rounded-full text-xs font-semibold capitalize',
                'transition-[color,background-color,box-shadow] duration-200 cursor-pointer select-none shadow-sm',
                isActive ? colors.active : colors.inactive,
                isActive && 'shadow-md',
              )}
            >
              {s}
              {s !== 'all' && (
                <span className={cn('ml-1.5', isActive ? 'opacity-70' : 'opacity-50')}>
                  {events.filter((e) => e.status === s).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Event list ── */}
      {filtered.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No events"
          description={statusFilter !== 'all' ? 'No events with this status' : 'This collective has no events yet'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((ev, i) => (
            <EventRow key={ev.id} event={ev} reducedMotion={rm} delay={i * 0.03} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Settings tab                                                       */
/* ------------------------------------------------------------------ */

function SettingsTab({ collectiveId }: { collectiveId: string }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()

  const { data: detail } = useAdminCollectiveDetail(collectiveId)
  const updateCollective = useAdminUpdateCollective()
  const archiveCollective = useArchiveCollective()
  const deleteCollective = useDeleteCollective()
  const { upload, uploading, progress } = useImageUpload({ bucket: 'collective-images', pathPrefix: 'covers' })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [state, setState] = useState('')
  const [slug, setSlug] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Initialize form when detail loads
  if (detail && !initialized) {
    setName(detail.name)
    setDescription(detail.description ?? '')
    setRegion(detail.region ?? '')
    setState(detail.state ?? '')
    setSlug(detail.slug)
    setCoverPreview(detail.cover_image_url)
    setInitialized(true)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await upload(file)
      setCoverPreview(result.url)
      await updateCollective.mutateAsync({
        collectiveId,
        updates: { cover_image_url: result.url },
      })
      toast.success('Cover image updated')
    } catch {
      toast.error('Failed to upload image')
    }
  }

  const handleCoverRemove = async () => {
    try {
      await updateCollective.mutateAsync({
        collectiveId,
        updates: { cover_image_url: null },
      })
      setCoverPreview(null)
      toast.success('Cover image removed')
    } catch {
      toast.error('Failed to remove image')
    }
  }

  const handleSave = async () => {
    try {
      await updateCollective.mutateAsync({
        collectiveId,
        updates: {
          name,
          description: description || null,
          region: region || null,
          state: state || null,
          slug: slug || undefined,
        },
      })
      toast.success('Collective updated')
    } catch {
      toast.error('Failed to update collective')
    }
  }

  const handleArchiveToggle = async () => {
    if (!detail) return
    try {
      await archiveCollective.mutateAsync({
        collectiveId,
        archive: detail.is_active,
      })
      toast.success(detail.is_active ? 'Collective archived' : 'Collective restored')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCollective.mutateAsync(collectiveId)
      toast.success('Collective permanently deleted')
      navigate('/admin/collectives')
    } catch {
      toast.error('Failed to delete collective')
    }
    setShowDeleteConfirm(false)
  }

  if (!detail) return <Skeleton variant="card" count={2} />

  return (
    <div className="space-y-6 max-w-xl">
      {/* ── Cover image ── */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-50 via-white to-primary-50/60 px-5 py-3 border-b border-primary-100/60">
          <h3 className="font-heading text-sm font-semibold text-primary-700">
            Cover Image
          </h3>
        </div>
        <div className="p-5">
          <div className="relative rounded-xl overflow-hidden bg-primary-50/50" style={{ aspectRatio: '16/9' }}>
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-primary-300 gap-2">
                <ImagePlus size={32} />
                <span className="text-xs font-medium">No cover image</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white rounded-xl px-4 py-2 shadow-lg">
                  <p className="text-xs font-semibold text-primary-700 tabular-nums">{progress ?? 0}%</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<Camera size={14} />}
              disabled={uploading}
              onClick={() => document.getElementById('admin-cover-upload')?.click()}
            >
              {coverPreview ? 'Replace' : 'Upload'}
            </Button>
            {coverPreview && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={handleCoverRemove}
                disabled={uploading}
              >
                Remove
              </Button>
            )}
            <input
              id="admin-cover-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>
          <p className="text-[11px] text-primary-400 mt-2">
            Recommended: 1200x675px (16:9). Shown on the collective page and discovery cards.
          </p>
        </div>
      </div>

      {/* ── Edit form ── */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-50 via-white to-primary-50/60 px-5 py-3 border-b border-primary-100/60">
          <h3 className="font-heading text-sm font-semibold text-primary-700">
            Collective Details
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-safe-name"
          />

          <div>
            <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what this collective is about..."
              rows={4}
              className={cn(
                'w-full rounded-xl bg-primary-50/50 px-3 py-2.5 text-sm text-primary-800',
                'placeholder:text-primary-300',
                'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
                'resize-none transition-shadow duration-200',
              )}
            />
          </div>

          <Input
            label="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Byron Bay"
          />

          <div>
            <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1.5">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={cn(
                'w-full rounded-xl bg-primary-50/50 px-3 py-2.5 text-sm text-primary-800',
                'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
              )}
            >
              <option value="">Select state...</option>
              {AUSTRALIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <Button
              variant="primary"
              onClick={handleSave}
              loading={updateCollective.isPending}
              disabled={!name.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div className="rounded-2xl overflow-hidden border border-error-200/40">
        <div className="bg-gradient-to-r from-error-50 via-error-50/60 to-white px-5 py-3 border-b border-error-100/60">
          <h3 className="font-heading text-sm font-semibold text-error-600 flex items-center gap-2">
            <AlertTriangle size={14} />
            Danger Zone
          </h3>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-800">
                {detail.is_active ? 'Archive Collective' : 'Restore Collective'}
              </p>
              <p className="text-xs text-primary-400 mt-0.5 leading-relaxed">
                {detail.is_active
                  ? 'Hide this collective from members. Data is preserved.'
                  : 'Make this collective active and visible again.'}
              </p>
            </div>
            <Button
              variant={detail.is_active ? 'danger' : 'primary'}
              size="sm"
              icon={detail.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}
              onClick={handleArchiveToggle}
              loading={archiveCollective.isPending}
            >
              {detail.is_active ? 'Archive' : 'Restore'}
            </Button>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-error-100/60">
              <div>
                <p className="text-sm font-semibold text-error-700">
                  Permanently Delete
                </p>
                <p className="text-xs text-error-500/80 mt-0.5 leading-relaxed">
                  This will permanently delete the collective, all members, events, and impact data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<AlertTriangle size={16} />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmationSheet
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Permanently delete collective?"
        description={`This will permanently delete "${detail.name}" and ALL associated data including members, events, and impact records. This action CANNOT be undone.`}
        confirmLabel="Delete Forever"
        variant="danger"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AdminCollectiveDetailPage() {
  const { collectiveId } = useParams<{ collectiveId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const { data: detail, isLoading } = useAdminCollectiveDetail(collectiveId)
  const showLoading = useDelayedLoading(isLoading)

  const heroActions = useMemo(
    () => (
      <Button
        variant="ghost"
        size="sm"
        icon={<ExternalLink size={14} />}
        onClick={() => navigate(`/collectives/${detail?.slug ?? collectiveId}`)}
        className="!text-white/70 hover:!text-white hover:!bg-white/10"
      >
        View Public
      </Button>
    ),
    [detail?.slug, collectiveId, navigate],
  )

  useAdminHeader(detail?.name ?? 'Collective', { actions: heroActions })

  if (showLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }
  if (!detail) {
    return (
      <EmptyState
        illustration="error"
        title="Collective not found"
        description="This collective may have been deleted"
        action={{ label: 'Back to Collectives', onClick: () => navigate('/admin/collectives') }}
      />
    )
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <TrendingUp size={15} /> },
    { key: 'members', label: 'Members', icon: <Users size={15} /> },
    { key: 'events', label: 'Events', icon: <CalendarDays size={15} /> },
    { key: 'settings', label: 'Settings', icon: <Shield size={15} /> },
  ]

  return (
    <motion.div
      className="space-y-6"
      initial={rm ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Back link ── */}
      <motion.div
        initial={rm ? {} : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin/collectives')}
          className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-600 transition-colors cursor-pointer select-none group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          All Collectives
        </button>
      </motion.div>

      {/* ── Tab bar - rich pill style ── */}
      <motion.div
        initial={rm ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="rounded-2xl bg-gradient-to-r from-primary-50/80 via-white to-primary-50/60 border border-primary-100/60 p-1.5"
      >
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold',
                  'rounded-xl transition-[color,background-color,box-shadow] duration-200 cursor-pointer select-none',
                  isActive
                    ? 'bg-primary-700 text-white shadow-lg'
                    : 'text-primary-400 hover:text-primary-600 hover:bg-white/80',
                )}
              >
                <span className={cn(isActive ? 'text-white/80' : 'text-primary-300')}>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={rm ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={rm ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab collectiveId={collectiveId!} reducedMotion={rm} />}
          {activeTab === 'members' && <MembersTab collectiveId={collectiveId!} />}
          {activeTab === 'events' && <EventsTab collectiveId={collectiveId!} reducedMotion={rm} />}
          {activeTab === 'settings' && <SettingsTab collectiveId={collectiveId!} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

import { useState, useMemo, useCallback, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    CalendarPlus,
    ChevronRight,
    TreePine,
    Trash2,
    Eye,
    Leaf,
    Sprout,
    Waves,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Mail,
    QrCode,
    Copy,
    Ban,
    Send,
    Compass,
    Mountain,
    Accessibility,
    Shirt,
    Backpack,
    Sparkles,
    Zap,
    Pencil,
    ClipboardList,
    Bell,
} from 'lucide-react'
import { EventHero, EventHeroOverlay } from './event-hero'
import { EventActions } from './event-actions'
import { EventAttendees } from './event-attendees'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/hooks/use-auth'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import {
    useEventDetail,
    useRegisterForEvent,
    useCancelRegistration,
    useCancelEvent,
    useDuplicateEvent,
    useInviteCollective,
    formatEventDate,
    formatEventTime,
    getEventDuration,
    isPastEvent,
    downloadIcsFile,
    getGoogleCalendarUrl,
} from '@/hooks/use-events'
import {
    Page,
    Header,
    Button,
    Input,
    EmptyState,
    ConfirmationSheet,
    BottomSheet, StatCard,
    CheckInSheet
} from '@/components'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useImpactMetricDefs } from '@/hooks/use-impact-metric-defs'
import { MapView } from '@/components'

/* ------------------------------------------------------------------ */
/*  Activity colour accents                                            */
/* ------------------------------------------------------------------ */

const activityAccent: Record<string, { gradient: string; glow: string; bg: string; text: string; border: string }> = {
  shore_cleanup:      { gradient: 'from-sky-400 to-cyan-500',         glow: 'shadow-sky-400/25',    bg: 'bg-sky-50',        text: 'text-sky-700',      border: 'border-sky-200/50' },
  tree_planting:      { gradient: 'from-emerald-400 to-green-500',    glow: 'shadow-emerald-400/25', bg: 'bg-emerald-50',    text: 'text-emerald-700',  border: 'border-emerald-200/50' },
  land_regeneration:  { gradient: 'from-lime-400 to-green-500',       glow: 'shadow-lime-400/25',   bg: 'bg-lime-50',       text: 'text-lime-700',     border: 'border-lime-200/50' },
  nature_walk:        { gradient: 'from-teal-400 to-emerald-500',     glow: 'shadow-teal-400/25',   bg: 'bg-teal-50',       text: 'text-teal-700',     border: 'border-teal-200/50' },
  camp_out:           { gradient: 'from-amber-400 to-orange-500',     glow: 'shadow-amber-400/25',  bg: 'bg-amber-50',      text: 'text-amber-700',    border: 'border-amber-200/50' },
  retreat:            { gradient: 'from-violet-400 to-purple-500',    glow: 'shadow-violet-400/25', bg: 'bg-violet-50',     text: 'text-violet-700',   border: 'border-violet-200/50' },
  film_screening:     { gradient: 'from-rose-400 to-pink-500',        glow: 'shadow-rose-400/25',   bg: 'bg-rose-50',       text: 'text-rose-700',     border: 'border-rose-200/50' },
  marine_restoration: { gradient: 'from-blue-400 to-indigo-500',      glow: 'shadow-blue-400/25',   bg: 'bg-blue-50',       text: 'text-blue-700',     border: 'border-blue-200/50' },
  workshop:           { gradient: 'from-fuchsia-400 to-purple-500',   glow: 'shadow-fuchsia-400/25', bg: 'bg-fuchsia-50',   text: 'text-fuchsia-700',  border: 'border-fuchsia-200/50' },
}

const defaultAccent = { gradient: 'from-primary-400 to-sprout-500', glow: 'shadow-primary-400/25', bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200/50' }

/* ------------------------------------------------------------------ */
/*  Difficulty config                                                  */
/* ------------------------------------------------------------------ */

const difficultyConfig = {
  easy: { label: 'Easy', color: 'text-success-600 bg-success-100', icon: Sparkles },
  moderate: { label: 'Moderate', color: 'text-warning-600 bg-warning-100', icon: Zap },
  challenging: { label: 'Challenging', color: 'text-error-600 bg-error-100', icon: Mountain },
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function EventDetailSkeleton() {
  return (
    <Page swipeBack header={<Header title="" back />}>
      <div>
        {/* Hero shimmer */}
        <div className="relative -mx-4 lg:-mx-6">
          <div className="w-full overflow-hidden animate-pulse" style={{ aspectRatio: '3/4', maxHeight: '56vh' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200/40 via-moss-200/30 to-sprout-200/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        </div>
        <div className="pt-5 space-y-4">
          {/* Info card shimmer */}
          <div className="rounded-2xl bg-white/60 border border-sprout-200/30 p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sprout-100/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-primary-100/50 rounded w-2/3" />
                <div className="h-3 bg-primary-100/30 rounded w-1/3" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sprout-100/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-primary-100/50 rounded w-3/4" />
                <div className="h-3 bg-primary-100/30 rounded w-1/2" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sprout-100/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-primary-100/50 rounded w-1/2" />
                <div className="h-3 bg-primary-100/30 rounded w-3/5" />
              </div>
            </div>
          </div>
          {/* Capacity shimmer */}
          <div className="rounded-2xl bg-white/60 border border-primary-200/30 p-4 space-y-3 animate-pulse">
            <div className="h-4 bg-primary-100/40 rounded w-1/3" />
            <div className="h-3 bg-primary-100/30 rounded-full w-full" />
            <div className="flex -space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-primary-100/40 ring-2 ring-white" />
              ))}
            </div>
          </div>
          {/* Description shimmer */}
          <div className="rounded-2xl bg-white/60 border border-primary-200/30 p-4 space-y-2 animate-pulse">
            <div className="h-4 bg-primary-100/40 rounded w-1/4" />
            <div className="h-3 bg-primary-100/30 rounded w-full" />
            <div className="h-3 bg-primary-100/30 rounded w-5/6" />
            <div className="h-3 bg-primary-100/30 rounded w-2/3" />
          </div>
        </div>
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ */
/*  Glass info chip                                                    */
/* ------------------------------------------------------------------ */

function InfoChip({
  icon,
  label,
  value,
  accent,
  action,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: typeof defaultAccent
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex items-start gap-3 py-3.5 group">
      <span
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
          'shadow-sm transition-colors duration-200',
          accent.bg, accent.text, accent.border, 'border',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-primary-400/80">{label}</p>
        <p className="text-[15px] font-bold text-primary-800 break-words leading-snug mt-0.5">{value}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            'min-h-11 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-bold shrink-0 mt-0.5',
            'cursor-pointer select-none active:scale-[0.97] transition-transform duration-150',
            accent.bg, accent.text, accent.border, 'border',
            'hover:shadow-sm',
          )}
          aria-label={action.label}
        >
          <Compass size={13} />
          {action.label}
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff: isGlobalStaff } = useAuth()
  const { toast } = useToast()
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading } = useEventDetail(id)
  const showLoading = useDelayedLoading(isLoading)
  const { metricLabels, metricByKey } = useImpactMetricDefs()
  const collectiveRole = useCollectiveRole(event?.collective_id)
  const registerMutation = useRegisterForEvent()
  const cancelMutation = useCancelRegistration()
  const cancelEventMutation = useCancelEvent()
  const duplicateEventMutation = useDuplicateEvent()
  const inviteCollectiveMutation = useInviteCollective()

  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [showQrSheet, setShowQrSheet] = useState(false)
  const [showCancelEventSheet, setShowCancelEventSheet] = useState(false)
  const [showCheckInSheet, setShowCheckInSheet] = useState(false)
  const [showInviteSheet, setShowInviteSheet] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Re-evaluate active state every 60s so "Check In Now" appears on time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const accent = event ? (activityAccent[event.activity_type] ?? defaultAccent) : defaultAccent
  const past = event ? isPastEvent(event) : false
  const isAtCapacity = event?.capacity ? event.registration_count >= event.capacity : false

  // Event is "active" if it started (or starts within 1 hour) and hasn't ended
  const isEventActive = useMemo(() => {
    if (!event) return false
    const start = new Date(event.date_start).getTime()
    const end = event.date_end ? new Date(event.date_end).getTime() : start + 3 * 60 * 60 * 1000
    const earlyWindow = start - 60 * 60 * 1000 // 1 hour before
    return now >= earlyWindow && now <= end
  }, [event, now])
  const userStatus = event?.user_registration?.status ?? null
  // Only show leader tools if user has a role in THIS event's collective (or is global staff)
  const belongsToCollective = collectiveRole.role !== null
  const isLeaderOrAbove = (belongsToCollective && (collectiveRole.isCoLeader || collectiveRole.isLeader)) || isGlobalStaff
  const isStaff = (belongsToCollective && collectiveRole.isAssistLeader) || isGlobalStaff

  const capacityText = useMemo(() => {
    if (!event) return ''
    if (!event.capacity) return `${event.registration_count} going`
    return `${event.registration_count}/${event.capacity} spots filled`
  }, [event])

  const capacityPercent = useMemo(() => {
    if (!event?.capacity) return 0
    return Math.min(100, (event.registration_count / event.capacity) * 100)
  }, [event])

  const handleRegister = useCallback(() => {
    if (!event) return
    registerMutation.mutate({
      eventId: event.id,
      asWaitlist: isAtCapacity,
    })
  }, [event, isAtCapacity, registerMutation])

  const handleCancelConfirm = useCallback(() => {
    if (!event) return
    cancelMutation.mutate(event.id)
    setShowCancelSheet(false)
  }, [event, cancelMutation])

  const handleGetDirections = useCallback(() => {
    if (!event?.address) return
    const encoded = encodeURIComponent(event.address)
    if (Capacitor.isNativePlatform()) {
      window.open(`https://maps.google.com/maps?daddr=${encoded}`, '_system')
    } else {
      window.open(`https://maps.google.com/maps?daddr=${encoded}`, '_blank')
    }
  }, [event])

  const handleCancelEvent = useCallback(() => {
    if (!event) return
    cancelEventMutation.mutate(
      { eventId: event.id, reason: cancelReason },
      { onSuccess: () => setShowCancelEventSheet(false) },
    )
  }, [event, cancelReason, cancelEventMutation])

  const handleDuplicate = useCallback(() => {
    if (!event) return
    duplicateEventMutation.mutate(event.id, {
      onSuccess: (newEvent) => navigate(`/events/${newEvent.id}/edit`),
    })
  }, [event, duplicateEventMutation, navigate])

  const alreadyInvited = event?.has_been_invited ?? false

  const handleOpenInviteSheet = useCallback(() => {
    if (!event) return
    setInviteMessage(alreadyInvited
      ? `Don't miss out! Register now for ${event.title}.`
      : `You're all invited! Tap to view and register.`,
    )
    setShowInviteSheet(true)
  }, [event, alreadyInvited])

  const handleSendInvite = useCallback(() => {
    if (!event?.collective_id) return
    inviteCollectiveMutation.mutate(
      { eventId: event.id, collectiveId: event.collective_id, customMessage: inviteMessage || undefined },
      {
        onSuccess: (data) => {
          toast.success(data?.reminded ? 'Reminder posted to collective chat!' : 'All members invited & notified!')
          setShowInviteSheet(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send'),
      },
    )
  }, [event, inviteCollectiveMutation, toast, inviteMessage])

  const handleShare = useCallback(async () => {
    if (!event) return
    const url = `https://app.coexistaus.org/events/${event.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: `Check out ${event.title} on Co-Exist!`, url })
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }, [event])

  // CRITICAL: Don't show "not found" while still loading
  if (showLoading || isLoading) return <EventDetailSkeleton />
  if (!event) {
    return (
      <Page swipeBack header={<Header title="Event" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="This event may have been removed or the link is incorrect."
          action={{ label: 'Browse Events', to: '/events' }}
        />
      </Page>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Registration CTA                                                 */
  /* ---------------------------------------------------------------- */

  function renderCta() {
    if (!event) return null
    if (event.status === 'cancelled') {
      return (
        <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-error-50 text-error-700 text-sm font-semibold border border-error-200/40">
          <XCircle size={18} />
          This event has been cancelled
        </div>
      )
    }

    if (past) {
      if (userStatus === 'attended') {
        return (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate(`/events/${event.id}/survey`)}
          >
            Share Your Feedback
          </Button>
        )
      }
      return null
    }

    if (userStatus === 'attended') {
      return (
        <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-success-50 text-success-700 text-sm font-bold border border-success-200/40">
          <CheckCircle2 size={18} />
          You're checked in!
        </div>
      )
    }

    if (userStatus === 'registered') {
      if (isEventActive) {
        return (
          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<QrCode size={20} />}
              onClick={() => setShowCheckInSheet(true)}
              className={cn('bg-gradient-to-r shadow-lg', accent.gradient, accent.glow)}
            >
              Check In Now
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowCancelSheet(true)}
            >
              Cancel Registration
            </Button>
          </div>
        )
      }

      return (
        <div className="space-y-2">
          <div className={cn(
            'flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-bold border',
            accent.bg, accent.text, accent.border,
          )}>
            <CheckCircle2 size={18} />
            You're registered
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setShowCancelSheet(true)}
          >
            Cancel Registration
          </Button>
        </div>
      )
    }

    if (userStatus === 'waitlisted') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-warning-50 text-warning-700 text-sm font-bold border border-warning-200/40">
            <AlertCircle size={18} />
            You're on the waitlist
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setShowCancelSheet(true)}
          >
            Leave Waitlist
          </Button>
        </div>
      )
    }

    if (userStatus === 'invited') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-info-50 text-info-700 text-sm font-bold border border-info-200/40">
            <Mail size={18} />
            You've been invited
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={registerMutation.isPending}
            onClick={() => registerMutation.mutate({ eventId: event.id })}
            className={cn('bg-gradient-to-r shadow-lg', accent.gradient, accent.glow)}
          >
            Accept & Register
          </Button>
        </div>
      )
    }

    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={registerMutation.isPending}
        onClick={handleRegister}
        className={cn('bg-gradient-to-r shadow-lg', accent.gradient, accent.glow)}
      >
        {isAtCapacity ? 'Join Waitlist' : 'Register for Event'}
      </Button>
    )
  }

  return (
    <Page
      swipeBack
      footer={renderCta()}
      noBackground={!!event.cover_image_url}
      stickyOverlay={
        <EventHeroOverlay hasCoverImage={!!event.cover_image_url} onShare={handleShare} />
      }
    >
      <EventHero
        event={event}
        past={past}
        userStatus={userStatus}
        accent={accent}
        onShare={handleShare}
      />

      <div className="relative">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <svg className="absolute -top-12 -right-16 w-[280px] h-[280px] opacity-[0.10]" viewBox="0 0 280 280" fill="none">
            <circle cx="140" cy="140" r="130" stroke="var(--color-sprout-400)" strokeWidth="2.5" />
            <circle cx="140" cy="140" r="95" stroke="var(--color-moss-300)" strokeWidth="1.5" strokeDasharray="6 8" />
            <circle cx="140" cy="140" r="55" stroke="var(--color-primary-300)" strokeWidth="1" strokeDasharray="3 5" />
          </svg>
          <svg className="absolute top-[35%] -left-20 w-[220px] h-[220px] opacity-[0.08]" viewBox="0 0 220 220" fill="none">
            <circle cx="110" cy="110" r="100" stroke="var(--color-primary-400)" strokeWidth="2" />
            <circle cx="110" cy="110" r="70" stroke="var(--color-sprout-300)" strokeWidth="1.5" />
            <circle cx="110" cy="110" r="35" stroke="var(--color-moss-200)" strokeWidth="1" strokeDasharray="4 6" />
          </svg>
          <svg className="absolute bottom-[15%] right-4 w-[150px] h-[150px] opacity-[0.12]" viewBox="0 0 150 150" fill="none">
            <circle cx="75" cy="75" r="65" stroke="var(--color-moss-400)" strokeWidth="2" />
            <circle cx="75" cy="75" r="40" stroke="var(--color-sprout-400)" strokeWidth="1.5" strokeDasharray="4 6" />
          </svg>
          {/* Large soft colour blob */}
          <div className={cn('absolute -top-24 -right-24 w-[350px] h-[350px] rounded-full opacity-[0.04] bg-gradient-to-br', accent.gradient)} />
          <div className={cn('absolute bottom-[20%] -left-16 w-[250px] h-[250px] rounded-full opacity-[0.05] bg-gradient-to-tr', accent.gradient)} />
        </div>

      <motion.div
        className="relative pt-5 pb-8 space-y-4"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── Leader quick-actions grid ── */}
        {isStaff && !collectiveRole.isLoading && (
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-moss-400 to-sprout-500 flex items-center justify-center shadow-sm">
                <Sparkles size={11} className="text-white" />
              </div>
              <span className="text-[11px] font-bold text-primary-400/70 uppercase tracking-widest">Leader Actions</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => navigate(`/events/${event.id}/day`)}
                className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-primary-50/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-moss-500 to-moss-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <ClipboardList size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold text-primary-600 leading-tight text-center">Event Day</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrSheet(true)}
                className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-primary-50/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <QrCode size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold text-primary-600 leading-tight text-center">QR Code</span>
              </button>
              {isLeaderOrAbove && (
                <button
                  type="button"
                  onClick={() => navigate(`/events/${event.id}/impact`)}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-primary-50/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sprout-500 to-sprout-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Leaf size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary-600 leading-tight text-center">Log Impact</span>
                </button>
              )}
              {isLeaderOrAbove && (
                <button
                  type="button"
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-primary-50/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Pencil size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary-600 leading-tight text-center">Edit</span>
                </button>
              )}
              {isLeaderOrAbove && (
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={duplicateEventMutation.isPending}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-primary-50/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Copy size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary-600 leading-tight text-center">Duplicate</span>
                </button>
              )}
              {isLeaderOrAbove && !past && event.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={handleOpenInviteSheet}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-primary-50/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-gradient-to-br',
                    alreadyInvited ? 'from-sky-500 to-sky-600' : 'from-amber-500 to-amber-600',
                  )}>
                    {alreadyInvited ? <Bell size={16} className="text-white" /> : <Send size={16} className="text-white" />}
                  </div>
                  <span className="text-[10px] font-semibold text-primary-600 leading-tight text-center">{alreadyInvited ? 'Remind' : 'Invite'}</span>
                </button>
              )}
              {isLeaderOrAbove && event.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => setShowCancelEventSheet(true)}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-white shadow-sm border border-error-100/60 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150 cursor-pointer select-none"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-error-400 to-error-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <Ban size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-error-600 leading-tight text-center">Cancel</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Key info card ── */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className={cn(
            'rounded-2xl p-4.5 space-y-0.5 relative overflow-hidden',
            'border shadow-[0_6px_24px_-6px_rgba(61,77,51,0.15)]',
            accent.border, accent.bg,
          )}
        >
          {/* Decorative gradient wash */}
          <div className={cn('absolute inset-0 opacity-30 bg-gradient-to-br', accent.gradient)} aria-hidden="true" />
          <div className="absolute inset-0 bg-white/80" aria-hidden="true" />
          <div className="relative">
          <InfoChip
            icon={<Calendar size={17} />}
            label="Date & Time"
            value={`${formatEventDate(event.date_start)}${event.date_end ? ` - ${formatEventTime(event.date_end)}` : ''}`}
            accent={accent}
          />
          {event.date_end && (
            <InfoChip
              icon={<Clock size={17} />}
              label="Duration"
              value={getEventDuration(event.date_start, event.date_end)}
              accent={accent}
            />
          )}
          {event.address && (
            <InfoChip
              icon={<MapPin size={17} />}
              label="Location"
              value={event.address}
              accent={accent}
              action={{ label: 'Directions', onClick: handleGetDirections }}
            />
          )}
          </div>
        </motion.div>

        {/* ── Location map ── */}
        {event.address && (() => {
          const pos = parseLocationPoint(event.location_point)
          if (!pos) return null
          return (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <MapView
                center={pos}
                zoom={15}
                markers={[{ id: event.id, position: pos, variant: 'event', label: event.title }]}
                interactive={false}
                aria-label={`${event.title} location`}
                className="aspect-video rounded-2xl shadow-[0_4px_20px_-4px_rgba(61,77,51,0.12)] border border-primary-200/30"
              />
            </motion.div>
          )
        })()}

        {/* ── Collaborating collectives ── */}
        {event.collaborators && event.collaborators.length > 0 && (
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className={cn(
              'rounded-2xl p-4 relative overflow-hidden',
              'border shadow-[0_6px_24px_-6px_rgba(61,77,51,0.15)]',
              accent.border,
            )}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-r opacity-[0.06]', accent.gradient)} aria-hidden="true" />
            <div className="absolute inset-0 bg-white/92" aria-hidden="true" />
            <p className="relative text-[11px] uppercase tracking-wider font-semibold text-primary-400/80 mb-2.5">
              Co-hosted with
            </p>
            <div className="relative space-y-2">
              {event.collaborators.map((collab) => (
                <Link
                  key={collab.id}
                  to={`/collectives/${collab.slug ?? collab.id}`}
                  className="flex items-center gap-3 min-h-11 hover:opacity-80 active:scale-[0.98] transition-[opacity,transform] duration-150"
                >
                  {collab.cover_image_url ? (
                    <img src={collab.cover_image_url} alt={collab.name} className="w-9 h-9 rounded-lg object-cover shrink-0 shadow-sm" />
                  ) : (
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br text-white', accent.gradient)}>
                      <Users size={15} />
                    </div>
                  )}
                  <span className="text-sm font-bold text-primary-800">{collab.name}</span>
                  <ChevronRight size={14} className={cn('ml-auto shrink-0', accent.text)} />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Description (About this event) ── */}
        {event.description && (
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className={cn(
              'rounded-2xl p-4.5 relative overflow-hidden',
              'border shadow-[0_6px_24px_-6px_rgba(61,77,51,0.15)]',
              'bg-gradient-to-br from-white via-white to-primary-50/40',
              accent.border,
            )}
          >
            <h3 className={cn('text-sm font-bold mb-3', accent.text)}>About this event</h3>
            <div className="relative">
              <p
                className={cn(
                  'text-[15px] text-primary-600 leading-relaxed whitespace-pre-line',
                  !descriptionExpanded && 'line-clamp-4',
                )}
              >
                {event.description}
              </p>
              {event.description.length > 200 && !descriptionExpanded && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(true)}
                  className={cn(
                    'min-h-11 flex items-center justify-center text-caption font-bold mt-1.5',
                    'cursor-pointer select-none active:scale-[0.97] transition-transform duration-150',
                    accent.text,
                  )}
                >
                  Read more
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Capacity section (spots filled) ── */}
        <EventAttendees
          event={event}
          accent={accent}
          capacityText={capacityText}
          capacityPercent={capacityPercent}
          fadeUpVariants={shouldReduceMotion ? undefined : fadeUp}
        />

        {/* ── Event details pills (what_to_bring, terrain, difficulty, etc.) ── */}
        {(() => {
          // Extended event fields not yet in generated DB types
          const ext = event as unknown as {
            what_to_bring?: string
            what_to_wear?: string
            meeting_point?: string
            terrain?: string
            difficulty?: keyof typeof difficultyConfig
            wheelchair_access?: boolean
          }
          if (!ext.what_to_bring && !ext.what_to_wear && !ext.meeting_point && !ext.terrain && !ext.difficulty && !ext.wheelchair_access) return null
          return (
            <motion.div
              variants={shouldReduceMotion ? undefined : fadeUp}
              className={cn(
                'rounded-2xl p-4.5 relative overflow-hidden',
                'border shadow-[0_6px_24px_-6px_rgba(61,77,51,0.15)]',
                accent.border, accent.bg,
              )}
            >
              <div className={cn('absolute inset-0 opacity-20 bg-gradient-to-tl', accent.gradient)} aria-hidden="true" />
              <div className="absolute inset-0 bg-white/75" aria-hidden="true" />
              <h3 className={cn('relative text-sm font-bold mb-3', accent.text)}>Good to know</h3>
              <div className="relative space-y-3">
                {ext.meeting_point && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className={cn('shrink-0 mt-0.5', accent.text)} />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-primary-400/80">Meeting point</p>
                      <p className="text-sm font-medium text-primary-700">{ext.meeting_point}</p>
                    </div>
                  </div>
                )}
                {ext.what_to_bring && (
                  <div className="flex items-start gap-2.5">
                    <Backpack size={15} className={cn('shrink-0 mt-0.5', accent.text)} />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-primary-400/80">What to bring</p>
                      <p className="text-sm font-medium text-primary-700">{ext.what_to_bring}</p>
                    </div>
                  </div>
                )}
                {ext.what_to_wear && (
                  <div className="flex items-start gap-2.5">
                    <Shirt size={15} className={cn('shrink-0 mt-0.5', accent.text)} />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-primary-400/80">What to wear</p>
                      <p className="text-sm font-medium text-primary-700">{ext.what_to_wear}</p>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {ext.difficulty && (() => {
                    const d = difficultyConfig[ext.difficulty!]
                    if (!d) return null
                    const Icon = d.icon
                    return (
                      <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold', d.color)}>
                        <Icon size={13} />
                        {d.label}
                      </span>
                    )
                  })()}
                  {ext.terrain && (
                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold', accent.bg, accent.text)}>
                      <Mountain size={13} />
                      {ext.terrain}
                    </span>
                  )}
                  {ext.wheelchair_access && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-info-100 text-info-700">
                      <Accessibility size={13} />
                      Wheelchair accessible
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* ── Action buttons row ── */}
        <EventActions
          past={past}
          fadeUpVariants={shouldReduceMotion ? undefined : fadeUp}
          onCalendarOpen={() => setShowCalendarSheet(true)}
          onShare={handleShare}
        />

        {/* Leader tools moved to top of content area */}

        {/* ── Post-event: Impact Summary ── */}
        {past && event.impact && (
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className={cn(
              'rounded-2xl p-4.5 space-y-3.5 relative overflow-hidden',
              'border shadow-[0_6px_24px_-6px_rgba(61,77,51,0.15)]',
              accent.border,
            )}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-[0.12]', accent.gradient)} aria-hidden="true" />
            <div className="absolute inset-0 bg-white/85" aria-hidden="true" />
            <div className="relative flex items-center gap-2">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br text-white', accent.gradient)}>
                <Leaf size={14} />
              </div>
              <h3 className={cn('text-sm font-bold', accent.text)}>Impact Summary</h3>
            </div>
            <div className="relative grid grid-cols-2 gap-3">
              {(event.impact.trees_planted ?? 0) > 0 && (
                <StatCard
                  label="Trees Planted"
                  value={event.impact.trees_planted ?? 0}
                  icon={<TreePine size={18} />}
                />
              )}
              {(event.impact.rubbish_kg ?? 0) > 0 && (
                <StatCard
                  label="Rubbish (kg)"
                  value={event.impact.rubbish_kg ?? 0}
                  icon={<Trash2 size={18} />}
                />
              )}
              {(event.impact.hours_total ?? 0) > 0 && (
                <StatCard
                  label="Volunteer Hours"
                  value={event.impact.hours_total ?? 0}
                  icon={<Clock size={18} />}
                />
              )}
              {(event.impact.area_restored_sqm ?? 0) > 0 && (
                <StatCard
                  label="Area (sqm)"
                  value={event.impact.area_restored_sqm ?? 0}
                  icon={<MapPin size={18} />}
                />
              )}
              {(event.impact.native_plants ?? 0) > 0 && (
                <StatCard
                  label="Native Plants"
                  value={event.impact.native_plants ?? 0}
                  icon={<Leaf size={18} />}
                />
              )}
              {(event.impact.wildlife_sightings ?? 0) > 0 && (
                <StatCard
                  label="Wildlife Sightings"
                  value={event.impact.wildlife_sightings ?? 0}
                  icon={<Eye size={18} />}
                />
              )}
              {(event.impact.invasive_weeds_pulled ?? 0) > 0 && (
                <StatCard
                  label="Weeds Pulled"
                  value={event.impact.invasive_weeds_pulled ?? 0}
                  icon={<Sprout size={18} />}
                />
              )}
              {(event.impact.coastline_cleaned_m ?? 0) > 0 && (
                <StatCard
                  label="Coastline (m)"
                  value={event.impact.coastline_cleaned_m ?? 0}
                  icon={<Waves size={18} />}
                />
              )}
              {/* Custom metrics from JSONB */}
              {event.impact.custom_metrics &&
                typeof event.impact.custom_metrics === 'object' &&
                !Array.isArray(event.impact.custom_metrics) &&
                Object.entries(event.impact.custom_metrics as Record<string, unknown>)
                  .filter(([, v]) => (Number(v) || 0) > 0)
                  .map(([key, v]) => (
                    <StatCard
                      key={key}
                      label={metricLabels[key] ?? key.replace(/_/g, ' ')}
                      value={Number(v) || 0}
                      icon={<Sparkles size={18} />}
                    />
                  ))}
            </div>
          </motion.div>
        )}

        {/* ── Post-event: survey prompt ── */}
        {past && userStatus === 'attended' && (
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className={cn(
              'rounded-2xl p-5 relative overflow-hidden',
              'border shadow-[0_6px_24px_-6px_rgba(61,77,51,0.15)]',
              accent.border,
            )}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-20', accent.gradient)} aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-transparent" aria-hidden="true" />
            <p className={cn('relative text-sm font-bold', accent.text)}>How was the event?</p>
            <p className="relative text-caption text-primary-500 mt-1">
              Share your feedback to help us improve future events.
            </p>
            <Button
              variant="primary"
              size="sm"
              className={cn('relative mt-3 bg-gradient-to-r shadow-md', accent.gradient, accent.glow)}
              onClick={() => navigate(`/events/${event.id}/survey`)}
            >
              Give Feedback
            </Button>
          </motion.div>
        )}
      </motion.div>
      </div>

      {/* Cancel confirmation */}
      <ConfirmationSheet
        open={showCancelSheet}
        onClose={() => setShowCancelSheet(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Registration?"
        description="You'll lose your spot. If the event is full, you'll need to join the waitlist to re-register."
        confirmLabel="Yes, Cancel"
        variant="warning"
      />

      {/* QR Code sheet */}
      <BottomSheet
        open={showQrSheet}
        onClose={() => setShowQrSheet(false)}
        snapPoints={[0.6]}
      >
        <div className="flex flex-col items-center py-6">
          <div className="w-56 h-56 rounded-2xl bg-white shadow-md flex items-center justify-center p-4">
            <QRCodeSVG
              value={`coexist://event/${event.id}`}
              size={192}
              level="M"
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
          </div>
          <p className="text-sm font-medium text-primary-800 mt-4 text-center">
            {event.title}
          </p>
          <p className="text-caption text-primary-400 mt-1">
            Show this to participants to scan
          </p>
          <div className="mt-3 px-4 py-2 rounded-lg bg-white">
            <p className="text-[11px] uppercase tracking-wider text-primary-400 text-center">Manual code</p>
            <p className="text-lg font-heading font-bold text-primary-800 tracking-[0.3em] text-center">
              {event.id.replace(/-/g, '').slice(0, 6).toUpperCase()}
            </p>
          </div>
        </div>
      </BottomSheet>

      {/* Calendar sheet */}
      <BottomSheet
        open={showCalendarSheet}
        onClose={() => setShowCalendarSheet(false)}
        snapPoints={[0.35]}
      >
        <h3 className="font-heading text-base font-semibold text-primary-800 mb-4">
          Add to Calendar
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              downloadIcsFile(event)
              setShowCalendarSheet(false)
            }}
            className="flex items-center gap-3 w-full min-h-11 px-4 py-3 rounded-xl hover:bg-primary-50 cursor-pointer select-none text-left active:scale-[0.97] transition-transform duration-150"
          >
            <CalendarPlus size={20} className="text-primary-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary-800">Download .ics file</p>
              <p className="text-caption text-primary-400">Works with Apple Calendar & others</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              window.open(getGoogleCalendarUrl(event), '_blank')
              setShowCalendarSheet(false)
            }}
            className="flex items-center gap-3 w-full min-h-11 px-4 py-3 rounded-xl hover:bg-primary-50 cursor-pointer select-none text-left active:scale-[0.97] transition-transform duration-150"
          >
            <Calendar size={20} className="text-primary-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary-800">Google Calendar</p>
              <p className="text-caption text-primary-400">Opens in your browser</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Cancel event sheet */}
      <BottomSheet
        open={showCancelEventSheet}
        onClose={() => setShowCancelEventSheet(false)}
        snapPoints={[0.5]}
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-primary-800">
              Cancel Event
            </h3>
            <p className="text-caption text-primary-400 mt-1">
              All registered and invited attendees will be notified. This cannot be undone.
            </p>
          </div>
          <Input
            type="textarea"
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowCancelEventSheet(false)}
            >
              Keep Event
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-error-600 hover:bg-error-700"
              loading={cancelEventMutation.isPending}
              onClick={handleCancelEvent}
            >
              Cancel Event
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Invite / Remind sheet */}
      <BottomSheet
        open={showInviteSheet}
        onClose={() => setShowInviteSheet(false)}
        snapPoints={[0.55]}
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br',
                alreadyInvited ? 'from-sky-500 to-sky-600' : 'from-amber-500 to-amber-600',
              )}>
                {alreadyInvited ? <Bell size={15} className="text-white" /> : <Send size={15} className="text-white" />}
              </div>
              <h3 className="font-heading text-base font-semibold text-primary-800">
                {alreadyInvited ? 'Send Reminder' : 'Invite Collective'}
              </h3>
            </div>
            <p className="text-caption text-primary-400 mt-1">
              {alreadyInvited
                ? 'This will post a rich event card to the collective chat as a reminder.'
                : 'This will invite all members, send notifications, and post to the collective chat.'}
            </p>
          </div>

          {/* Event preview */}
          <div className={cn(
            'rounded-xl p-3.5 border relative overflow-hidden',
            accent.border,
          )}>
            <div className={cn('absolute inset-0 opacity-[0.06] bg-gradient-to-br', accent.gradient)} aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              {event?.cover_image_url ? (
                <img src={event.cover_image_url} alt={event.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br text-white', accent.gradient)}>
                  <Calendar size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-primary-800 line-clamp-2">{event?.title}</p>
                <p className="text-xs text-primary-500 mt-0.5">
                  {event ? formatEventDate(event.date_start) : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Custom message */}
          <Input
            type="textarea"
            label="Message"
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="Add a personalised message..."
            rows={3}
          />

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowInviteSheet(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className={cn('flex-1 bg-gradient-to-r shadow-md', accent.gradient, accent.glow)}
              loading={inviteCollectiveMutation.isPending}
              onClick={handleSendInvite}
              icon={alreadyInvited ? <Bell size={15} /> : <Send size={15} />}
            >
              {alreadyInvited ? 'Send Reminder' : 'Invite All'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Check-in sheet */}
      {event && (
        <CheckInSheet
          open={showCheckInSheet}
          onClose={() => setShowCheckInSheet(false)}
          eventId={event.id}
          eventTitle={event.title}
          collectiveName={event.collectives?.name}
        />
      )}
    </Page>
  )
}

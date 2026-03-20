import { useState, useMemo, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Navigation,
  Accessibility,
  Mountain,
  Shirt,
  Backpack,
  TreePine,
  Trash2,
  Waves,
  Eye,
  Leaf,
  CloudSun,
  Car,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Mail,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/hooks/use-auth'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import {
  useEventDetail,
  useRegisterForEvent,
  useCancelRegistration,
  formatEventDate,
  formatEventTime,
  getCountdown,
  getEventDuration,
  isPastEvent,
  ACTIVITY_TYPE_LABELS,
  downloadIcsFile,
  getGoogleCalendarUrl,
} from '@/hooks/use-events'
import {
  Page,
  Header,
  Button,
  Avatar,
  Badge,
  Skeleton,
  EmptyState,
  ConfirmationSheet,
  BottomSheet,
  CountUp,
  PhotoGrid,
  StatCard,
} from '@/components'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import { MapView } from '@/components'

/* ------------------------------------------------------------------ */
/*  Activity badge map                                                 */
/* ------------------------------------------------------------------ */

const activityToBadge: Record<string, 'tree-planting' | 'beach-cleanup' | 'habitat' | 'wildlife' | 'education' | 'monitoring' | 'restoration'> = {
  tree_planting: 'tree-planting',
  beach_cleanup: 'beach-cleanup',
  habitat_restoration: 'habitat',
  nature_walk: 'wildlife',
  education: 'education',
  wildlife_survey: 'wildlife',
  seed_collecting: 'tree-planting',
  weed_removal: 'restoration',
  waterway_cleanup: 'beach-cleanup',
  community_garden: 'restoration',
  other: 'education',
}

/* ------------------------------------------------------------------ */
/*  Difficulty config                                                  */
/* ------------------------------------------------------------------ */

const difficultyConfig = {
  easy: { label: 'Easy', color: 'text-green-600 bg-green-100' },
  moderate: { label: 'Moderate', color: 'text-amber-600 bg-amber-100' },
  challenging: { label: 'Challenging', color: 'text-red-600 bg-red-100' },
}

/* ------------------------------------------------------------------ */
/*  Share helper                                                       */
/* ------------------------------------------------------------------ */

async function shareEvent(title: string, url: string) {
  if (Capacitor.isNativePlatform() && navigator.share) {
    try {
      await navigator.share({ title, text: `Check out this event: ${title}`, url })
    } catch {
      // User cancelled
    }
  } else if (navigator.share) {
    await navigator.share({ title, url })
  } else {
    await navigator.clipboard.writeText(url)
  }
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function EventDetailSkeleton() {
  return (
    <Page header={<Header title="" back />}>
      <div>
        <Skeleton variant="image" className="rounded-none" />
        <div className="px-4 pt-4 space-y-3">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={2} />
          <div className="flex gap-3">
            <Skeleton variant="stat-card" className="flex-1" />
            <Skeleton variant="stat-card" className="flex-1" />
          </div>
          <Skeleton variant="text" count={4} />
        </div>
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ */
/*  Expandable Section                                                 */
/* ------------------------------------------------------------------ */

function ExpandableSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="border-b border-primary-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex items-center justify-between w-full py-3 px-4',
          'text-left cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
        )}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-primary-800">
          <span className="flex items-center justify-center text-primary-400" aria-hidden="true">
            {icon}
          </span>
          {title}
        </span>
        <ChevronDown
          size={18}
          className={cn(
            'text-primary-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
        }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 text-sm text-primary-400 leading-relaxed">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Info Row                                                           */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode
  label: string
  value: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-primary-400 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-caption text-primary-400">{label}</p>
        <p className="text-sm font-medium text-primary-800 break-words">{value}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-caption font-semibold text-primary-400 hover:text-primary-400 cursor-pointer shrink-0 mt-1"
          aria-label={action.label}
        >
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
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading } = useEventDetail(id)
  const collectiveRole = useCollectiveRole(event?.collective_id)
  const registerMutation = useRegisterForEvent()
  const cancelMutation = useCancelRegistration()

  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [showQrSheet, setShowQrSheet] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const past = event ? isPastEvent(event) : false
  const isAtCapacity = event?.capacity ? event.registration_count >= event.capacity : false
  const userStatus = event?.user_registration?.status ?? null
  const isLeaderOrAbove = collectiveRole.isCoLeader || collectiveRole.isLeader

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

  const handleShare = useCallback(() => {
    if (!event) return
    shareEvent(event.title, `${window.location.origin}/events/${event.id}`)
  }, [event])

  if (isLoading) return <EventDetailSkeleton />
  if (!event) {
    return (
      <Page header={<Header title="Event" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="This event may have been removed or the link is incorrect."
          action={{ label: 'Browse Events', to: '/explore' }}
        />
      </Page>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Registration CTA                                                 */
  /* ---------------------------------------------------------------- */

  function renderCta() {
    if (event.status === 'cancelled') {
      return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium">
          <XCircle size={18} />
          This event has been cancelled
        </div>
      )
    }

    if (past) {
      return null
    }

    if (userStatus === 'registered' || userStatus === 'attended') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white text-primary-400 text-sm font-semibold">
            <CheckCircle2 size={18} />
            You're going!
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
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold">
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
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
            <Mail size={18} />
            You've been invited
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={registerMutation.isPending}
            onClick={() => registerMutation.mutate({ eventId: event.id })}
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
      >
        {isAtCapacity ? 'Join Waitlist' : 'Register'}
      </Button>
    )
  }

  return (
    <Page
      header={
        <Header
          title={event.title}
          back
          transparent={!!event.cover_image_url}
          rightActions={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full cursor-pointer',
                  event.cover_image_url ? 'text-white/90 hover:bg-white/20' : 'text-primary-400 hover:bg-primary-50',
                )}
                aria-label="Share event"
              >
                <Share2 size={18} />
              </button>
            </div>
          }
        />
      }
      footer={renderCta()}
    >
      {/* Hero Image */}
      {event.cover_image_url && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
            aria-hidden="true"
          />

          {/* Activity badge on image */}
          <div className="absolute top-3 right-3">
            <Badge
              variant="activity"
              activity={activityToBadge[event.activity_type] ?? 'education'}
              size="md"
            >
              {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
            </Badge>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="font-heading text-xl font-bold text-white leading-tight">
              {event.title}
            </h1>
            {!past && userStatus === 'registered' && (
              <p className="text-sm font-medium text-primary-300 mt-1">
                {getCountdown(event.date_start)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* If no cover image, show title normally */}
      {!event.cover_image_url && (
        <div className="px-4 pt-4">
          <div className="flex items-start gap-2">
            <Badge
              variant="activity"
              activity={activityToBadge[event.activity_type] ?? 'education'}
              size="md"
            >
              {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
            </Badge>
          </div>
          <h1 className="font-heading text-xl font-bold text-primary-800 mt-2">
            {event.title}
          </h1>
        </div>
      )}

      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Key info rows */}
        <div className="space-y-0.5">
          <InfoRow
            icon={<Calendar size={16} />}
            label="Date & Time"
            value={`${formatEventDate(event.date_start)}${event.date_end ? ` — ${formatEventTime(event.date_end)}` : ''}`}
          />
          {event.date_end && (
            <InfoRow
              icon={<Clock size={16} />}
              label="Duration"
              value={getEventDuration(event.date_start, event.date_end)}
            />
          )}
          {event.address && (
            <InfoRow
              icon={<MapPin size={16} />}
              label="Location"
              value={event.address}
              action={{ label: 'Directions', onClick: handleGetDirections }}
            />
          )}
        </div>

        {/* Location map */}
        {event.address && (() => {
          const pos = parseLocationPoint(event.location_point)
          if (!pos) return null
          return (
            <MapView
              center={pos}
              zoom={15}
              markers={[{ id: event.id, position: pos, variant: 'event', label: event.title }]}
              interactive={false}
              aria-label={`${event.title} location`}
              className="aspect-video rounded-2xl"
            />
          )
        })()}

        {/* Countdown chip */}
        {!past && userStatus === 'registered' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-primary-400 text-sm font-medium">
            <Clock size={16} />
            {getCountdown(event.date_start)}
          </div>
        )}

        {/* Collective */}
        {event.collectives && (
          <Link
            to={`/collectives/${event.collectives.slug ?? event.collectives.id}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-primary-50 transition-colors duration-150"
          >
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-400 shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-800 truncate">
                {event.collectives.name}
              </p>
              <p className="text-caption text-primary-400">Hosting Collective</p>
            </div>
            <ChevronRight size={18} className="text-primary-400 shrink-0" />
          </Link>
        )}

        {/* Capacity bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-800">{capacityText}</span>
            {event.capacity && (
              <span className={cn(
                'text-caption font-semibold',
                capacityPercent >= 90 ? 'text-red-600' : capacityPercent >= 70 ? 'text-amber-600' : 'text-primary-400',
              )}>
                {Math.round(capacityPercent)}%
              </span>
            )}
          </div>
          {event.capacity && (
            <div className="h-2 rounded-full bg-white overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  capacityPercent >= 90 ? 'bg-red-500' : capacityPercent >= 70 ? 'bg-amber-500' : 'bg-primary-500',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${capacityPercent}%` }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          )}
          {/* Attendee avatars */}
          {event.attendees.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex -space-x-2">
                {event.attendees.slice(0, 6).map((a) => (
                  <Avatar
                    key={a.id}
                    src={a.avatar_url ?? undefined}
                    name={a.display_name ?? 'User'}
                    size="xs"
                    className="ring-2 ring-white"
                  />
                ))}
              </div>
              {event.registration_count > 6 && (
                <span className="text-caption text-primary-400 ml-1">
                  +{event.registration_count - 6} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h3 className="text-sm font-semibold text-primary-800 mb-2">About this event</h3>
            <div className="relative">
              <p
                className={cn(
                  'text-sm text-primary-400 leading-relaxed whitespace-pre-line',
                  !descriptionExpanded && 'line-clamp-4',
                )}
              >
                {event.description}
              </p>
              {event.description.length > 200 && !descriptionExpanded && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(true)}
                  className="text-caption font-semibold text-primary-400 hover:text-primary-400 mt-1 cursor-pointer"
                >
                  Read more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expandable details sections */}
        <div className="rounded-xl border border-primary-100 overflow-hidden">
          <ExpandableSection title="What to Bring" icon={<Backpack size={16} />}>
            <p className="text-primary-400 italic">
              The leader will share what to bring closer to the event.
            </p>
          </ExpandableSection>

          <ExpandableSection title="What to Expect" icon={<Eye size={16} />}>
            <p className="text-primary-400 italic">
              Details about what to expect will be shared closer to the event.
            </p>
          </ExpandableSection>

          <ExpandableSection title="What to Wear" icon={<Shirt size={16} />}>
            <p className="text-primary-400 italic">
              Wear comfortable clothes suitable for outdoor activities.
            </p>
          </ExpandableSection>

          <ExpandableSection title="Accessibility" icon={<Accessibility size={16} />}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mountain size={14} className="text-primary-400" />
                <span>Terrain info will be updated by the leader</span>
              </div>
            </div>
          </ExpandableSection>
        </div>

        {/* Weather placeholder */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 p-4">
          <div className="flex items-center gap-3">
            <CloudSun size={28} className="text-sky-500" />
            <div>
              <p className="text-sm font-semibold text-primary-800">Weather Forecast</p>
              <p className="text-caption text-primary-400">
                Weather info will be available closer to the event
              </p>
            </div>
          </div>
        </div>

        {/* Carpooling placeholder */}
        <div className="rounded-xl bg-white p-4">
          <div className="flex items-center gap-3">
            <Car size={20} className="text-primary-400" />
            <div>
              <p className="text-sm font-semibold text-primary-800">Need a lift?</p>
              <p className="text-caption text-primary-400">
                Carpooling coordination coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<CalendarPlus size={16} />}
            onClick={() => setShowCalendarSheet(true)}
            className="flex-1"
          >
            Add to Calendar
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Share2 size={16} />}
            onClick={handleShare}
            className="flex-1"
          >
            Share
          </Button>
        </div>

        {/* Leader actions */}
        {isLeaderOrAbove && (
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-semibold text-primary-800">Leader Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/events/${event.id}/day`)}
              >
                Event Day
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowQrSheet(true)}
              >
                Show QR
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/events/${event.id}/impact`)}
              >
                Log Impact
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => navigate(`/events/${event.id}/edit`)}
              >
                Edit Event
              </Button>
            </div>
          </div>
        )}

        {/* Post-event: Impact Summary */}
        {past && event.impact && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary-800">Impact Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {event.impact.trees_planted > 0 && (
                <StatCard
                  label="Trees Planted"
                  value={event.impact.trees_planted}
                  icon={<TreePine size={18} />}
                />
              )}
              {event.impact.rubbish_kg > 0 && (
                <StatCard
                  label="Rubbish (kg)"
                  value={event.impact.rubbish_kg}
                  icon={<Trash2 size={18} />}
                />
              )}
              {event.impact.coastline_cleaned_m > 0 && (
                <StatCard
                  label="Coastline (m)"
                  value={event.impact.coastline_cleaned_m}
                  icon={<Waves size={18} />}
                />
              )}
              {event.impact.hours_total > 0 && (
                <StatCard
                  label="Volunteer Hours"
                  value={event.impact.hours_total}
                  icon={<Clock size={18} />}
                />
              )}
              {event.impact.native_plants > 0 && (
                <StatCard
                  label="Native Plants"
                  value={event.impact.native_plants}
                  icon={<Leaf size={18} />}
                />
              )}
              {event.impact.wildlife_sightings > 0 && (
                <StatCard
                  label="Wildlife Sightings"
                  value={event.impact.wildlife_sightings}
                  icon={<Eye size={18} />}
                />
              )}
            </div>
          </div>
        )}

        {/* Post-event: survey prompt */}
        {past && userStatus === 'attended' && (
          <div className="rounded-xl bg-gradient-to-br from-white to-white p-4">
            <p className="text-sm font-semibold text-primary-800">How was the event?</p>
            <p className="text-caption text-primary-400 mt-1">
              Share your feedback to help us improve future events.
            </p>
            <Button variant="primary" size="sm" className="mt-3">
              Give Feedback
            </Button>
          </div>
        )}
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
          <div className="w-56 h-56 rounded-2xl bg-white border-2 border-primary-200 flex items-center justify-center shadow-md p-4">
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
            <p className="text-[10px] uppercase tracking-wider text-primary-400 text-center">Manual code</p>
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
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-primary-50 transition-colors cursor-pointer text-left"
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
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-primary-50 transition-colors cursor-pointer text-left"
          >
            <Calendar size={20} className="text-primary-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary-800">Google Calendar</p>
              <p className="text-caption text-primary-400">Opens in your browser</p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </Page>
  )
}

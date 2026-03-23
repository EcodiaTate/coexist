import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  QrCode,
  Check,
  CheckCheck,
  Users,
  Clock,
  Search,
  UserCheck,
  UserX,
  UserPlus,
  ChevronRight,
  Phone,
  AlertTriangle,
  Accessibility,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  useEventDetail,
  useEventAttendees,
  useCheckIn,
  useBulkCheckIn,
  usePromoteFromWaitlist,
  formatEventDate,
} from '@/hooks/use-events'
import type { AttendeeWithStatus } from '@/hooks/use-events'
import {
  Page,
  Header,
  Button,
  Avatar,
  Skeleton,
  EmptyState,
  ConfirmationSheet,
  BottomSheet,
} from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { ProfileModal } from '@/components/profile-modal'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  QR Code Display Component                                          */
/* ------------------------------------------------------------------ */

function QrCodeDisplay({ eventId, title }: { eventId: string; title: string }) {
  const checkInCode = eventId.replace(/-/g, '').slice(0, 6).toUpperCase()

  return (
    <div className="flex flex-col items-center py-6">
      <div className="w-56 h-56 rounded-2xl bg-white shadow-md flex items-center justify-center p-4">
        <QRCodeSVG
          value={`coexist://event/${eventId}`}
          size={192}
          level="M"
          bgColor="#ffffff"
          fgColor="#1a1a1a"
        />
      </div>
      <p className="text-sm font-medium text-primary-800 mt-4 text-center">
        {title}
      </p>
      <p className="text-caption text-primary-400 mt-1">
        Show this to participants to scan
      </p>
      <div className="mt-3 px-4 py-2 rounded-lg bg-white">
        <p className="text-[11px] uppercase tracking-wider text-primary-400 text-center">Manual code</p>
        <p className="text-lg font-heading font-bold text-primary-800 tracking-[0.3em] text-center">
          {checkInCode}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Attendee Row                                                       */
/* ------------------------------------------------------------------ */

function AttendeeRow({
  attendee,
  onCheckIn,
  onPromote,
  onViewDetails,
  isPending,
  isPromoting,
}: {
  attendee: AttendeeWithStatus
  onCheckIn: () => void
  onPromote?: () => void
  onViewDetails: () => void
  isPending: boolean
  isPromoting?: boolean
}) {
  const isCheckedIn = attendee.status === 'attended'
  const isWaitlisted = attendee.status === 'waitlisted'
  const hasEmergencyInfo = !!(attendee.profiles?.emergency_contact_name || attendee.profiles?.accessibility_requirements)

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 cursor-pointer rounded-xl mb-1.5',
        'transition-[color,background-color,box-shadow] duration-200',
        isCheckedIn
          ? 'bg-gradient-to-r from-success-50 to-moss-50/50 ring-1 ring-success-200/50'
          : isWaitlisted
            ? 'bg-gradient-to-r from-warning-50 to-warning-50/30 ring-1 ring-warning-200/50'
            : 'bg-gradient-to-r from-primary-50 to-moss-50/60 ring-1 ring-primary-200/50',
        'active:opacity-80',
      )}
      onClick={onViewDetails}
      role="button"
      tabIndex={0}
    >
      <Avatar
        src={attendee.profiles?.avatar_url ?? undefined}
        name={attendee.profiles?.display_name ?? 'Unknown'}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-primary-800 truncate">
            {attendee.profiles?.display_name ?? 'Unknown User'}
          </p>
          {hasEmergencyInfo && (
            <AlertTriangle size={12} className="text-warning-500 shrink-0" aria-label="Has safety info" />
          )}
        </div>
        <p className="text-caption text-primary-400">
          {isCheckedIn
            ? `Checked in ${attendee.checked_in_at ? new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date(attendee.checked_in_at)) : ''}`
            : isWaitlisted
              ? 'Waitlisted'
              : 'Registered'}
        </p>
      </div>

      {isCheckedIn ? (
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-success-100 text-success-600">
          <Check size={18} />
        </span>
      ) : isWaitlisted && onPromote ? (
        <Button
          variant="secondary"
          size="sm"
          icon={<UserPlus size={14} />}
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPromote() }}
          loading={isPromoting}
        >
          Promote
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          icon={<UserCheck size={14} />}
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCheckIn() }}
          loading={isPending}
        >
          Check In
        </Button>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Attendee Safety Details Sheet                                       */
/* ------------------------------------------------------------------ */

function AttendeeSafetySheet({
  attendee,
  open,
  onClose,
}: {
  attendee: AttendeeWithStatus | null
  open: boolean
  onClose: () => void
}) {
  if (!attendee?.profiles) return null

  const p = attendee.profiles

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.55]}>
      <div className="px-5 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar
            src={p.avatar_url ?? undefined}
            name={p.display_name ?? 'Unknown'}
            size="lg"
          />
          <div>
            <p className="font-heading text-lg font-bold text-primary-800">
              {p.display_name ?? 'Unknown User'}
            </p>
            {(p.age || p.gender) && (
              <p className="text-sm text-primary-400">
                {[p.age && `Age ${p.age}`, p.gender].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Phone */}
        {p.phone && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-50/60">
            <Phone size={16} className="text-primary-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider">Phone</p>
              <a href={`tel:${p.phone}`} className="text-sm font-medium text-primary-800 underline">
                {p.phone}
              </a>
            </div>
          </div>
        )}

        {/* Accessibility */}
        {p.accessibility_requirements && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-50">
            <Accessibility size={16} className="text-sky-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Accessibility Needs</p>
              <p className="text-sm text-primary-800 mt-0.5">{p.accessibility_requirements}</p>
            </div>
          </div>
        )}

        {/* Emergency contact */}
        <div className="p-3 rounded-lg bg-warning-50 border border-warning-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-warning-600" />
            <p className="text-xs font-semibold text-warning-700 uppercase tracking-wider">
              Emergency Contact
            </p>
          </div>
          {p.emergency_contact_name ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-primary-800">
                {p.emergency_contact_name}
                {p.emergency_contact_relationship && (
                  <span className="text-primary-400 font-normal"> ({p.emergency_contact_relationship})</span>
                )}
              </p>
              {p.emergency_contact_phone && (
                <a
                  href={`tel:${p.emergency_contact_phone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-700 underline"
                >
                  <Phone size={14} />
                  {p.emergency_contact_phone}
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-warning-600 italic">No emergency contact provided</p>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function EventDayPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading: eventLoading } = useEventDetail(eventId)
  const { data: attendees, isLoading: attendeesLoading } = useEventAttendees(eventId)

  const checkIn = useCheckIn()
  const bulkCheckIn = useBulkCheckIn()
  const promote = usePromoteFromWaitlist()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [checkingInUserId, setCheckingInUserId] = useState<string | null>(null)
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null)
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeWithStatus | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  const filteredAttendees = useMemo(() => {
    if (!attendees) return []
    if (!searchQuery.trim()) return attendees
    const q = searchQuery.toLowerCase()
    return attendees.filter((a) =>
      (a.profiles?.display_name ?? '').toLowerCase().includes(q),
    )
  }, [attendees, searchQuery])

  const stats = useMemo(() => {
    if (!attendees) return { registered: 0, checkedIn: 0, waitlisted: 0 }
    return {
      registered: attendees.filter((a) => a.status === 'registered' || a.status === 'attended').length,
      checkedIn: attendees.filter((a) => a.status === 'attended').length,
      waitlisted: attendees.filter((a) => a.status === 'waitlisted').length,
    }
  }, [attendees])

  const handleCheckIn = useCallback(
    (userId: string) => {
      if (!eventId) return
      setCheckingInUserId(userId)
      checkIn.mutate(
        { eventId, userId },
        { onSettled: () => setCheckingInUserId(null) },
      )
    },
    [eventId, checkIn],
  )

  const handleBulkCheckIn = useCallback(() => {
    if (!eventId) return
    bulkCheckIn.mutate(eventId)
    setShowBulkConfirm(false)
  }, [eventId, bulkCheckIn])

  const handlePromote = useCallback(
    (userId: string) => {
      if (!eventId) return
      setPromotingUserId(userId)
      promote.mutate(
        { eventId, userId },
        { onSettled: () => setPromotingUserId(null) },
      )
    },
    [eventId, promote],
  )

  const isLoading = eventLoading || attendeesLoading
  const showLoading = useDelayedLoading(isLoading)

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Event Day" back />}>
        <div className="pt-4 space-y-4">
          <Skeleton variant="title" />
          <div className="flex gap-3">
            <Skeleton variant="stat-card" className="flex-1" />
            <Skeleton variant="stat-card" className="flex-1" />
          </div>
          <Skeleton variant="list-item" count={5} />
        </div>
      </Page>
    )
  }
  if (!event) {
    return (
      <Page swipeBack header={<Header title="Event Day" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="This event could not be loaded."
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  return (
    <Page
      swipeBack
      header={<Header title="Event Day" back />}
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<QrCode size={18} />}
            onClick={() => setShowQr(true)}
            className="flex-1"
          >
            Show QR
          </Button>
          <Button
            variant="primary"
            icon={<CheckCheck size={18} />}
            onClick={() => setShowBulkConfirm(true)}
            className="flex-1"
            disabled={stats.checkedIn === stats.registered}
          >
            Mark All Present
          </Button>
        </div>
      }
    >
      <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="pt-4 pb-6">
        {/* Event header */}
        <motion.div variants={fadeUp} className="mb-4">
          <h2 className="font-heading text-lg font-bold text-primary-800">
            {event.title}
          </h2>
          <p className="text-caption text-primary-400 mt-0.5">
            {formatEventDate(event.date_start)}
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xl font-bold text-primary-400">{stats.registered}</p>
            <p className="text-caption text-primary-400">Registered</p>
          </div>
          <div className="rounded-xl bg-success-50 p-3 text-center">
            <p className="text-xl font-bold text-success-700">{stats.checkedIn}</p>
            <p className="text-caption text-success-600">Checked In</p>
          </div>
          <div className="rounded-xl bg-warning-50 p-3 text-center">
            <p className="text-xl font-bold text-warning-700">{stats.waitlisted}</p>
            <p className="text-caption text-warning-600">Waitlisted</p>
          </div>
        </motion.div>

        {/* Live count bar */}
        {stats.registered > 0 && (
          <motion.div variants={fadeUp} className="mb-5">
            <div className="flex items-center justify-between text-caption mb-1">
              <span className="text-primary-400">Check-in progress</span>
              <span className="font-semibold text-primary-800">
                {stats.checkedIn}/{stats.registered}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-success-500"
                initial={{ width: 0 }}
                animate={{ width: `${stats.registered > 0 ? (stats.checkedIn / stats.registered) * 100 : 0}%` }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}

        {/* Search */}
        <motion.div variants={fadeUp} className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full rounded-lg bg-primary-50/50',
              'pl-10 pr-4 py-2.5 text-[16px]',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
              'placeholder:text-primary-400',
            )}
          />
        </motion.div>

        {/* Attendee list */}
        <motion.div variants={fadeUp}>
        {filteredAttendees.length === 0 ? (
          <EmptyState
            illustration="search"
            title="No attendees found"
            description={searchQuery ? 'Try a different search' : 'No one has registered yet'}
          />
        ) : (
          <div className="space-y-0">
            {filteredAttendees.map((attendee) => (
              <AttendeeRow
                key={attendee.user_id}
                attendee={attendee}
                onCheckIn={() => handleCheckIn(attendee.user_id)}
                onPromote={attendee.status === 'waitlisted' ? () => handlePromote(attendee.user_id) : undefined}
                onViewDetails={() => setProfileUserId(attendee.user_id)}
                isPending={checkingInUserId === attendee.user_id}
                isPromoting={promotingUserId === attendee.user_id}
              />
            ))}
          </div>
        )}
        </motion.div>

        {/* Post-event action */}
        <motion.div variants={fadeUp} className="mt-6">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate(`/events/${eventId}/impact`)}
            icon={<ChevronRight size={16} />}
          >
            Log Impact Data
          </Button>
        </motion.div>
      </motion.div>

      {/* QR Code bottom sheet */}
      <BottomSheet
        open={showQr}
        onClose={() => setShowQr(false)}
        snapPoints={[0.6]}
      >
        <QrCodeDisplay eventId={event.id} title={event.title} />
      </BottomSheet>

      {/* Bulk check-in confirmation */}
      <ConfirmationSheet
        open={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkCheckIn}
        title="Mark All Present?"
        description={`This will check in ${stats.registered - stats.checkedIn} remaining registered attendees.`}
        confirmLabel="Mark All Present"
        variant="warning"
      />

      {/* Attendee safety details */}
      <AttendeeSafetySheet
        attendee={selectedAttendee}
        open={!!selectedAttendee}
        onClose={() => setSelectedAttendee(null)}
      />

      {/* Profile modal */}
      <ProfileModal userId={profileUserId} open={!!profileUserId} onClose={() => setProfileUserId(null)} />
    </Page>
  )
}

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
  ChevronRight,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  useEventDetail,
  useEventAttendees,
  useCheckIn,
  useBulkCheckIn,
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
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  QR Code Display Component                                          */
/* ------------------------------------------------------------------ */

function QrCodeDisplay({ eventId, title }: { eventId: string; title: string }) {
  const checkInCode = eventId.replace(/-/g, '').slice(0, 6).toUpperCase()

  return (
    <div className="flex flex-col items-center py-6">
      <div className="w-56 h-56 rounded-2xl bg-white border-2 border-primary-200 flex items-center justify-center shadow-md p-4">
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
        <p className="text-[10px] uppercase tracking-wider text-primary-400 text-center">Manual code</p>
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
  isPending,
}: {
  attendee: AttendeeWithStatus
  onCheckIn: () => void
  isPending: boolean
}) {
  const isCheckedIn = attendee.status === 'attended'
  const isWaitlisted = attendee.status === 'waitlisted'

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'border-b border-primary-100 last:border-b-0',
      )}
    >
      <Avatar
        src={attendee.profiles?.avatar_url ?? undefined}
        name={attendee.profiles?.display_name ?? 'Unknown'}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary-800 truncate">
          {attendee.profiles?.display_name ?? 'Unknown User'}
        </p>
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
      ) : (
        <Button
          variant="secondary"
          size="sm"
          icon={<UserCheck size={14} />}
          onClick={onCheckIn}
          loading={isPending}
          disabled={isWaitlisted}
        >
          {isWaitlisted ? 'Waitlist' : 'Check In'}
        </Button>
      )}
    </motion.div>
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

  const [searchQuery, setSearchQuery] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [checkingInUserId, setCheckingInUserId] = useState<string | null>(null)

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

  const isLoading = eventLoading || attendeesLoading

  if (isLoading) {
    return (
      <Page header={<Header title="Event Day" back />}>
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
      <Page header={<Header title="Event Day" back />}>
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
      <div className="pt-4 pb-6">
        {/* Event header */}
        <div className="mb-4">
          <h2 className="font-heading text-lg font-bold text-primary-800">
            {event.title}
          </h2>
          <p className="text-caption text-primary-400 mt-0.5">
            {formatEventDate(event.date_start)}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
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
        </div>

        {/* Live count bar */}
        {stats.registered > 0 && (
          <div className="mb-5">
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
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full rounded-lg border border-primary-200 bg-white',
              'pl-10 pr-4 py-2.5 text-[16px]',
              'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              'placeholder:text-primary-400',
            )}
          />
        </div>

        {/* Attendee list */}
        {filteredAttendees.length === 0 ? (
          <EmptyState
            illustration="search"
            title="No attendees found"
            description={searchQuery ? 'Try a different search' : 'No one has registered yet'}
          />
        ) : (
          <div className="rounded-xl border border-primary-200 overflow-hidden">
            {filteredAttendees.map((attendee) => (
              <AttendeeRow
                key={attendee.user_id}
                attendee={attendee}
                onCheckIn={() => handleCheckIn(attendee.user_id)}
                isPending={checkingInUserId === attendee.user_id}
              />
            ))}
          </div>
        )}

        {/* Post-event action */}
        <div className="mt-6">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate(`/events/${eventId}/impact`)}
            icon={<ChevronRight size={16} />}
          >
            Log Impact Data
          </Button>
        </div>
      </div>

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
    </Page>
  )
}

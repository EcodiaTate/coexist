import { useState, useEffect, useMemo, startTransition } from 'react'
import { Megaphone, CalendarPlus, ChevronDown, Search, Users2, Check, MapPin, Calendar } from 'lucide-react'
import { CenteredDialog } from '@/components/centered-dialog'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { cn } from '@/lib/cn'
import { useCollectiveEvents, type EventWithCollective } from '@/hooks/use-events'
import { useCollectives, type CollectiveWithLeader } from '@/hooks/use-collective'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CreateAnnouncementSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    type: 'announcement' | 'event_invite' | 'rsvp'
    title: string
    body?: string
    metadata?: Record<string, unknown>
  }) => void
  /** Called when user wants to invite collectives to collaborate on an event */
  onInviteCollectives?: (data: {
    eventId: string
    collectiveIds: string[]
    message?: string
  }) => void
  loading?: boolean
  /** Pre-select the type (e.g. 'event_invite' when opened from that button) */
  defaultType?: 'announcement' | 'event_invite' | 'rsvp'
  /** The current collective's ID - needed to fetch its events */
  collectiveId?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

/* ------------------------------------------------------------------ */
/*  Event Picker Dropdown                                              */
/* ------------------------------------------------------------------ */

function EventPicker({
  events,
  selectedId,
  onSelect,
  isLoading,
}: {
  events: EventWithCollective[]
  selectedId: string
  onSelect: (id: string) => void
  isLoading: boolean
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const selected = events.find((e) => e.id === selectedId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          'w-full rounded-xl px-3.5 py-2.5 text-left text-sm min-h-11 flex items-center gap-2 transition-all duration-150',
          'active:scale-[0.99] cursor-pointer select-none',
          selectedId
            ? 'bg-primary-50 text-primary-800 ring-2 ring-primary-400'
            : 'bg-primary-50/50 text-primary-400 ring-1 ring-primary-200/60',
          dropdownOpen && 'ring-2 ring-primary-400 bg-white',
        )}
      >
        <Calendar size={16} className="shrink-0 text-primary-500" />
        <span className="flex-1 truncate">
          {isLoading
            ? 'Loading events...'
            : selected
              ? selected.title
              : events.length === 0
                ? 'No upcoming events'
                : 'Select an event...'}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-primary-400 transition-transform duration-150',
            dropdownOpen && 'rotate-180',
          )}
        />
      </button>

      {dropdownOpen && events.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl bg-white shadow-lg ring-1 ring-primary-200/60 max-h-52 overflow-y-auto overscroll-contain">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                onSelect(event.id)
                setDropdownOpen(false)
              }}
              className={cn(
                'w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors duration-100 min-h-11',
                'hover:bg-primary-50 active:bg-primary-100 cursor-pointer select-none',
                event.id === selectedId && 'bg-primary-50',
                'first:rounded-t-xl last:rounded-b-xl',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-800 truncate">{event.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar size={11} className="text-primary-400 shrink-0" />
                  <span className="text-[11px] text-primary-500">
                    {formatEventDate(event.date_start)} at {formatEventTime(event.date_start)}
                  </span>
                </div>
                {event.address && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={11} className="text-primary-400 shrink-0" />
                    <span className="text-[11px] text-primary-400 truncate">{event.address}</span>
                  </div>
                )}
              </div>
              {event.id === selectedId && (
                <Check size={16} className="text-primary-600 shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Collective Picker (multi-select for collaboration invites)         */
/* ------------------------------------------------------------------ */

function CollectivePicker({
  currentCollectiveId,
  selectedIds,
  onToggle,
}: {
  currentCollectiveId: string
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const { data: allCollectives = [], isLoading } = useCollectives()
  const [search, setSearch] = useState('')

  const otherCollectives = useMemo(
    () => allCollectives.filter((c) => c.id !== currentCollectiveId),
    [allCollectives, currentCollectiveId],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return otherCollectives
    const q = search.toLowerCase()
    return otherCollectives.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.region?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q),
    )
  }, [otherCollectives, search])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collectives..."
          className="w-full rounded-xl bg-primary-50/50 pl-8 pr-3.5 py-2 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white min-h-11"
        />
      </div>

      {/* Selected count */}
      {selectedIds.length > 0 && (
        <p className="text-[11px] font-semibold text-primary-600 mb-1.5">
          {selectedIds.length} collective{selectedIds.length !== 1 ? 's' : ''} selected
        </p>
      )}

      {/* List */}
      <div className="max-h-40 overflow-y-auto overscroll-contain rounded-xl ring-1 ring-primary-200/60 bg-white">
        {isLoading ? (
          <div className="px-3.5 py-3 text-xs text-primary-400">Loading collectives...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3.5 py-3 text-xs text-primary-400">
            {search ? 'No collectives match your search' : 'No other collectives available'}
          </div>
        ) : (
          filtered.map((collective) => {
            const isSelected = selectedIds.includes(collective.id)
            return (
              <button
                key={collective.id}
                type="button"
                onClick={() => onToggle(collective.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors duration-100 min-h-11',
                  'hover:bg-primary-50 active:bg-primary-100 cursor-pointer select-none',
                  isSelected && 'bg-primary-50/80',
                  'first:rounded-t-xl last:rounded-b-xl',
                )}
              >
                <Avatar
                  src={collective.cover_image_url}
                  name={collective.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-800 truncate">{collective.name}</p>
                  {(collective.region || collective.state) && (
                    <p className="text-[11px] text-primary-400 truncate">
                      {[collective.region, collective.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    'flex items-center justify-center h-5 w-5 rounded-md border-2 transition-all duration-150 shrink-0',
                    isSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-primary-300 bg-white',
                  )}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Sheet                                                         */
/* ------------------------------------------------------------------ */

export function CreateAnnouncementSheet({
  open,
  onClose,
  onSubmit,
  onInviteCollectives,
  loading,
  defaultType = 'announcement',
  collectiveId,
}: CreateAnnouncementSheetProps) {
  const [type, setType] = useState<'announcement' | 'event_invite' | 'rsvp'>(defaultType)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventId, setEventId] = useState('')
  const [inviteCollectiveIds, setInviteCollectiveIds] = useState<string[]>([])
  const [inviteMessage, setInviteMessage] = useState('')

  // Fetch upcoming events for this collective
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useCollectiveEvents(
    open && type === 'event_invite' ? collectiveId : undefined,
  )

  // Reset form when opened with new defaultType
  useEffect(() => {
    if (open) {
      startTransition(() => {
        setType(defaultType)
        setTitle('')
        setBody('')
        setEventId('')
        setInviteCollectiveIds([])
        setInviteMessage('')
      })
    }
  }, [open, defaultType])

  // Auto-fill title when event is selected
  useEffect(() => {
    if (eventId && type === 'event_invite') {
      const event = upcomingEvents.find((e) => e.id === eventId)
      if (event && !title) {
        startTransition(() => setTitle(`Join us: ${event.title}`))
      }
    }
  }, [eventId, type, upcomingEvents, title])

  const canSubmit = title.trim().length > 0 && (type !== 'event_invite' || eventId)

  const handleToggleCollective = (id: string) => {
    setInviteCollectiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSubmit = () => {
    if (!canSubmit) return

    // Post the announcement/invite to chat
    onSubmit({
      type,
      title: title.trim(),
      body: body.trim() || undefined,
      metadata: type === 'event_invite' && eventId ? { event_id: eventId } : undefined,
    })

    // If collectives were selected for collaboration, fire that too
    if (type === 'event_invite' && eventId && inviteCollectiveIds.length > 0 && onInviteCollectives) {
      onInviteCollectives({
        eventId,
        collectiveIds: inviteCollectiveIds,
        message: inviteMessage.trim() || undefined,
      })
    }

    setTitle('')
    setBody('')
    setEventId('')
    setInviteCollectiveIds([])
    setInviteMessage('')
  }

  const typeOptions = [
    { value: 'announcement' as const, label: 'Announcement', icon: Megaphone, desc: 'Share news with your collective' },
    { value: 'event_invite' as const, label: 'Event Invite', icon: CalendarPlus, desc: 'Invite members to an event' },
    { value: 'rsvp' as const, label: 'RSVP Request', icon: CalendarPlus, desc: 'Ask members to RSVP' },
  ]

  return (
    <CenteredDialog open={open} onClose={onClose}>
      <div className="pb-4 max-h-[80vh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-600">
            <Megaphone size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary-900">Create Announcement</h3>
            <p className="text-xs text-primary-400">Share something with your collective</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-primary-600 mb-1.5 block">Type</label>
          <div className="flex gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  'flex-1 rounded-xl py-2.5 px-2 text-center transition-all duration-150 min-h-11',
                  'active:scale-[0.95] cursor-pointer select-none',
                  type === opt.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-primary-50 text-primary-600 ring-1 ring-primary-200/60',
                )}
              >
                <opt.icon size={16} className="mx-auto mb-0.5" />
                <span className="text-[11px] font-semibold block">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Event picker (for event invites) */}
        {type === 'event_invite' && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-primary-600 mb-1 block">
              Event
            </label>
            <EventPicker
              events={upcomingEvents}
              selectedId={eventId}
              onSelect={setEventId}
              isLoading={eventsLoading}
            />
            {!eventsLoading && upcomingEvents.length === 0 && (
              <p className="text-[11px] text-warning-600 mt-1">
                No upcoming events found. Create an event first, then invite from here.
              </p>
            )}
          </div>
        )}

        {/* Title */}
        <div className="mb-3">
          <label htmlFor="ann-title" className="text-xs font-semibold text-primary-600 mb-1 block">
            Title
          </label>
          <input
            id="ann-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'event_invite' ? 'Come join us at...' : 'Your announcement title'}
            maxLength={150}
            className="w-full rounded-xl bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white min-h-11"
          />
        </div>

        {/* Body */}
        <div className="mb-3">
          <label htmlFor="ann-body" className="text-xs font-semibold text-primary-600 mb-1 block">
            Details (optional)
          </label>
          <textarea
            id="ann-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add more details..."
            rows={3}
            maxLength={500}
            className="w-full rounded-xl bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white resize-none"
          />
        </div>

        {/* Invite other collectives to collaborate (event invites only) */}
        {type === 'event_invite' && eventId && collectiveId && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Users2 size={14} className="text-primary-500" />
              <label className="text-xs font-semibold text-primary-600">
                Invite collectives to collaborate (optional)
              </label>
            </div>
            <p className="text-[11px] text-primary-400 mb-2">
              Invite other collectives to co-host this event. Their leaders will be notified and can accept the collaboration.
            </p>
            <CollectivePicker
              currentCollectiveId={collectiveId}
              selectedIds={inviteCollectiveIds}
              onToggle={handleToggleCollective}
            />

            {/* Collaboration message */}
            {inviteCollectiveIds.length > 0 && (
              <div className="mt-2.5">
                <label htmlFor="collab-msg" className="text-[11px] font-semibold text-primary-500 mb-1 block">
                  Message to invited collectives (optional)
                </label>
                <input
                  id="collab-msg"
                  type="text"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Hey! Want to join forces on this one?"
                  maxLength={300}
                  className="w-full rounded-xl bg-primary-50/50 px-3.5 py-2 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white min-h-11"
                />
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          loading={loading}
        >
          {type === 'event_invite'
            ? inviteCollectiveIds.length > 0
              ? `Post Invite & Invite ${inviteCollectiveIds.length} Collective${inviteCollectiveIds.length !== 1 ? 's' : ''}`
              : 'Post Event Invite'
            : type === 'rsvp'
              ? 'Post RSVP Request'
              : 'Post Announcement'}
        </Button>
      </div>
    </CenteredDialog>
  )
}

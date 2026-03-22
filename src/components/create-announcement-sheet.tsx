import { useState } from 'react'
import { Megaphone, CalendarPlus } from 'lucide-react'
import { CenteredDialog } from '@/components/centered-dialog'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'

interface CreateAnnouncementSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    type: 'announcement' | 'event_invite' | 'rsvp'
    title: string
    body?: string
    metadata?: Record<string, unknown>
  }) => void
  loading?: boolean
  /** Pre-select the type (e.g. 'event_invite' when opened from that button) */
  defaultType?: 'announcement' | 'event_invite' | 'rsvp'
}

export function CreateAnnouncementSheet({
  open,
  onClose,
  onSubmit,
  loading,
  defaultType = 'announcement',
}: CreateAnnouncementSheetProps) {
  const [type, setType] = useState<'announcement' | 'event_invite' | 'rsvp'>(defaultType)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventId, setEventId] = useState('')

  const canSubmit = title.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      type,
      title: title.trim(),
      body: body.trim() || undefined,
      metadata: type === 'event_invite' && eventId ? { event_id: eventId } : undefined,
    })
    setTitle('')
    setBody('')
    setEventId('')
  }

  const typeOptions = [
    { value: 'announcement' as const, label: 'Announcement', icon: Megaphone, desc: 'Share news with your collective' },
    { value: 'event_invite' as const, label: 'Event Invite', icon: CalendarPlus, desc: 'Invite members to an event' },
    { value: 'rsvp' as const, label: 'RSVP Request', icon: CalendarPlus, desc: 'Ask members to RSVP' },
  ]

  return (
    <CenteredDialog open={open} onClose={onClose}>
      <div className="pb-4">
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

        {/* Event ID (for event invites) */}
        {type === 'event_invite' && (
          <div className="mb-4">
            <label htmlFor="ann-event" className="text-xs font-semibold text-primary-600 mb-1 block">
              Event ID (optional - paste from event page)
            </label>
            <input
              id="ann-event"
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Paste event ID to link"
              className="w-full rounded-xl bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white min-h-11"
            />
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
          Post {type === 'event_invite' ? 'Invite' : type === 'rsvp' ? 'RSVP Request' : 'Announcement'}
        </Button>
      </div>
    </CenteredDialog>
  )
}

import { useState } from 'react'
import { Bell, Clock } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Avatar } from '@/components/avatar'
import { formatRelative } from '@/lib/date-format'
import type { BroadcastLogEntry } from '@/hooks/use-chat'
import { SheetHeader } from '@/components/sheet-header'

interface BroadcastNotificationSheetProps {
  open: boolean
  onClose: () => void
  onSend: (data: { title: string; body: string }) => void
  loading?: boolean
  recentBroadcasts?: BroadcastLogEntry[]
  collectiveName?: string
}

export function BroadcastNotificationSheet({
  open,
  onClose,
  onSend,
  loading,
  recentBroadcasts = [],
  collectiveName,
}: BroadcastNotificationSheetProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const canSend = title.trim().length > 0 && body.trim().length > 0

  const handleSend = () => {
    if (!canSend) return
    onSend({ title: title.trim(), body: body.trim() })
    setTitle('')
    setBody('')
  }

  // Recent broadcasts within last 24h for dedup awareness
  const [now] = useState(() => Date.now())
  const recentBroadcasts24h = recentBroadcasts.filter(
    (b) => now - new Date(b.created_at).getTime() < 24 * 60 * 60 * 1000,
  )

  return (
    <BottomSheet data-eos-id="src/components/broadcast-notification-sheet.tsx#0" data-eos-v="2" open={open} onClose={onClose}>
      <div data-eos-id="src/components/broadcast-notification-sheet.tsx#1" className="pb-4">
        {/* Header */}
        <SheetHeader
          variant="panel"
          icon={<Bell size={20} />}
          iconClassName="bg-warning-100 text-warning-600"
          title="Push Notification"
          titleClassName="text-primary-900"
          subtitle={`Send to all ${collectiveName ? `${collectiveName} ` : ''}members`}
        />

        {/* Recent broadcasts warning (dedup) */}
        {recentBroadcasts24h.length > 0 && (
          <div data-eos-id="src/components/broadcast-notification-sheet.tsx#8" className="mb-4 rounded-sm bg-warning-50 p-3 ring-1 ring-warning-200/60">
            <p data-eos-id="src/components/broadcast-notification-sheet.tsx#9" className="text-xs font-semibold text-warning-700 mb-2 flex items-center gap-1.5">
              <Clock data-eos-id="src/components/broadcast-notification-sheet.tsx#10" size={12} />
              Recent notifications (last 24h)
            </p>
            <div data-eos-id="src/components/broadcast-notification-sheet.tsx#11" className="space-y-2">
              {recentBroadcasts24h.slice(0, 3).map((b) => (
                <div data-eos-id="src/components/broadcast-notification-sheet.tsx#12" key={b.id} className="flex items-start gap-2">
                  <Avatar data-eos-id="src/components/broadcast-notification-sheet.tsx#13"
                    src={b.profiles?.avatar_url}
                    name={b.profiles?.display_name}
                    size="xs"
                  />
                  <div data-eos-id="src/components/broadcast-notification-sheet.tsx#14" className="flex-1 min-w-0">
                    <p data-eos-id="src/components/broadcast-notification-sheet.tsx#15" data-eos-var="b.profiles.display_name,b.title" data-eos-var-label="Display name, Title" data-eos-var-scope="item" className="text-[11px] font-semibold text-warning-800 truncate">
                      {b.profiles?.display_name ?? 'Staff'}: {b.title}
                    </p>
                    <p data-eos-id="src/components/broadcast-notification-sheet.tsx#16" data-eos-var="b.created_at,b.recipient_count,b.recipient_count" data-eos-var-label="Created at, Recipient count, Recipient count" data-eos-var-scope="item" className="text-[11px] text-warning-500">
                      {formatRelative(b.created_at)} &middot; sent to {b.recipient_count} member{b.recipient_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p data-eos-id="src/components/broadcast-notification-sheet.tsx#17" className="text-[11px] text-warning-500 mt-2 italic">
              Check above to avoid sending duplicate notifications
            </p>
          </div>
        )}

        {/* Title */}
        <div data-eos-id="src/components/broadcast-notification-sheet.tsx#18" className="mb-3">
          <Input data-eos-id="src/components/broadcast-notification-sheet.tsx#19"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Beach Cleanup This Saturday!"
            maxLength={100}
          />
        </div>

        {/* Body */}
        <div data-eos-id="src/components/broadcast-notification-sheet.tsx#20" className="mb-4">
          <Input data-eos-id="src/components/broadcast-notification-sheet.tsx#21"
            type="textarea"
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell members what they need to know..."
            rows={3}
            maxLength={300}
          />
          <p data-eos-id="src/components/broadcast-notification-sheet.tsx#22" className="text-[11px] text-neutral-500 mt-1 text-right">
            {body.length}/300
          </p>
        </div>

        {/* Warning */}
        <p data-eos-id="src/components/broadcast-notification-sheet.tsx#23" className="text-[11px] text-neutral-500 mb-3 bg-primary-50 rounded-sm px-3 py-2">
          This will send a push notification to <strong data-eos-id="src/components/broadcast-notification-sheet.tsx#24">all registered members</strong> of this chat who have notifications enabled. Use sparingly.
        </p>

        {/* Send */}
        <Button data-eos-id="src/components/broadcast-notification-sheet.tsx#25"
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSend}
          disabled={!canSend || loading}
          loading={loading}
          icon={<Bell data-eos-id="src/components/broadcast-notification-sheet.tsx#26" size={16} />}
        >
          Send Push Notification
        </Button>
      </div>
    </BottomSheet>
  )
}

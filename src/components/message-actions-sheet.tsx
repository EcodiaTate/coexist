import { Reply, Pencil, Pin, Trash2 } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'

/* ------------------------------------------------------------------ */
/*  Shared message shape — works for both collective & channel msgs    */
/* ------------------------------------------------------------------ */

export interface ActionableMessage {
  id: string
  content: string | null
  user_id: string | null
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  message_type?: string
  _optimistic?: boolean
}

/* ------------------------------------------------------------------ */
/*  MessageActionsSheet                                                */
/* ------------------------------------------------------------------ */

function canEdit(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 15 * 60 * 1000
}

interface MessageActionsProps {
  message: ActionableMessage | null
  isModerator: boolean
  isOwnMessage: boolean
  onClose: () => void
  onReply: () => void
  onEdit?: () => void
  onDelete: () => void
  onPin?: () => void
}

export function MessageActionsSheet({
  message,
  isModerator,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: MessageActionsProps) {
  if (!message) return null

  return (
    <BottomSheet open={!!message} onClose={onClose}>
      <div className="space-y-1 pb-2">
        <button
          type="button"
          onClick={onReply}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-primary-800 hover:bg-primary-50 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
        >
          <Reply size={18} className="text-primary-400" />
          Reply
        </button>

        {onEdit && isOwnMessage && message.content && canEdit(message.created_at) && (
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-primary-800 hover:bg-primary-50 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
          >
            <Pencil size={18} className="text-primary-400" />
            Edit message
          </button>
        )}

        {onPin && isModerator && (
          <button
            type="button"
            onClick={onPin}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-primary-800 hover:bg-primary-50 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
          >
            <Pin size={18} className="text-primary-400" />
            {message.is_pinned ? 'Unpin message' : 'Pin message'}
          </button>
        )}

        {(isOwnMessage || isModerator) && (
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-error-600 hover:bg-error-50 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
          >
            <Trash2 size={18} />
            Delete message
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

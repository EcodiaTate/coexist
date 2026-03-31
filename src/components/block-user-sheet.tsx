import { useState } from 'react'
import { ShieldOff } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { useBlockUser } from '@/hooks/use-user-blocks'
import { useToast } from '@/components/toast'

interface BlockUserSheetProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function BlockUserSheet({
  open,
  onClose,
  userId,
  userName,
}: BlockUserSheetProps) {
  const [reason, setReason] = useState('')
  const blockUser = useBlockUser()
  const { toast } = useToast()

  const handleBlock = () => {
    blockUser.mutate(
      { blockedId: userId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${userName} has been blocked. Their content will no longer appear in your feed.`)
          setReason('')
          onClose()
        },
        onError: () => {
          toast.error('Failed to block user. Please try again.')
        },
      },
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-1 pb-2">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-error-100 text-error-600">
            <ShieldOff size={16} />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-neutral-900">
              Block {userName}?
            </h3>
            <p className="text-xs text-neutral-500">
              They won&apos;t be notified
            </p>
          </div>
        </div>

        <p className="text-sm text-primary-500 leading-relaxed mb-4">
          Blocking this user will:
        </p>
        <ul className="text-sm text-primary-500 space-y-1.5 mb-4 pl-4 list-disc">
          <li>Hide their messages and content from your feed</li>
          <li>Prevent them from seeing your profile</li>
          <li>Notify our moderation team for review</li>
        </ul>

        <div className="mb-5">
          <Input
            label="Reason (optional)"
            type="textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Help our team understand what happened"
          />
        </div>

        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={blockUser.isPending}
            onClick={handleBlock}
            className="!bg-error-600 hover:!bg-error-700"
          >
            Block {userName}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

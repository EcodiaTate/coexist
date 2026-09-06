import { useMemo, useState } from 'react'
import { Users, Send } from 'lucide-react'
import { Button, Dropdown, Input } from '@/components'
import { useToast } from '@/components/toast'
import {
  useInviteCollaborator,
  useOutgoingCollaborations,
} from '@/hooks/use-events'
import { useAllActiveCollectives } from '@/hooks/use-collectives-picker'

/* ------------------------------------------------------------------ */
/*  Co-hosting collectives, inside the event edit form                 */
/*                                                                     */
/*  Finding 2.F3, the surfacing half. Collaborator collectives are     */
/*  chosen once at creation and after that the ONLY way to add one was */
/*  chat-room.tsx:801, a chat feature a leader has no reason to look   */
/*  in when they are editing an event. The RPC, the mutation and the   */
/*  accept/decline tracking all already existed; nothing here changes  */
/*  how an invite works, it just puts the existing flow where the      */
/*  decision is made.                                                  */
/*                                                                     */
/*  Reassigning the PRIMARY host collective is deliberately NOT here.  */
/*  collective_id gates RLS host permissions across the codebase, so   */
/*  it is a product and permissions decision rather than a form gap.   */
/* ------------------------------------------------------------------ */

export function EventCollaboratorsCard({
  eventId,
  hostCollectiveId,
}: {
  eventId: string
  hostCollectiveId: string
}) {
  const { toast } = useToast()
  const { data: collectives } = useAllActiveCollectives()
  const { data: outgoing } = useOutgoingCollaborations(hostCollectiveId)
  const invite = useInviteCollaborator()

  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState('')

  // Invites already sent for THIS event, whatever their state. A pending
  // invite is not a co-host yet, so both are shown with their status rather
  // than a pending one being hidden and re-invitable.
  const forThisEvent = useMemo(
    () => (outgoing ?? []).filter((c) => c.event_id === eventId),
    [outgoing, eventId],
  )

  const options = useMemo(() => {
    const taken = new Set([hostCollectiveId, ...forThisEvent.map((c) => c.collective_id)])
    return (collectives ?? [])
      .filter((c) => !taken.has(c.id))
      .map((c) => ({ value: c.id, label: c.name }))
  }, [collectives, hostCollectiveId, forThisEvent])

  const send = async () => {
    if (!targetId) return
    try {
      await invite.mutateAsync({
        eventId,
        collectiveId: targetId,
        hostCollectiveId,
        message: message.trim() || undefined,
      })
      setTargetId('')
      setMessage('')
      toast.success('Collaboration invite sent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the invite')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <Users size={13} className="text-neutral-400" />
        <h3 className="text-sm font-semibold text-neutral-900">Co-hosting collectives</h3>
      </div>

      {forThisEvent.length > 0 && (
        <ul className="space-y-1.5">
          {forThisEvent.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-sm bg-surface-1 px-3 py-2 text-sm"
            >
              <span className="text-neutral-900">{c.collectives?.name ?? 'Collective'}</span>
              <span
                className={
                  c.status === 'accepted'
                    ? 'text-xs font-medium text-success-600'
                    : c.status === 'declined'
                      ? 'text-xs font-medium text-neutral-400'
                      : 'text-xs font-medium text-warning-600'
                }
              >
                {c.status === 'accepted' ? 'Co-hosting' : c.status === 'declined' ? 'Declined' : 'Invited'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dropdown
        label="Invite another collective to co-host"
        value={targetId}
        onChange={setTargetId}
        options={options}
        placeholder={options.length > 0 ? 'Choose a collective' : 'No other collectives available'}
      />
      {targetId && (
        <>
          <Input
            label="Message (optional)"
            placeholder="Anything they should know before accepting"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Send size={14} />}
            onClick={send}
            disabled={invite.isPending}
            className="w-full"
          >
            {invite.isPending ? 'Sending...' : 'Send invite'}
          </Button>
        </>
      )}

      <p className="text-caption text-neutral-500">
        Co-hosts can help run the event. The primary host collective is set when the event is
        created and cannot be changed here.
      </p>
    </div>
  )
}

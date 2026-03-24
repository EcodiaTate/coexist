import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  User,
  Calendar,
  Send,
  X,
  Check,
} from 'lucide-react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useCreateAssignment } from '@/hooks/use-development-assignments'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AssignmentSheetProps {
  moduleId?: string | null
  sectionId?: string | null
  title: string
  collectiveId: string
  members: { user_id: string; display_name: string; avatar_url: string | null }[]
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AssignmentSheet({
  moduleId,
  sectionId,
  title,
  collectiveId,
  members,
  onClose,
}: AssignmentSheetProps) {
  const toast = useToast()
  const createAssignment = useCreateAssignment()

  const [scope, setScope] = useState<'collective' | 'individual'>('collective')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const canSubmit =
    scope === 'collective' || (scope === 'individual' && selectedMembers.size > 0)

  const handleAssign = async () => {
    if (!canSubmit) return

    try {
      await createAssignment.mutateAsync({
        module_id: moduleId ?? null,
        section_id: sectionId ?? null,
        scope,
        collective_id: scope === 'collective' ? collectiveId : null,
        user_ids: scope === 'individual' ? Array.from(selectedMembers) : undefined,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      })

      toast.success(
        scope === 'collective'
          ? 'Assigned to entire collective'
          : `Assigned to ${selectedMembers.size} member${selectedMembers.size !== 1 ? 's' : ''}`,
      )
      onClose()
    } catch {
      toast.error('Failed to create assignment')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl border-t border-primary-100 overflow-y-auto"
    >
      {/* Handle */}
      <div className="sticky top-0 bg-white pt-3 pb-2 px-5 border-b border-primary-100 z-10">
        <div className="w-10 h-1 rounded-full bg-primary-200 mx-auto mb-3" />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-primary-800">Assign Content</h3>
            <p className="text-xs text-primary-500 mt-0.5 truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primary-400 hover:text-primary-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Scope toggle */}
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">Assign to</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope('collective')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                scope === 'collective'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-primary-50 text-primary-500 hover:bg-primary-100',
              )}
            >
              <Users size={16} />
              Entire Collective
            </button>
            <button
              type="button"
              onClick={() => setScope('individual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                scope === 'individual'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-primary-50 text-primary-500 hover:bg-primary-100',
              )}
            >
              <User size={16} />
              Individual Members
            </button>
          </div>
        </div>

        {/* Member picker */}
        {scope === 'individual' && (
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Select Members ({selectedMembers.size} selected)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-primary-200 p-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleMember(m.user_id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                    selectedMembers.has(m.user_id)
                      ? 'bg-primary-100'
                      : 'hover:bg-primary-50',
                  )}
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-600">
                      {m.display_name.charAt(0)}
                    </div>
                  )}
                  <span className="flex-1 text-sm text-primary-800 truncate">{m.display_name}</span>
                  <div
                    className={cn(
                      'flex items-center justify-center w-5 h-5 rounded border-2 transition-colors',
                      selectedMembers.has(m.user_id)
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-primary-300',
                    )}
                  >
                    {selectedMembers.has(m.user_id) && <Check size={10} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Due date */}
        <Input
          label="Due Date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          icon={<Calendar size={14} />}
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Notes (optional)</label>
          <textarea
            className="w-full min-h-[60px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional context for the assignees..."
          />
        </div>

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Send size={16} />}
          onClick={handleAssign}
          loading={createAssignment.isPending}
          disabled={!canSubmit}
        >
          Assign
        </Button>
      </div>
    </motion.div>
  )
}

export default AssignmentSheet

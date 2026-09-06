import { useState, useCallback, useMemo } from 'react'
import { Tent } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/button'
import { useToast } from '@/components/toast'
import { Modal } from '@/components/modal'
import { SafetyRequirementsFields } from '@/components/safety-requirements-fields'
import {
  EMPTY_SAFETY_ANSWERS,
  safetyProfileUpdates,
  validateSafetyAnswers,
  type SafetyAnswers,
} from '@/lib/safety-requirements'

/* ------------------------------------------------------------------ */
/*  Ticket requirements modal (captured at purchase)                   */
/*                                                                     */
/*  Shown before ANY ticket checkout when the buyer is missing         */
/*  dietary, medical, emergency-contact and/or four-wheel-drive info.  */
/*  All four are mandatory for every ticketed event (not just          */
/*  camp-outs) so leaders always have safety + catering + transport    */
/*  data on file. It BLOCKS the purchase:                              */
/*  the buyer cannot reach Stripe checkout until every required field  */
/*  is answered (an explicit "None" is a valid answer, a blank is not).*/
/*  On save it persists to the buyer's profile and invokes onSaved,    */
/*  which continues to checkout. It is dismissable (Cancel) - unlike   */
/*  the app-open DietaryGate backstop - because no ticket exists yet.  */
/*  `isCampout` only tunes the copy (camp-outs are catered + remote,   */
/*  so the wording leans on that); the requirement itself is identical */
/*  for every ticketed event.                                          */
/* ------------------------------------------------------------------ */

interface Props {
  open: boolean
  needDietary: boolean
  needMedical: boolean
  needEmergency: boolean
  needFourWheelDrive: boolean
  isCampout: boolean
  onClose: () => void
  onSaved: () => void
}

export function CampoutRequirementsModal({ open, needDietary, needMedical, needEmergency, needFourWheelDrive, isCampout, onClose, onSaved }: Props) {
  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [answers, setAnswers] = useState<SafetyAnswers>(EMPTY_SAFETY_ANSWERS)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const needed = useMemo(
    () => ({
      dietary: needDietary,
      medical: needMedical,
      emergency: needEmergency,
      fourWheelDrive: needFourWheelDrive,
    }),
    [needDietary, needMedical, needEmergency, needFourWheelDrive],
  )

  const patch = useCallback((next: Partial<SafetyAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...next }))
    setError((prev) => (prev ? null : prev))
  }, [])

  const handleSave = useCallback(async () => {
    if (!user) return
    const message = validateSafetyAnswers(answers, needed)
    if (message) {
      setError(message)
      return
    }
    // Only the columns actually asked about, so a buyer answering just the
    // emergency contact does not have their stored dietary answer blanked.
    const updates = safetyProfileUpdates(answers, needed)

    setError(null)
    setSaving(true)
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      if (updErr) throw updErr
      await refreshProfile()
      onSaved()
    } catch {
      toast.error('Could not save. Please try again.')
      setSaving(false)
    }
  }, [user, answers, needed, refreshProfile, onSaved, toast])

  // Name only the fields actually being asked for, so a buyer who already has
  // dietary and medical on file is not told we need them again.
  const neededLabel = [
    needDietary && 'dietary',
    needMedical && 'medical/allergy',
    needEmergency && 'emergency contact',
    needFourWheelDrive && '4WD',
  ].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1') + ' info'

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose() }}
      ariaLabel={isCampout ? 'Before you book this camp-out' : 'Before you book your ticket'}
    >
        <div data-eos-id="src/components/campout-requirements-modal.tsx#3" className="px-6 pt-7 pb-6 space-y-5">
          <div data-eos-id="src/components/campout-requirements-modal.tsx#4" className="flex flex-col items-center text-center gap-3">
            <div data-eos-id="src/components/campout-requirements-modal.tsx#5" className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Tent data-eos-id="src/components/campout-requirements-modal.tsx#6" size={22} className="text-primary-800" />
            </div>
            <h2 data-eos-id="src/components/campout-requirements-modal.tsx#7" id="campout-reqs-title" className="font-heading text-xl font-bold text-neutral-900">
              {isCampout ? 'Before you book this camp-out' : 'Before you book your ticket'}
            </h2>
            <p data-eos-id="src/components/campout-requirements-modal.tsx#8" className="text-sm text-neutral-500 leading-relaxed">
              {isCampout
                ? `Camp-outs are catered and remote, so our leaders need your ${neededLabel} before you book. Only event leaders can see it.`
                : `Our leaders need your ${neededLabel} before you book, so we can cater safely and be ready in an emergency. Only event leaders can see it.`}
            </p>
          </div>

          <SafetyRequirementsFields
            value={answers}
            onChange={patch}
            needed={needed}
            disabled={saving}
          />

          {error && <p data-eos-id="src/components/campout-requirements-modal.tsx#15" className="text-xs text-error-500">{error}</p>}

          <div data-eos-id="src/components/campout-requirements-modal.tsx#16" className="space-y-2.5">
            <Button data-eos-id="src/components/campout-requirements-modal.tsx#17"
              variant="primary"
              fullWidth
              loading={saving}
              onClick={handleSave}
            >
              Save and continue to payment
            </Button>
            <Button data-eos-id="src/components/campout-requirements-modal.tsx#18"
              variant="ghost"
              fullWidth
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
    </Modal>
  )
}

import { useState, useCallback } from 'react'
import { Tent } from 'lucide-react'
import { Button } from '@/components/button'
import { Modal } from '@/components/modal'
import { type GuestSafetyAnswers } from '@/lib/dietary'
import { SafetyRequirementsFields } from '@/components/safety-requirements-fields'
import {
  EMPTY_SAFETY_ANSWERS,
  trimSafetyAnswers,
  validateSafetyAnswers,
  type SafetyAnswers,
  type SafetyFieldsNeeded,
} from '@/lib/safety-requirements'

/* ------------------------------------------------------------------ */
/*  Guest ticket requirements modal (public booking, no account)       */
/*                                                                     */
/*  The public campout / event pages let someone book with just name + */
/*  email, but dietary + medical/allergy info is a hard pre-checkout    */
/*  requirement for EVERY ticketed event (Angelica, 2026-07-08; broad- */
/*  ened from camp-outs to all ticketed events 2026-08-12) - the same  */
/*  rule the authed CampoutRequirementsModal enforces. The guest has    */
/*  no session/profile yet, so unlike that modal this one does NOT      */
/*  write to the DB: it collects both answers and hands them back via   */
/*  onSubmit, and guest-ticket-checkout persists them onto the          */
/*  provisioned profile (and hard-enforces the gate server-side).      */
/*  An explicit "None" is a valid answer; a blank is not. `isCampout`  */
/*  only tunes the copy.                                               */
/* ------------------------------------------------------------------ */

// A guest is always asked for all three. There is no profile to check them
// against, so nothing here is ever already-on-file. Four-wheel drive is absent
// BY DESIGN, not by omission: a guest has no profile row to write it to, and
// their 4WD is collected by the organiser-authored per-event question instead
// (asserted in safety-gate-coverage.test.ts). Do not add it.
const GUEST_NEEDS: SafetyFieldsNeeded = {
  dietary: true,
  medical: true,
  emergency: true,
  fourWheelDrive: false,
}

interface Props {
  open: boolean
  submitting: boolean
  isCampout: boolean
  onClose: () => void
  onSubmit: (values: GuestSafetyAnswers) => void
}

export function CampoutGuestRequirementsModal({ open, submitting, isCampout, onClose, onSubmit }: Props) {
  const [answers, setAnswers] = useState<SafetyAnswers>(EMPTY_SAFETY_ANSWERS)
  const [error, setError] = useState<string | null>(null)

  const patch = useCallback((next: Partial<SafetyAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...next }))
    setError((prev) => (prev ? null : prev))
  }, [])

  const handleContinue = useCallback(() => {
    const message = validateSafetyAnswers(answers, GUEST_NEEDS)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    const t = trimSafetyAnswers(answers)
    onSubmit({
      dietary: t.dietary,
      medical: t.medical,
      emergencyName: t.emergencyName,
      emergencyPhone: t.emergencyPhone,
      emergencyRelationship: t.emergencyRelationship,
    })
  }, [answers, onSubmit])

  return (
    <Modal
      open={open}
      onClose={() => { if (!submitting) onClose() }}
      ariaLabel={isCampout ? 'Before you book this camp-out' : 'Before you book your ticket'}
    >
        <div className="px-6 pt-7 pb-6 space-y-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Tent size={22} className="text-primary-800" />
            </div>
            <h2 id="campout-guest-reqs-title" className="font-heading text-xl font-bold text-neutral-900">
              {isCampout ? 'Before you book this camp-out' : 'Before you book your ticket'}
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {isCampout
                ? 'Camp-outs are catered and remote, so our leaders need your dietary and medical/allergy info and an emergency contact before you book. Only event leaders can see it.'
                : 'Our leaders need your dietary and medical/allergy info and an emergency contact before you book, so we can cater safely, be ready for allergies, and reach someone if we have to. Only event leaders can see it.'}
            </p>
          </div>

          <SafetyRequirementsFields
            value={answers}
            onChange={patch}
            needed={GUEST_NEEDS}
            disabled={submitting}
          />

          {error && <p className="text-xs text-error-500">{error}</p>}

          <div className="space-y-2.5">
            <Button variant="primary" fullWidth loading={submitting} onClick={handleContinue}>
              Continue to payment
            </Button>
            <Button variant="ghost" fullWidth disabled={submitting} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
    </Modal>
  )
}

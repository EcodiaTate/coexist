import { useState, useCallback, useMemo } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/button'
import { useToast } from '@/components/toast'
import { Modal } from '@/components/modal'
import { SafetyRequirementsFields } from '@/components/safety-requirements-fields'
import { dietaryGateOrderAllows } from '@/lib/profile-gates'
import {
  EMPTY_SAFETY_ANSWERS,
  safetyProfileUpdates,
  validateSafetyAnswers,
  type SafetyAnswers,
} from '@/lib/safety-requirements'
import {
  DIETARY_GATE_QUERY_KEY,
  hasEmergencyContact,
  hasFourWheelDriveAnswer,
  LIVE_REGISTRATION_STATUSES,
  LIVE_TICKET_STATUSES,
  safetyGateHeading,
  SAFETY_SET_EVENT_OR_FILTER,
} from '@/lib/dietary'

/* ------------------------------------------------------------------ */
/*  Dietary + medical requirements gate                                */
/*                                                                     */
/*  Anyone holding a ticket or registration to an UPCOMING TICKETED    */
/*  event must have BOTH dietary requirements and medical / allergy     */
/*  info on file - catering + safety are ordered off these fields.      */
/*  (Broadened 2026-08-12 from "medical only for camp-outs" to every    */
/*  ticketed event, so leaders always hold allergy/medical data for     */
/*  every ticket holder.)                                              */
/*                                                                     */
/*  Users missing a required field who hold such a ticket get a        */
/*  blocking prompt on app open (which backdates the requirement to    */
/*  existing ticket holders, e.g. Aadya) and immediately after a       */
/*  ticket purchase (the checkout flow invalidates                     */
/*  DIETARY_GATE_QUERY_KEY, re-running the eligibility check). The      */
/*  purchase flow itself also captures these fields inline before      */
/*  checkout; this gate is the backstop for existing holders, free      */
/*  claims, and any path that bypasses the inline form.                */
/*                                                                     */
/*  Both fields have a legitimate "none" answer, so each offers a       */
/*  "None" quick-fill that stores the sentinel. An empty/null field    */
/*  means "never answered" and keeps the gate armed; the sentinel      */
/*  means "answered: none" and never re-nags.                          */
/*                                                                     */
/*  Precedence: PhoneGate wins. This gate only renders once a phone    */
/*  is on file, so the two blocking portals can never stack.           */
/* ------------------------------------------------------------------ */

export function DietaryGate() {
  const { user, profile, isLoading, refreshProfile } = useAuth()
  const { toast } = useToast()
  // One bag for the whole safety set. Kurt 2026-08-25: "half of the people
  // don't have their emergency contacts on there so I'm having to email many
  // people individually". The emergency contact has NO "None" quick-fill,
  // unlike dietary and medical, and four-wheel drive starts null rather than
  // false because `false` is a real answer we have to be able to store: both
  // rules now live once, in @/lib/safety-requirements.
  const [answers, setAnswers] = useState<SafetyAnswers>(EMPTY_SAFETY_ANSWERS)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dietaryEmpty = !(profile?.dietary_requirements ?? '').trim()
  const medicalEmpty = !(profile?.medical_requirements ?? '').trim()
  // Both name and phone are needed for the contact to be reachable at all.
  const emergencyEmpty = !hasEmergencyContact(profile)
  // Reads the predicate, not truthiness: has_four_wheel_drive === false is an
  // answer, and treating it as empty would re-ask that person forever.
  const fourWheelDriveEmpty = !hasFourWheelDriveAnswer(profile)

  // Candidate = this gate's turn in the blocking order (onboarded, phone AND
  // birthday already on file, so it can never stack on either gate ahead of
  // it: see @/lib/profile-gates) and at least one requirement field still
  // unanswered. Only candidates run the eligibility query.
  const candidate =
    !isLoading &&
    !!user &&
    dietaryGateOrderAllows(profile) &&
    (dietaryEmpty || medicalEmpty || emergencyEmpty || fourWheelDriveEmpty)

  // Does this user hold a live ticket OR registration to an upcoming event
  // that REQUIRES the safety set? Both tables are checked because a ticketed
  // event can carry either artefact depending on how the user got in (paid
  // checkout, free claim, admin registration). A single live seat arms every
  // missing field.
  //
  // The event predicate is SAFETY_SET_EVENT_OR_FILTER, not is_ticketed alone.
  // Filtering on is_ticketed meant a registration to a non-ticketed camp-out
  // was invisible to this backstop, and a bare registration is the ONLY way
  // into a non-ticketed event, so nothing anywhere asked those people.
  const { data: eligibility } = useQuery({
    queryKey: [...DIETARY_GATE_QUERY_KEY, user?.id],
    queryFn: async (): Promise<{ ticketed: boolean }> => {
      if (!user) return { ticketed: false }
      const nowIso = new Date().toISOString()

      const [tickets, regs] = await Promise.all([
        supabase
          .from('event_tickets')
          .select('id, events!inner(id)')
          .eq('user_id', user.id)
          // Which statuses count as a live seat is defined once in @/lib/dietary
          // (LIVE_TICKET_STATUSES) so this gate and its test cannot drift apart.
          .in('status', LIVE_TICKET_STATUSES)
          .or(SAFETY_SET_EVENT_OR_FILTER, { referencedTable: 'events' })
          .gte('events.date_start', nowIso),
        supabase
          .from('event_registrations')
          .select('id, events!inner(id)')
          .eq('user_id', user.id)
          .in('status', LIVE_REGISTRATION_STATUSES)
          .or(SAFETY_SET_EVENT_OR_FILTER, { referencedTable: 'events' })
          .gte('events.date_start', nowIso),
      ])

      if (tickets.error) throw tickets.error
      if (regs.error) throw regs.error

      const ticketed = (tickets.data?.length ?? 0) + (regs.data?.length ?? 0) > 0
      return { ticketed }
    },
    enabled: candidate,
    staleTime: 5 * 60 * 1000,
  })

  const needDietary = !!eligibility?.ticketed && dietaryEmpty
  const needMedical = !!eligibility?.ticketed && medicalEmpty
  const needEmergency = !!eligibility?.ticketed && emergencyEmpty
  const needFourWheelDrive = !!eligibility?.ticketed && fourWheelDriveEmpty
  const show = candidate && (needDietary || needMedical || needEmergency || needFourWheelDrive)
  // Named once and used for both the visible heading and the ariaLabel, so the
  // screen-reader announcement and the heading can never disagree.
  const heading = safetyGateHeading({ dietary: needDietary, medical: needMedical, emergency: needEmergency, fourWheelDrive: needFourWheelDrive })

  // Body scroll-lock and keyboard avoidance are now owned by the Modal
  // primitive (Vaul + `keyboardAware` via useKeyboardHeight - the canonical
  // Capacitor signal that also works under Keyboard.resize:'none', which the
  // old visualViewport-only path missed on native).

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
    // An explicit "None" quick-fill is a valid answer; a blank is not.
    const message = validateSafetyAnswers(answers, needed)
    if (message) {
      setError(message)
      return
    }
    // Only the columns actually asked about, so a member answering one missing
    // field does not have another blanked.
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
      toast.success('Saved')
      // refreshProfile flips `show` to false, unmounting the gate.
    } catch {
      toast.error('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [user, answers, needed, refreshProfile, toast])

  // Blocking gate: `dismissible={false}` = no backdrop tap, no Escape, no drag.
  return (
    <Modal
      open={show}
      onClose={() => {}}
      dismissible={false}
      keyboardAware
      ariaLabel={heading}
    >
        <div data-eos-id="src/components/dietary-gate.tsx#3" className="px-6 pt-7 pb-6 space-y-5">
          <div data-eos-id="src/components/dietary-gate.tsx#4" className="flex flex-col items-center text-center gap-3">
            <div data-eos-id="src/components/dietary-gate.tsx#5" className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <UtensilsCrossed data-eos-id="src/components/dietary-gate.tsx#6" size={22} className="text-primary-800" />
            </div>
            <h2 data-eos-id="src/components/dietary-gate.tsx#7" id="dietary-gate-title" className="font-heading text-xl font-bold text-neutral-900">
              {heading}
            </h2>
            <p data-eos-id="src/components/dietary-gate.tsx#8" className="text-sm text-neutral-500 leading-relaxed">
              You have a spot at an upcoming event. We cater for camp-outs and
              ticketed events, and our leaders need to know about allergies,
              medical needs, dietary requirements, who to call in an emergency
              and who can get in on unsealed roads.
            </p>
          </div>

          <SafetyRequirementsFields
            value={answers}
            onChange={patch}
            needed={needed}
            disabled={saving}
          />

          {error && <p data-eos-id="src/components/dietary-gate.tsx#15" className="text-xs text-error-500">{error}</p>}

          <Button data-eos-id="src/components/dietary-gate.tsx#16"
            variant="primary"
            fullWidth
            loading={saving}
            onClick={handleSave}
          >
            Save and continue
          </Button>
        </div>
    </Modal>
  )
}

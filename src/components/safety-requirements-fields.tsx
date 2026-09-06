import { Input } from '@/components/input'
import { FourWheelDriveField, FOUR_WHEEL_DRIVE_HELP } from '@/components/four-wheel-drive-field'
import { NO_DIETARY_SENTINEL, NO_MEDICAL_SENTINEL } from '@/lib/dietary'
import type { SafetyAnswers, SafetyFieldsNeeded } from '@/lib/safety-requirements'

/* ------------------------------------------------------------------ */
/*  SafetyRequirementsFields - the one safety capture form.            */
/*                                                                     */
/*  dietary-gate.tsx, campout-requirements-modal.tsx and               */
/*  campout-guest-requirements-modal.tsx each carried their own copy   */
/*  of this field set, its placeholders, its maxLengths and its four   */
/*  validation strings. That copy has already drifted once with        */
/*  consequences: commit 65646d56 added the emergency contact to two   */
/*  of the three paths and campout-type.tsx kept its old two-field     */
/*  signature, so every camp-out booking posted an empty emergency     */
/*  contact into a server that hard-requires one. Kurt, 2026-08-25:    */
/*  "half of the people don't have their emergency contacts on there   */
/*  so I'm having to email many people individually."                  */
/*                                                                     */
/*  This component is PRESENTATIONAL ONLY, and deliberately so. The    */
/*  three shells keep their genuinely different persistence: the       */
/*  purchase modal and the app-open gate write to the signed-in        */
/*  profile, the guest modal hands answers back through onSubmit for   */
/*  guest-ticket-checkout to persist onto the provisioned profile.     */
/*  Merging those would change behaviour on the payment path.          */
/*  `src/lib/dietary.ts`'s predicates are untouched.                   */
/*                                                                     */
/*  `validateSafetyAnswers` lives here beside the fields rather than   */
/*  in each shell, because a form and the rule that decides it is      */
/*  answered are one thing: splitting them is how a field gets asked   */
/*  for on one path and not required on another.                       */
/*                                                                     */
/*  4WD IS ABSENT FROM THE GUEST PATH BY DESIGN, not by omission: a    */
/*  guest has no profile row to write to, and their four-wheel drive   */
/*  is collected by the organiser-authored per-event question instead  */
/*  (see safety-gate-coverage.test.ts). Callers say so by passing      */
/*  `fourWheelDrive: false` in `needed`.                               */
/* ------------------------------------------------------------------ */

interface Props {
  value: SafetyAnswers
  /** Receives only the keys that changed. */
  onChange: (patch: Partial<SafetyAnswers>) => void
  needed: SafetyFieldsNeeded
  /** Mid-save: the quick-fills and the 4WD control stop responding. */
  disabled?: boolean
}

export function SafetyRequirementsFields({ value, onChange, needed, disabled = false }: Props) {
  return (
    <>
      {needed.dietary && (
        <div className="space-y-1.5">
          <Input
            type="textarea"
            label="Dietary requirements"
            value={value.dietary}
            onChange={(e) => onChange({ dietary: e.target.value })}
            placeholder="e.g. Vegetarian, gluten free, vegan..."
            rows={2}
            maxLength={500}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ dietary: NO_DIETARY_SENTINEL })}
            className="text-xs font-medium text-neutral-500 underline underline-offset-2"
          >
            No dietary requirements
          </button>
        </div>
      )}

      {needed.medical && (
        <div className="space-y-1.5">
          <Input
            type="textarea"
            label="Medical / allergy info"
            value={value.medical}
            onChange={(e) => onChange({ medical: e.target.value })}
            placeholder="e.g. Asthma, EpiPen for nut allergy..."
            rows={2}
            maxLength={500}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ medical: NO_MEDICAL_SENTINEL })}
            className="text-xs font-medium text-neutral-500 underline underline-offset-2"
          >
            No medical needs or allergies
          </button>
        </div>
      )}

      {needed.emergency && (
        // Grouped in its own card, as the gate and the guest modal already
        // did, so the three fields read as one contact rather than three
        // unrelated inputs. The labels stay fully explicit ("Emergency
        // contact name", not "Their name") so each one still says what it is
        // when read alone by a screen reader.
        <div className="space-y-2.5 rounded-md border border-neutral-100 bg-neutral-50/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Emergency contact
          </p>
          <Input
            label="Emergency contact name"
            value={value.emergencyName}
            onChange={(e) => onChange({ emergencyName: e.target.value })}
            placeholder="e.g. Sam Rivers"
            maxLength={120}
          />
          <Input
            type="tel"
            label="Emergency contact phone"
            value={value.emergencyPhone}
            onChange={(e) => onChange({ emergencyPhone: e.target.value })}
            placeholder="e.g. 0400 000 000"
            maxLength={40}
          />
          <Input
            label="Relationship (optional)"
            value={value.emergencyRelationship}
            onChange={(e) => onChange({ emergencyRelationship: e.target.value })}
            placeholder="e.g. Partner, parent, friend"
            maxLength={80}
          />
        </div>
      )}

      {needed.fourWheelDrive && (
        <FourWheelDriveField
          value={value.fourWheelDrive}
          onChange={(v) => onChange({ fourWheelDrive: v })}
          disabled={disabled}
          helpText={FOUR_WHEEL_DRIVE_HELP}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  The safety set: what it holds, when it is answered, where it lands. */
/*                                                                     */
/*  Split out of safety-requirements-fields.tsx only because exporting */
/*  constants beside a component breaks react-refresh. It is one thing */
/*  with that file: the form and the rule that decides it is answered. */
/*  Splitting THOSE is how a field gets asked for on one path and not   */
/*  required on another, which is the 65646d56 incident exactly.        */
/*                                                                     */
/*  This is the shared half of dietary-gate.tsx,                       */
/*  campout-requirements-modal.tsx and                                  */
/*  campout-guest-requirements-modal.tsx. `src/lib/dietary.ts`'s        */
/*  eligibility predicates are a separate concern and are untouched.    */
/* ------------------------------------------------------------------ */

/** Everything the safety set can capture. `fourWheelDrive: null` = unanswered. */
export interface SafetyAnswers {
  dietary: string
  medical: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  fourWheelDrive: boolean | null
}

/** Which parts of the set this caller is actually asking for. */
export interface SafetyFieldsNeeded {
  dietary: boolean
  medical: boolean
  emergency: boolean
  fourWheelDrive: boolean
}

export const EMPTY_SAFETY_ANSWERS: SafetyAnswers = {
  dietary: '',
  medical: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  fourWheelDrive: null,
}

/**
 * The exact words each unanswered field gets, in the exact order they fire.
 * One copy, so a reword reaches every path at once.
 */
export const SAFETY_VALIDATION_MESSAGES = {
  dietary: 'Tell us your dietary requirements, or tap "None"',
  medical: 'Tell us your medical / allergy info, or tap "None"',
  emergencyName: 'Give us an emergency contact name',
  emergencyPhone: 'Give us a phone number for your emergency contact',
  fourWheelDrive: 'Let us know whether you have a four-wheel drive',
} as const

/** Answers with every string trimmed, which is what every caller persists. */
export function trimSafetyAnswers(answers: SafetyAnswers): SafetyAnswers {
  return {
    dietary: answers.dietary.trim(),
    medical: answers.medical.trim(),
    emergencyName: answers.emergencyName.trim(),
    emergencyPhone: answers.emergencyPhone.trim(),
    emergencyRelationship: answers.emergencyRelationship.trim(),
    fourWheelDrive: answers.fourWheelDrive,
  }
}

/**
 * The first thing wrong with these answers, or null if they pass.
 *
 * An explicit "None" is a valid answer and a blank is not, which is why every
 * check reads the TRIMMED value: whitespace is not an answer. The emergency
 * contact has no "None" escape at all, because a remote camp-out with nobody
 * to call is the one gap that cannot be answered with a shrug. Relationship
 * stays optional. Four-wheel drive is checked against null rather than
 * falsiness, because `false` is a real answer we have to be able to store.
 */
export function validateSafetyAnswers(
  answers: SafetyAnswers,
  needed: SafetyFieldsNeeded,
): string | null {
  const t = trimSafetyAnswers(answers)
  if (needed.dietary && !t.dietary) return SAFETY_VALIDATION_MESSAGES.dietary
  if (needed.medical && !t.medical) return SAFETY_VALIDATION_MESSAGES.medical
  if (needed.emergency && !t.emergencyName) return SAFETY_VALIDATION_MESSAGES.emergencyName
  if (needed.emergency && !t.emergencyPhone) return SAFETY_VALIDATION_MESSAGES.emergencyPhone
  if (needed.fourWheelDrive && t.fourWheelDrive === null) return SAFETY_VALIDATION_MESSAGES.fourWheelDrive
  return null
}

/**
 * The profile columns these answers write, built once so the purchase modal
 * and the app-open gate cannot disagree about which column a field lands in.
 * Only the parts actually asked for are included: a buyer answering just the
 * emergency contact must not have their stored dietary answer overwritten
 * with a blank. A blank relationship is omitted for the same reason.
 */
export interface SafetyProfileUpdates {
  dietary_requirements?: string
  medical_requirements?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  has_four_wheel_drive?: boolean
}

export function safetyProfileUpdates(
  answers: SafetyAnswers,
  needed: SafetyFieldsNeeded,
): SafetyProfileUpdates {
  const t = trimSafetyAnswers(answers)
  const updates: SafetyProfileUpdates = {}
  if (needed.dietary) updates.dietary_requirements = t.dietary
  if (needed.medical) updates.medical_requirements = t.medical
  if (needed.emergency) {
    updates.emergency_contact_name = t.emergencyName
    updates.emergency_contact_phone = t.emergencyPhone
    if (t.emergencyRelationship) updates.emergency_contact_relationship = t.emergencyRelationship
  }
  if (needed.fourWheelDrive && t.fourWheelDrive !== null) {
    updates.has_four_wheel_drive = t.fourWheelDrive
  }
  return updates
}

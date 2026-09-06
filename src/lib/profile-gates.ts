/* ------------------------------------------------------------------ */
/*  Blocking profile gates: who sees which one, and in what order.     */
/*                                                                     */
/*  Three gates can block a signed-in member on app open: PhoneGate,   */
/*  BirthdayPromptGate and DietaryGate. Each is a Modal with           */
/*  dismissible={false}, so two showing at once is two undismissable   */
/*  sheets stacked on one screen with no way past either.              */
/*                                                                     */
/*  That ordering used to live in two of the three components as prose */
/*  and a hand-written predicate clause, and the third had no ordering */
/*  at all. Consolidation 2026-09-06 found the consequence: the        */
/*  birthday gate checked only `!profile.date_of_birth`, with no       */
/*  `onboarding_completed` term and no phone precedence, while         */
/*  mounting at the App root OUTSIDE every <Routes>. Onboarding writes */
/*  date_of_birth nowhere (probed: zero occurrences under             */
/*  src/pages/onboarding), so EVERY brand-new user has it null from    */
/*  the moment a profile row exists, and met a blocking birthday sheet */
/*  on top of the onboarding flow itself. It was survivable only       */
/*  because that gate's blocking was fake and a swipe dismissed it;    */
/*  closing that hole (4.F4) turned a papered-over defect into a hard  */
/*  block on the app's front door.                                     */
/*                                                                     */
/*  So the order is stated ONCE, here, as pure predicates over the     */
/*  profile, and asserted TOTAL by test: for any profile, at most one  */
/*  gate is eligible.                                                  */
/*                                                                     */
/*    1. PhoneGate     - no number on file. Leaders ring it on event   */
/*                       day, so nothing else matters until it exists. */
/*    2. BirthdayGate  - no date_of_birth, once a phone exists.        */
/*    3. DietaryGate   - the safety set, once phone and birthday do.   */
/*                       It ALSO runs an async eligibility query (does */
/*                       this member hold a live seat at an upcoming   */
/*                       event that requires the set), which is why it */
/*                       stays its own component rather than folding   */
/*                       into one config-driven gate.                  */
/*                                                                     */
/*  Every gate is off entirely until onboarding_completed, because     */
/*  onboarding runs in its own shell and asks for these things itself. */
/* ------------------------------------------------------------------ */

/** The profile shape these predicates read. Deliberately structural. */
export interface GateProfile {
  onboarding_completed?: boolean | null
  phone?: string | null
  date_of_birth?: string | null
}

const filled = (v: string | null | undefined): boolean => !!(v ?? '').trim()

/** Onboarded members only. Onboarding asks for these things in its own flow. */
export function gatesApply(profile: GateProfile | null | undefined): boolean {
  return !!profile && profile.onboarding_completed === true
}

export function needsPhoneGate(profile: GateProfile | null | undefined): boolean {
  return gatesApply(profile) && !filled(profile!.phone)
}

export function needsBirthdayGate(profile: GateProfile | null | undefined): boolean {
  // Phone precedence: never stack on top of PhoneGate.
  return gatesApply(profile) && filled(profile!.phone) && !filled(profile!.date_of_birth)
}

/**
 * Whether DietaryGate may even ASK. It still needs its own async eligibility
 * query and its own per-field emptiness checks on top of this; this is only
 * the ordering half, so it cannot stack on the two gates above.
 */
export function dietaryGateOrderAllows(profile: GateProfile | null | undefined): boolean {
  return gatesApply(profile) && filled(profile!.phone) && filled(profile!.date_of_birth)
}

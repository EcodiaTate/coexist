/**
 * Survey question types and pure helpers.
 *
 * Lives in its own module (not survey-questions.tsx) so that fast-refresh
 * works on the SurveyQuestions component - the rule requires component
 * files to export only components.
 */

export interface SurveyQuestion {
  id: string
  type: string
  text: string
  description?: string
  options?: string[]
  allow_other?: boolean
  required?: boolean
  profile_field?: string
  placeholder?: string
  // Scale / rating
  min_value?: number
  max_value?: number
  min_label?: string
  max_label?: string
  star_count?: number
  // Number constraints
  number_min?: number
  number_max?: number
  number_step?: number
  // Text constraints
  text_min_length?: number
  text_max_length?: number
  text_multiline?: boolean
  // Date constraints
  date_min?: string
  date_max?: string
  // Impact metric mapping (number questions only)
  impact_metric?: string
  // Pre-fill value seeded by the page-level form on first render. Used for
  // Co-Exist impact-form questions where the Microsoft Form historically
  // came pre-filled with "No" (Issues, Highlights, Grant Project), so the
  // leader can hit submit unchanged. Renderer reads answers[id] only;
  // page-level form is responsible for seeding the initial state from this.
  default_value?: unknown
  // Conditional visibility: only render this question when another question's
  // answer matches. Used in Co-Exist impact form:
  //   - q1_name / q2 (Landcare) / q3 (OzFish) only when q1 (other_group) = Yes
  //   - q7 (what was collected) only when q6 (collect_anything) = Yes
  // Hidden questions are NOT included in canSubmit's required check.
  show_if?: { question_id: string; equals: unknown }
}

// Returns true when the question should be rendered given the current answers.
// A question with no show_if is always visible. With show_if, visible iff
// answers[show_if.question_id] === show_if.equals (string-equality, the
// only kind we use for yes/no gating).
export function isQuestionVisible(
  q: SurveyQuestion,
  answers: Record<string, unknown>,
): boolean {
  if (!q.show_if) return true
  return answers[q.show_if.question_id] === q.show_if.equals
}

// Strip hidden-conditional answers before persisting. When a leader fills q7
// "What and how much?" after picking q6=Yes, then flips q6 back to No, the
// renderer correctly hides q7, but the surveyAnswers state still carries
// the typed value. Submitting that raw state would leak the stale answer to
// survey_responses.answers and onto the sheet via the bi-directional sync.
// This helper drops any answer whose owning question is currently hidden,
// so the persisted JSONB matches what the leader sees on screen.
//
// Safe for required-when-visible questions: canSubmitSurvey already gates
// submission on visible-required, so a hidden required question is by
// definition not required at that moment and dropping its answer is correct.
export function stripHiddenAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const visibleIds = new Set(
    questions.filter((q) => isQuestionVisible(q, answers)).map((q) => q.id),
  )
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(answers)) {
    if (visibleIds.has(k)) cleaned[k] = v
  }
  return cleaned
}

/**
 * Canonical "is this answer filled?" predicate. Single source of truth for
 * every survey surface's required-question gate (log-impact, post-event
 * survey, task survey modal). Prior to 2026-07 each surface re-implemented
 * this inline and diverged, producing false "you haven't filled all
 * required sections" errors on genuinely-answered questions.
 *
 * A value counts as answered when it holds real content:
 *   - undefined / null                       -> NOT answered
 *   - empty string or whitespace-only string -> NOT answered
 *   - empty array (unselected multi-select)  -> NOT answered
 *   - the number 0 (a valid scale/rating)    -> ANSWERED
 *   - boolean false                          -> ANSWERED
 *   - any non-empty string / array / object  -> ANSWERED
 *
 * The 0 / false cases are load-bearing: a linear scale can start at 0 and a
 * naive `!value` or `value !== ''` check that treats those as blank blocks
 * submission of a fully-answered survey.
 */
export function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * Ids of required questions that are currently VISIBLE (show_if satisfied)
 * and not yet answered. Callers gate submission on this returning an empty
 * array.
 *
 * The visibility filter is essential: a required conditional question whose
 * parent answer hides it MUST NOT block submission - it cannot be answered
 * while hidden, so counting it produces a permanent, unfixable "incomplete"
 * state (the task survey modal had exactly this bug because it omitted the
 * filter).
 */
export function computeMissingRequired(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): string[] {
  return questions
    .filter((q) => q.required)
    .filter((q) => isQuestionVisible(q, answers))
    .filter((q) => !isAnswered(answers[q.id]))
    .map((q) => q.id)
}

/**
 * Seed profile_autofill answers from the signed-in profile (+ their
 * collective). profile_autofill questions render READ-ONLY: the renderer
 * displays the value but never calls setAnswer for them, so their answer
 * must be seeded into form state or a required profile_autofill question can
 * never be satisfied - the leader/attendee sees their name on screen yet the
 * gate reports the field missing and submission is blocked forever. The two
 * event survey surfaces (log-impact, post-event survey) previously did no
 * such seeding; this helper unifies the behaviour with the task survey modal.
 *
 * `profile_field` may be a plain profile column ("display_name", "postcode")
 * or a "collective.<field>" reference resolved against the collective arg.
 */
export function seedProfileAutofill(
  questions: SurveyQuestion[],
  profile: Record<string, unknown> | null | undefined,
  collective?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!profile && !collective) return {}
  const seeded: Record<string, unknown> = {}
  for (const q of questions) {
    if (q.type !== 'profile_autofill' || !q.profile_field) continue
    const field = q.profile_field
    let value: unknown = null
    if (field.startsWith('collective.')) {
      const cf = field.replace('collective.', '')
      if (collective) value = collective[cf]
    } else if (profile) {
      value = profile[field]
      if (Array.isArray(value)) value = value.join(', ')
    }
    if (value !== undefined && value !== null && value !== '') {
      seeded[q.id] = String(value)
    }
  }
  return seeded
}

/**
 * Resolve "other" write-in values into final answers.
 * Call before submitting to replace __other__ placeholders.
 */
export function resolveOtherValues(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
  otherValues: Record<string, string>,
): Record<string, unknown> {
  const finalAnswers = { ...answers }
  for (const [qId, otherVal] of Object.entries(otherValues)) {
    if (!otherVal.trim()) continue
    const q = questions.find((q) => q.id === qId)
    if (!q) continue
    if (q.type === 'multiple_choice' || q.type === 'dropdown') {
      if (finalAnswers[qId] === '__other__') {
        finalAnswers[qId] = `Other: ${otherVal}`
      }
    } else if (q.type === 'checkbox') {
      const arr = (finalAnswers[qId] as string[]) ?? []
      if (arr.includes('__other__')) {
        finalAnswers[qId] = [...arr.filter((o) => o !== '__other__'), `Other: ${otherVal}`]
      }
    }
  }
  return finalAnswers
}

/**
 * Parse raw JSONB questions from the surveys table into typed SurveyQuestion[].
 * Returns [] on any parse/shape error rather than throwing - a malformed
 * questions blob shouldn't crash the survey renderer or the admin lists.
 */
export function parseSurveyQuestions(raw: unknown): SurveyQuestion[] {
  let parsed: unknown
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return []
  }
  return (Array.isArray(parsed) ? parsed : [])
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object' && typeof (q as Record<string, unknown>).id === 'string' && !!(q as Record<string, unknown>).id)
    .map((q) => ({
      id: q.id as string,
      type: (q.type as string) || 'free_text',
      text: (q.text as string) || '',
      description: (q.description as string) || undefined,
      options: Array.isArray(q.options) ? (q.options as string[]) : undefined,
      allow_other: (q.allow_other as boolean) || undefined,
      required: (q.required as boolean) || undefined,
      profile_field: (q.profile_field as string) || undefined,
      placeholder: (q.placeholder as string) || undefined,
      min_value: (q.min_value as number) ?? undefined,
      max_value: (q.max_value as number) ?? undefined,
      min_label: (q.min_label as string) || undefined,
      max_label: (q.max_label as string) || undefined,
      star_count: (q.star_count as number) ?? undefined,
      number_min: (q.number_min as number) ?? undefined,
      number_max: (q.number_max as number) ?? undefined,
      number_step: (q.number_step as number) ?? undefined,
      text_min_length: (q.text_min_length as number) ?? undefined,
      text_max_length: (q.text_max_length as number) ?? undefined,
      text_multiline: (q.text_multiline as boolean) ?? undefined,
      date_min: (q.date_min as string) || undefined,
      date_max: (q.date_max as string) || undefined,
      impact_metric: (q.impact_metric as string) || undefined,
      default_value: (q as Record<string, unknown>).default_value,
      show_if: (() => {
        const raw = (q as Record<string, unknown>).show_if as
          | { question_id?: unknown; equals?: unknown }
          | undefined
        if (!raw || typeof raw !== 'object') return undefined
        if (typeof raw.question_id !== 'string') return undefined
        return { question_id: raw.question_id, equals: raw.equals }
      })(),
    }))
}

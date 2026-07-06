import { describe, it, expect } from 'vitest'
import {
  isAnswered,
  computeMissingRequired,
  seedProfileAutofill,
  type SurveyQuestion,
} from '@/components/survey-questions-utils'

/**
 * Regression coverage for the field-reported "Post-event survey won't submit
 * - it says I haven't filled all required sections but I definitely have."
 *
 * Each `describe` reconstructs the OLD inline gate that shipped on a survey
 * surface and shows it FALSELY blocks (or falsely passes) a genuinely-answered
 * survey, then asserts the new canonical gate is correct.
 */

// ── The exact inline gate that shipped in post-event-survey.tsx ──────────────
function oldPostEventGate(questions: SurveyQuestion[], answers: Record<string, unknown>): boolean {
  const requiredKeys = questions
    .filter((q) => q.required)
    .filter((q) => !q.show_if || answers[q.show_if.question_id] === q.show_if.equals)
    .map((q) => q.id)
  return requiredKeys.every((key) => {
    const val = answers[key]
    return val !== undefined && val !== null && val !== ''
  })
}

// ── The exact inline gate that shipped in task-survey-modal.tsx ──────────────
// (note: NO visibility filter - that was the bug)
function oldTaskModalGate(questions: SurveyQuestion[], answers: Record<string, unknown>): boolean {
  return questions.every((q) => {
    if (!q.required) return true
    const val = answers[q.id]
    if (val === undefined || val === null || val === '') return false
    if (q.type === 'checkbox' && Array.isArray(val) && val.length === 0) return false
    return true
  })
}

describe('isAnswered - value recognition per type', () => {
  it('treats 0 and false as answered (scale can start at 0)', () => {
    expect(isAnswered(0)).toBe(true)
    expect(isAnswered(false)).toBe(true)
  })
  it('treats blank / whitespace / empty array as not answered', () => {
    expect(isAnswered(undefined)).toBe(false)
    expect(isAnswered(null)).toBe(false)
    expect(isAnswered('')).toBe(false)
    expect(isAnswered('   ')).toBe(false)
    expect(isAnswered([])).toBe(false)
  })
  it('treats real content as answered', () => {
    expect(isAnswered('No')).toBe(true)
    expect(isAnswered(4)).toBe(true)
    expect(isAnswered(['Litter'])).toBe(true)
  })
})

describe('BUG: unselected/whitespace required question slips through the old post-event gate', () => {
  const questions: SurveyQuestion[] = [
    { id: 'multi', type: 'checkbox', text: 'Pick some', required: true, options: ['a', 'b'] },
    { id: 'txt', type: 'free_text', text: 'Notes', required: true },
  ]
  const bogus = { multi: [], txt: '   ' } // nothing really answered

  it('old gate FALSELY passes (data-integrity hole)', () => {
    expect(oldPostEventGate(questions, bogus)).toBe(true)
  })
  it('new gate correctly reports both missing', () => {
    expect(computeMissingRequired(questions, bogus)).toEqual(['multi', 'txt'])
  })
  it('new gate passes once genuinely answered', () => {
    expect(computeMissingRequired(questions, { multi: ['a'], txt: 'hello' })).toEqual([])
  })
})

describe('BUG: hidden conditional required question permanently blocks the old task-modal gate', () => {
  // Mirrors the Clean Up impact form: q6 yes/no gates q7 (required).
  const questions: SurveyQuestion[] = [
    { id: 'q6', type: 'yes_no', text: 'Collect anything?', required: true },
    { id: 'q7', type: 'free_text', text: 'What and how much?', required: true, show_if: { question_id: 'q6', equals: 'Yes' } },
  ]
  // Leader answered the only VISIBLE required question ("No"); q7 is hidden.
  const answers = { q6: 'No' }

  it('old task-modal gate FALSELY blocks (q7 can never be answered while hidden)', () => {
    expect(oldTaskModalGate(questions, answers)).toBe(false)
  })
  it('new gate correctly allows submit (hidden question is not counted)', () => {
    expect(computeMissingRequired(questions, answers)).toEqual([])
  })
  it('new gate requires q7 once it is revealed by q6 = Yes', () => {
    expect(computeMissingRequired(questions, { q6: 'Yes' })).toEqual(['q7'])
    expect(computeMissingRequired(questions, { q6: 'Yes', q7: '3kg litter' })).toEqual([])
  })
})

describe('BUG: read-only profile_autofill required question is never satisfiable without seeding', () => {
  const questions: SurveyQuestion[] = [
    { id: 'pc', type: 'profile_autofill', text: 'Postcode', required: true, profile_field: 'postcode' },
    { id: 'st', type: 'profile_autofill', text: 'State', required: true, profile_field: 'collective.state' },
  ]

  it('without seeding the gate blocks even though the value is on screen', () => {
    expect(computeMissingRequired(questions, {})).toEqual(['pc', 'st'])
  })

  it('seedProfileAutofill resolves profile + collective fields', () => {
    const seeded = seedProfileAutofill(questions, { postcode: '3220' }, { state: 'VIC' })
    expect(seeded).toEqual({ pc: '3220', st: 'VIC' })
    expect(computeMissingRequired(questions, seeded)).toEqual([])
  })
})

describe('BUG: editing one field must not drop previously-saved answers (post-event merge)', () => {
  const questions: SurveyQuestion[] = [
    { id: 'q1', type: 'rating', text: 'Overall', required: true },
    { id: 'q2', type: 'scale', text: 'Wellbeing', required: true },
  ]
  const existing = { q1: 5, q2: 4 } // a prior submitted response

  it('OLD merge (replace) drops q2 when the user re-taps q1', () => {
    const userAnswers = { q1: 4 }
    const oldAnswers = Object.keys(userAnswers).length > 0 ? userAnswers : existing
    expect(computeMissingRequired(questions, oldAnswers)).toEqual(['q2']) // false block
  })
  it('NEW merge keeps q2', () => {
    const userAnswers = { q1: 4 }
    const merged = { ...existing, ...userAnswers }
    expect(computeMissingRequired(questions, merged)).toEqual([])
    expect(merged.q1).toBe(4) // edit applied
  })
})

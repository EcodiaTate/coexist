import { useState } from 'react'
import { CheckCircle, Star, UserCircle } from 'lucide-react'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Shared survey question type                                        */
/* ------------------------------------------------------------------ */

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
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  display_name: 'Display Name',
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  age: 'Age',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  pronouns: 'Pronouns',
  location: 'Location',
  postcode: 'Postcode',
  instagram_handle: 'Instagram Handle',
  bio: 'Bio',
  membership_level: 'Membership Level',
  interests: 'Interests',
  accessibility_requirements: 'Accessibility Requirements',
  emergency_contact_name: 'Emergency Contact Name',
  emergency_contact_phone: 'Emergency Contact Phone',
  'collective.name': 'Collective Name',
  'collective.state': 'Collective State',
  'collective.region': 'Collective Region',
  'collective.role': 'Role in Collective',
}

/* ------------------------------------------------------------------ */
/*  Renderer                                                           */
/* ------------------------------------------------------------------ */

export function SurveyQuestionRenderer({
  questions,
  answers,
  setAnswer,
  numbered = true,
  className,
}: {
  questions: SurveyQuestion[]
  answers: Record<string, unknown>
  setAnswer: (id: string, value: unknown) => void
  /** Show question numbers (default true) */
  numbered?: boolean
  className?: string
}) {
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})

  const toggleCheckbox = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) ?? []
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option]
    setAnswer(questionId, next)
  }

  return (
    <div className={cn('space-y-5', className)}>
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <div>
            <p className="text-sm font-medium text-primary-800">
              {numbered && <span className="text-primary-400 mr-1.5">{i + 1}.</span>}
              {q.text}
              {q.required && <span className="text-error-500 ml-0.5">*</span>}
            </p>
            {q.description && (
              <p className="text-xs text-primary-400 mt-0.5 ml-5">{q.description}</p>
            )}
          </div>

          {/* Rating (stars) */}
          {q.type === 'rating' && (
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: q.star_count ?? 5 }, (_, idx) => idx + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-colors',
                    (answers[q.id] as number) >= n
                      ? 'bg-warning-100 text-warning-600'
                      : 'bg-primary-50 text-primary-300 hover:bg-primary-100',
                  )}
                >
                  <Star size={18} fill={(answers[q.id] as number) >= n ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          )}

          {/* Linear Scale */}
          {q.type === 'scale' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {q.min_label && (
                  <span className="text-[11px] text-primary-400 shrink-0">{q.min_label}</span>
                )}
                <div className="flex gap-1 flex-wrap">
                  {Array.from(
                    { length: (q.max_value ?? 10) - (q.min_value ?? 1) + 1 },
                    (_, idx) => (q.min_value ?? 1) + idx,
                  ).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(q.id, n)}
                      className={cn(
                        'flex items-center justify-center min-w-[36px] h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors',
                        answers[q.id] === n
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {q.max_label && (
                  <span className="text-[11px] text-primary-400 shrink-0">{q.max_label}</span>
                )}
              </div>
            </div>
          )}

          {/* Multiple Choice (single select) */}
          {q.type === 'multiple_choice' && q.options && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(q.id, opt)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors',
                      answers[q.id] === opt
                        ? 'bg-primary-600 text-white'
                        : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
                    )}
                  >
                    {opt}
                  </button>
                ))}
                {q.allow_other && (
                  <button
                    type="button"
                    onClick={() => setAnswer(q.id, '__other__')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border border-dashed',
                      answers[q.id] === '__other__'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-primary-500 border-primary-300 hover:bg-primary-50',
                    )}
                  >
                    Other...
                  </button>
                )}
              </div>
              {q.allow_other && answers[q.id] === '__other__' && (
                <Input
                  value={otherValues[q.id] ?? ''}
                  onChange={(e) => setOtherValues((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your answer..."
                />
              )}
            </div>
          )}

          {/* Checkbox (multi-select) */}
          {q.type === 'checkbox' && q.options && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((opt) => {
                  const selected = ((answers[q.id] as string[]) ?? []).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleCheckbox(q.id, opt)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors',
                        selected
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
                      )}
                    >
                      {selected && <CheckCircle size={10} className="inline mr-1" />}
                      {opt}
                    </button>
                  )
                })}
                {q.allow_other && (
                  <button
                    type="button"
                    onClick={() => toggleCheckbox(q.id, '__other__')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border border-dashed',
                      ((answers[q.id] as string[]) ?? []).includes('__other__')
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-primary-500 border-primary-300 hover:bg-primary-50',
                    )}
                  >
                    Other...
                  </button>
                )}
              </div>
              {q.allow_other && ((answers[q.id] as string[]) ?? []).includes('__other__') && (
                <Input
                  value={otherValues[q.id] ?? ''}
                  onChange={(e) => setOtherValues((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your answer..."
                />
              )}
            </div>
          )}

          {/* Dropdown */}
          {q.type === 'dropdown' && q.options && (
            <div className="space-y-1.5">
              <Dropdown
                options={[
                  ...(q.options ?? []).map((opt) => ({ value: opt, label: opt })),
                  ...(q.allow_other ? [{ value: '__other__', label: 'Other...' }] : []),
                ]}
                value={(answers[q.id] as string) ?? ''}
                onChange={(v) => setAnswer(q.id, v)}
                placeholder="Select an option..."
              />
              {q.allow_other && answers[q.id] === '__other__' && (
                <Input
                  value={otherValues[q.id] ?? ''}
                  onChange={(e) => setOtherValues((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your answer..."
                />
              )}
            </div>
          )}

          {/* Yes/No */}
          {q.type === 'yes_no' && (
            <div className="flex gap-2">
              {['Yes', 'No'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(q.id, opt)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors',
                    answers[q.id] === opt
                      ? 'bg-primary-600 text-white'
                      : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Free Text */}
          {q.type === 'free_text' && (
            <div className="space-y-1">
              <Input
                type={q.text_multiline !== false ? 'textarea' : 'text'}
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder={q.placeholder || 'Your answer...'}
                rows={q.text_multiline !== false ? 3 : undefined}
                maxLength={q.text_max_length}
              />
              {(q.text_min_length || q.text_max_length) && (
                <p className="text-[10px] text-primary-400">
                  {((answers[q.id] as string) ?? '').length}
                  {q.text_max_length ? ` / ${q.text_max_length}` : ''}
                  {' characters'}
                  {q.text_min_length ? ` (min ${q.text_min_length})` : ''}
                </p>
              )}
            </div>
          )}

          {/* Number */}
          {q.type === 'number' && (
            <div className="space-y-1">
              <Input
                type="number"
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder={q.placeholder || 'Enter a number...'}
                min={q.number_min != null ? String(q.number_min) : undefined}
                max={q.number_max != null ? String(q.number_max) : undefined}
              />
              {(q.number_min != null || q.number_max != null) && (
                <p className="text-[10px] text-primary-400">
                  {q.number_min != null ? `Min: ${q.number_min}` : ''}
                  {q.number_min != null && q.number_max != null ? ' · ' : ''}
                  {q.number_max != null ? `Max: ${q.number_max}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Date */}
          {q.type === 'date' && (
            <Input
              type="date"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              min={q.date_min}
              max={q.date_max}
            />
          )}

          {/* Email */}
          {q.type === 'email' && (
            <Input
              type="email"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={q.placeholder || 'email@example.com'}
            />
          )}

          {/* Phone */}
          {q.type === 'phone' && (
            <Input
              type="tel"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={q.placeholder || '0400 000 000'}
            />
          )}

          {/* Profile Autofill */}
          {q.type === 'profile_autofill' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-plum-50/60 border border-plum-100">
                <UserCircle size={16} className="text-plum-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-plum-400">
                    {PROFILE_FIELD_LABELS[q.profile_field ?? ''] ?? 'Profile field'}
                  </p>
                  <p className="text-sm font-medium text-primary-800 truncate">
                    {(answers[q.id] as string) || ''}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-primary-400 px-1">
                Auto-filled from your profile
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
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
 */
export function parseSurveyQuestions(raw: unknown): SurveyQuestion[] {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  return (Array.isArray(parsed) ? parsed : []).map(
    (q: Record<string, unknown>) => ({
      id: (q.id as string) || crypto.randomUUID(),
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
    }),
  )
}

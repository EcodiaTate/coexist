import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Star, UserCircle, X } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SurveyQuestion {
  id: string
  type: string
  text: string
  description?: string
  options?: string[]
  allow_other?: boolean
  required?: boolean
  profile_field?: string
  placeholder?: string
  min_value?: number
  max_value?: number
  min_label?: string
  max_label?: string
  star_count?: number
  number_min?: number
  number_max?: number
  number_step?: number
  text_min_length?: number
  text_max_length?: number
  text_multiline?: boolean
  date_min?: string
  date_max?: string
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
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

function useSurveyDetail(surveyId: string | null) {
  return useQuery({
    queryKey: ['survey-detail', surveyId],
    queryFn: async () => {
      if (!surveyId) return null
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, questions')
        .eq('id', surveyId)
        .single()
      if (error) throw error
      const questions: SurveyQuestion[] =
        typeof data.questions === 'string' ? JSON.parse(data.questions) : (data.questions ?? [])
      return { ...data, questions }
    },
    enabled: !!surveyId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/** Fetch the user's collective (name, state, region, role) for autofill */
function useUserCollective(collectiveId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user-collective-autofill', collectiveId, user?.id],
    queryFn: async () => {
      if (!collectiveId || !user) return null
      const [{ data: collective }, { data: membership }] = await Promise.all([
        supabase.from('collectives').select('name, state, region').eq('id', collectiveId).single(),
        supabase.from('collective_members').select('role').eq('collective_id', collectiveId).eq('user_id', user.id).maybeSingle(),
      ])
      return {
        name: collective?.name ?? null,
        state: collective?.state ?? null,
        region: collective?.region ?? null,
        role: membership?.role ?? null,
      }
    },
    enabled: !!collectiveId && !!user,
    staleTime: 5 * 60 * 1000,
  })
}

export function TaskSurveyModal({
  open,
  onClose,
  surveyId,
  collectiveId,
  onSubmit,
  submitting,
}: {
  open: boolean
  onClose: () => void
  surveyId: string
  collectiveId?: string
  onSubmit: (answers: Record<string, unknown>) => void
  submitting: boolean
}) {
  const { data: survey, isLoading } = useSurveyDetail(surveyId)
  const { profile } = useAuth()
  const { data: collective } = useUserCollective(collectiveId)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})

  const questions: SurveyQuestion[] = survey?.questions ?? []

  // Auto-fill profile and collective fields when questions load
  useEffect(() => {
    if (!questions.length || !profile) return
    const autofilled: Record<string, unknown> = {}
    for (const q of questions) {
      if (q.type === 'profile_autofill' && q.profile_field) {
        const field = q.profile_field
        let value: unknown = null

        if (field.startsWith('collective.')) {
          const collectiveField = field.replace('collective.', '')
          if (collective) {
            value = (collective as Record<string, unknown>)[collectiveField]
          }
        } else {
          value = (profile as Record<string, unknown>)[field]
          if (Array.isArray(value)) {
            value = value.join(', ')
          }
        }

        if (value !== undefined && value !== null && value !== '') {
          autofilled[q.id] = String(value)
        }
      }
    }
    if (Object.keys(autofilled).length > 0) {
      setAnswers((prev) => ({ ...autofilled, ...prev }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, profile, collective])

  const isAnswered = (q: SurveyQuestion) => {
    const val = answers[q.id]
    if (val === undefined || val === null || val === '') return false
    // For checkbox type, check array has items
    if (q.type === 'checkbox' && Array.isArray(val) && val.length === 0) return false
    return true
  }

  const allRequiredAnswered = questions.every((q) => {
    if (!q.required) return true
    return isAnswered(q)
  })

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleCheckbox = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) ?? []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [questionId]: next }
    })
  }

  const handleSubmit = () => {
    // Merge "other" values into answers
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
    onSubmit(finalAnswers)
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold text-primary-800">{survey?.title ?? 'Survey'}</h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full min-w-11 min-h-11 text-primary-400 hover:bg-primary-50 active:scale-[0.93] transition-[colors,transform] duration-150 cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      {isLoading ? (
        <Skeleton variant="list-item" count={4} />
      ) : !questions.length ? (
        <p className="text-sm text-primary-400 py-4">No questions found in this survey.</p>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-primary-400">
            Please complete this survey to finish the task.
          </p>

          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <div>
                <p className="text-sm font-medium text-primary-800">
                  <span className="text-primary-400 mr-1.5">{i + 1}.</span>
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
                  {Array.from({ length: q.star_count ?? 5 }, (_, i) => i + 1).map((n) => (
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

          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            loading={submitting}
            disabled={!allRequiredAnswered}
            icon={<CheckCircle size={15} />}
          >
            Submit Survey & Complete Task
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}

import { useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Star,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useEventDetail, ACTIVITY_TYPE_LABELS, isPastEvent } from '@/hooks/use-events'
import {
  Page,
  Header,
  Button,
  Input,
  Skeleton,
  EmptyState,
  WhatsNext,
} from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SurveyQuestion {
  id: string
  question_key: string
  question_text: string
  question_type: 'number' | 'rating' | 'free_text' | 'yes_no' | 'multiple_choice'
  unit: string | null
  options: string[] | null
  sort_order: number
  is_required: boolean
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useSurveyQuestions(activityType: string | undefined) {
  return useQuery({
    queryKey: ['post-event-survey-template', activityType],
    queryFn: async () => {
      if (!activityType) return []
      const { data, error } = await supabase
        .from('post_event_survey_templates')
        .select('*')
        .eq('activity_type', activityType)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as SurveyQuestion[]
    },
    enabled: !!activityType,
    staleTime: 10 * 60 * 1000,
  })
}

function useAttendanceCheck(eventId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['attendance-check', eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return null
      const { data } = await supabase
        .from('event_registrations')
        .select('status, checked_in_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()
      return data
    },
    enabled: !!eventId && !!user,
    staleTime: 5 * 60 * 1000,
  })
}

function useExistingResponse(eventId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['post-event-survey-response', eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return null
      const { data } = await supabase
        .from('post_event_survey_responses')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()
      return data
    },
    enabled: !!eventId && !!user,
  })
}

function useSubmitSurvey() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, answers }: { eventId: string; answers: Record<string, unknown> }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('post_event_survey_responses')
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            answers,
          },
          { onConflict: 'event_id,user_id' },
        )
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-event-survey-response', variables.eventId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Question Components                                                */
/* ------------------------------------------------------------------ */

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-150',
            'cursor-pointer select-none active:scale-[0.93]',
            star <= value
              ? 'bg-warning-100 text-warning-500'
              : 'bg-primary-50 text-primary-300 hover:bg-primary-100',
          )}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star size={20} fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function YesNoInput({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[
        { label: 'Yes', val: true },
        { label: 'No', val: false },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.val)}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
            'cursor-pointer select-none active:scale-[0.97]',
            value === opt.val
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function MultipleChoiceInput({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors duration-150',
            'cursor-pointer select-none active:scale-[0.98]',
            value === opt
              ? 'bg-primary-600 text-white shadow-sm font-medium'
              : 'bg-primary-50 text-primary-700 hover:bg-primary-100',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PostEventSurveyPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading: eventLoading } = useEventDetail(eventId)
  const { data: questions, isLoading: questionsLoading } = useSurveyQuestions(event?.activity_type)
  const { data: existingResponse } = useExistingResponse(eventId)
  const { data: attendance, isLoading: attendanceLoading } = useAttendanceCheck(eventId)
  const submitMutation = useSubmitSurvey()

  const [userAnswers, setUserAnswers] = useState<Record<string, unknown>>({})
  const [submitted, setSubmitted] = useState(false)

  // Pre-fill from existing response, user edits override
  const existingAnswers = useMemo(() => {
    const resp = existingResponse as Record<string, unknown> | null | undefined
    return (resp?.answers as Record<string, unknown>) ?? {}
  }, [existingResponse])

  const answers: Record<string, unknown> = Object.keys(userAnswers).length > 0 ? userAnswers : existingAnswers

  const setAnswer = useCallback((key: string, value: unknown) => {
    setUserAnswers((prev) => ({ ...prev, [key]: value }))
  }, [])

  const requiredKeys = useMemo(
    () => (questions ?? []).filter((q) => q.is_required).map((q) => q.question_key),
    [questions],
  )

  const canSubmit = requiredKeys.every((key) => {
    const val = answers[key]
    return val !== undefined && val !== null && val !== ''
  })

  const handleSubmit = useCallback(async () => {
    if (!eventId || !canSubmit) return
    await submitMutation.mutateAsync({ eventId, answers })
    setSubmitted(true)
  }, [eventId, canSubmit, answers, submitMutation])

  // Compute survey window expiry once (stable across renders)
  const surveyWindowExpired = useMemo(() => {
    if (!event || !isPastEvent(event)) return false
    const eventEnd = new Date(event.date_end ?? event.date_start).getTime()
    return (Date.now() - eventEnd) / (1000 * 60 * 60 * 24) > 7
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when event changes
  }, [event?.date_end, event?.date_start])

  const isLoading = eventLoading || questionsLoading || attendanceLoading
  const showLoading = useDelayedLoading(isLoading)

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Survey" back />}>
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </Page>
    )
  }
  if (!event) {
    return (
      <Page swipeBack header={<Header title="Survey" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="This event may have been removed."
          action={{ label: 'Go Home', to: '/' }}
        />
      </Page>
    )
  }

  // Attendance verification: only attendees who checked in can submit
  if (attendance && attendance.status !== 'attended') {
    return (
      <Page swipeBack header={<Header title="Survey" back />}>
        <EmptyState
          illustration="error"
          title="Survey not available"
          description="Only attendees who checked in can complete the post-event survey."
          action={{ label: 'Back to Event', to: `/events/${eventId}` }}
        />
      </Page>
    )
  }

  // 7-day survey window: surveys close 7 days after event end (unless already submitted)
  if (surveyWindowExpired && !existingResponse) {
    return (
      <Page swipeBack header={<Header title="Survey" back />}>
        <EmptyState
          illustration="error"
          title="Survey closed"
          description="The feedback window for this event has closed (7 days after the event)."
          action={{ label: 'Back to Event', to: `/events/${eventId}` }}
        />
      </Page>
    )
  }

  if (!questions?.length) {
    return (
      <Page swipeBack header={<Header title="Survey" back />}>
        <EmptyState
          illustration="success"
          title="No survey for this event type"
          description="Thanks for attending! No additional feedback is needed."
          action={{ label: 'Back to Event', to: `/events/${eventId}` }}
        />
      </Page>
    )
  }

  if (submitted) {
    return (
      <Page swipeBack header={<Header title="Survey" back />}>
        <div className="p-4">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-4"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success-100 text-success-600 mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-heading text-xl font-bold text-primary-800">Thanks for your feedback!</h2>
            <p className="text-sm text-primary-400 max-w-xs mx-auto">
              Your response helps us improve future {ACTIVITY_TYPE_LABELS[event.activity_type] ?? 'events'}.
            </p>
          </motion.div>

          <WhatsNext
            suggestions={[
              { label: 'View Event', to: `/events/${eventId}` },
              { label: 'My Events', to: '/events' },
              { label: 'Home', to: '/' },
            ]}
          />
        </div>
      </Page>
    )
  }

  return (
    <Page
      swipeBack
      header={<Header title="Post-Event Survey" back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Send size={16} />}
          disabled={!canSubmit}
          loading={submitMutation.isPending}
          onClick={handleSubmit}
        >
          Submit Feedback
        </Button>
      }
    >
      <div className="p-4 space-y-6 pb-6">
        {/* Event context */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-white p-4 border border-primary-100/40">
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
            {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
          </p>
          <h2 className="font-heading text-lg font-bold text-primary-800 mt-1">
            {event.title}
          </h2>
          <p className="text-xs text-primary-400 mt-1">
            How was it? Your feedback helps us improve.
          </p>
        </div>

        {/* Questions */}
        <motion.div
          className="space-y-5"
          initial="hidden"
          animate="visible"
          variants={shouldReduceMotion ? undefined : { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {questions.map((q) => (
            <motion.div
              key={q.question_key}
              variants={shouldReduceMotion ? undefined : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-primary-800">
                {q.question_text}
                {q.is_required && <span className="text-error-400 ml-1">*</span>}
              </label>

              {q.question_type === 'rating' && (
                <RatingInput
                  value={(answers[q.question_key] as number) ?? 0}
                  onChange={(v) => setAnswer(q.question_key, v)}
                />
              )}

              {q.question_type === 'number' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={String(answers[q.question_key] ?? '')}
                    onChange={(e) => setAnswer(q.question_key, e.target.value ? Number(e.target.value) : '')}
                    className="max-w-[120px]"
                  />
                  {q.unit && (
                    <span className="text-sm text-primary-400">{q.unit}</span>
                  )}
                </div>
              )}

              {q.question_type === 'free_text' && (
                <Input
                  type="textarea"
                  value={String(answers[q.question_key] ?? '')}
                  onChange={(e) => setAnswer(q.question_key, e.target.value)}
                  placeholder="Your answer..."
                  rows={3}
                />
              )}

              {q.question_type === 'yes_no' && (
                <YesNoInput
                  value={(answers[q.question_key] as boolean) ?? null}
                  onChange={(v) => setAnswer(q.question_key, v)}
                />
              )}

              {q.question_type === 'multiple_choice' && q.options && (
                <MultipleChoiceInput
                  options={q.options as string[]}
                  value={(answers[q.question_key] as string) ?? null}
                  onChange={(v) => setAnswer(q.question_key, v)}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Page>
  )
}

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ClipboardList,
  Star,
  MessageSquare,
  CircleDot,
  ToggleLeft,
  GripVertical,
  Check,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Toggle } from '@/components/toggle'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SurveyQuestion {
  id: string
  type: 'multiple_choice' | 'rating' | 'free_text' | 'yes_no'
  text: string
  options?: string[]
}

interface SurveyTemplate {
  name: string
  description: string
  questions: SurveyQuestion[]
}

const TEMPLATES: SurveyTemplate[] = [
  {
    name: 'Post-Event Satisfaction',
    description: 'Gather feedback after each event',
    questions: [
      { id: '1', type: 'rating', text: 'How would you rate this event overall?' },
      { id: '2', type: 'yes_no', text: 'Would you attend a similar event again?' },
      { id: '3', type: 'multiple_choice', text: 'What was the best part?', options: ['Activities', 'People', 'Location', 'Impact', 'Other'] },
      { id: '4', type: 'free_text', text: 'Any suggestions for improvement?' },
    ],
  },
  {
    name: 'New Member Welcome',
    description: 'Welcome survey for new members',
    questions: [
      { id: '1', type: 'multiple_choice', text: 'How did you hear about Co-Exist?', options: ['Social media', 'Friend', 'Event', 'School/Uni', 'Other'] },
      { id: '2', type: 'rating', text: 'How easy was the sign-up process?' },
      { id: '3', type: 'multiple_choice', text: 'What interests you most?', options: ['Tree planting', 'Beach cleanup', 'Wildlife', 'Community', 'Education'] },
      { id: '4', type: 'free_text', text: 'Anything else you\'d like us to know?' },
    ],
  },
  {
    name: 'Annual Feedback',
    description: 'Yearly membership feedback survey',
    questions: [
      { id: '1', type: 'rating', text: 'Overall satisfaction with Co-Exist this year?' },
      { id: '2', type: 'rating', text: 'How well does your collective communicate?' },
      { id: '3', type: 'yes_no', text: 'Do you feel your volunteering made an impact?' },
      { id: '4', type: 'multiple_choice', text: 'What should we focus on next year?', options: ['More events', 'Better communication', 'More locations', 'Partnerships', 'Education'] },
      { id: '5', type: 'free_text', text: 'Share your favourite memory from this year' },
    ],
  },
]

const questionTypeIcons = {
  multiple_choice: <CircleDot size={14} />,
  rating: <Star size={14} />,
  free_text: <MessageSquare size={14} />,
  yes_no: <ToggleLeft size={14} />,
}

const questionTypeLabels = {
  multiple_choice: 'Multiple Choice',
  rating: 'Rating (1-5)',
  free_text: 'Free Text',
  yes_no: 'Yes / No',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CreateSurveyPage() {
  useAdminHeader('Create Survey')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Pre-load template if ?template=index was passed
  const templateIndex = searchParams.get('template')
  const initialTemplate = templateIndex !== null ? TEMPLATES[Number(templateIndex)] : null

  const [title, setTitle] = useState(initialTemplate?.name ?? '')
  const [autoSendAfterEvent, setAutoSendAfterEvent] = useState(false)
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialTemplate?.questions ?? [])

  // New question form
  const [newQuestionType, setNewQuestionType] = useState<SurveyQuestion['type']>('rating')
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionOptions, setNewQuestionOptions] = useState('')

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('surveys').insert({
        title,
        questions: JSON.stringify(questions),
        auto_send_after_event: autoSendAfterEvent,
        status: 'active',
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] })
      toast.success('Survey created')
      navigate('/admin/surveys')
    },
    onError: () => toast.error('Failed to create survey'),
  })

  const addQuestion = () => {
    if (!newQuestionText.trim()) return
    const question: SurveyQuestion = {
      id: crypto.randomUUID(),
      type: newQuestionType,
      text: newQuestionText,
      ...(newQuestionType === 'multiple_choice' && {
        options: newQuestionOptions.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    }
    setQuestions((p) => [...p, question])
    setNewQuestionText('')
    setNewQuestionOptions('')
  }

  const removeQuestion = (id: string) => {
    setQuestions((p) => p.filter((q) => q.id !== id))
  }

  const canSubmit = title.trim().length > 0 && questions.length > 0

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => navigate('/admin/surveys')}
        className="inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-800 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Surveys
      </button>

      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-primary-800">
          Create Survey
        </h1>
        <p className="text-sm text-primary-400 mt-1">
          Build a survey to collect feedback from your community
        </p>
      </div>

      {/* ── Title & settings card ── */}
      <section className="rounded-2xl bg-white border border-primary-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-primary-800 mb-4">Details</h2>

        <div className="space-y-4">
          <Input
            label="Survey Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Post-Event Feedback"
          />

          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary-50/50 border border-primary-100">
            <Toggle
              checked={autoSendAfterEvent}
              onChange={setAutoSendAfterEvent}
              label="Auto-send after event"
              description="Automatically send this survey to attendees after each event"
              size="sm"
            />
          </div>
        </div>
      </section>

      {/* ── Questions section ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary-800">
            Questions{questions.length > 0 && ` (${questions.length})`}
          </h2>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/30">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 mb-3">
              <ClipboardList size={24} className="text-primary-400" />
            </div>
            <p className="text-sm font-medium text-primary-500 text-center">
              No questions yet
            </p>
            <p className="text-xs text-primary-400 text-center mt-1">
              Use the builder below to add your first question
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {questions.map((q, i) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="group flex items-start gap-3 p-4 rounded-xl bg-white border border-primary-100 shadow-sm hover:shadow-md transition-shadow duration-150"
              >
                {/* Number badge */}
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-100 text-xs font-bold text-primary-600 shrink-0 mt-0.5">
                  {i + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-400">
                      {questionTypeIcons[q.type]}
                      <span className="text-[11px] font-medium">
                        {questionTypeLabels[q.type]}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-primary-800 leading-snug">{q.text}</p>
                  {q.options && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {q.options.map((opt) => (
                        <span
                          key={opt}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-50 text-xs font-medium text-primary-500 border border-primary-100"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="p-1.5 rounded-lg text-primary-300 opacity-0 group-hover:opacity-100 hover:bg-error-50 hover:text-error-500 cursor-pointer transition-all duration-150 shrink-0"
                  aria-label="Remove question"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Add question builder ── */}
      <section className="rounded-2xl border border-primary-200 bg-gradient-to-b from-primary-50/80 to-white overflow-hidden shadow-sm mb-8">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-primary-100 bg-primary-50/50">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-500 text-white">
            <Plus size={15} />
          </div>
          <h3 className="text-sm font-semibold text-primary-800">Add Question</h3>
        </div>

        <div className="p-5 space-y-4">
          <Dropdown
            options={[
              { value: 'rating', label: 'Rating (1-5)' },
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'free_text', label: 'Free Text' },
              { value: 'yes_no', label: 'Yes / No' },
            ]}
            value={newQuestionType}
            onChange={(v) => setNewQuestionType(v as SurveyQuestion['type'])}
            label="Question Type"
          />

          <Input
            label="Question Text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="What would you like to ask?"
          />

          {newQuestionType === 'multiple_choice' && (
            <Input
              label="Options (comma-separated)"
              value={newQuestionOptions}
              onChange={(e) => setNewQuestionOptions(e.target.value)}
              placeholder="Option 1, Option 2, Option 3"
            />
          )}

          <div className="flex justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={addQuestion}
              icon={<Plus size={14} />}
              disabled={!newQuestionText.trim()}
            >
              Add Question
            </Button>
          </div>
        </div>
      </section>

      {/* ── Submit bar ── */}
      <div className="sticky bottom-4 z-20">
        <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-primary-100 shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {!canSubmit && (
                <p className="text-xs text-primary-400">
                  {!title.trim() ? 'Add a survey title' : 'Add at least one question'}
                </p>
              )}
              {canSubmit && (
                <p className="text-xs text-primary-500 font-medium">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} ready
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/surveys')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!canSubmit}
              icon={<Check size={15} />}
            >
              Create Survey
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

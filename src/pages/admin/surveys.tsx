import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ClipboardList,
  Plus,
  Trash2,
  BarChart3,
  Download,
  Eye,
  Copy,
  ChevronRight,
  Check,
  Star,
  MessageSquare,
  CircleDot,
  ToggleLeft,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Modal } from '@/components/modal'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { Toggle } from '@/components/toggle'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
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
/*  Data                                                               */
/* ------------------------------------------------------------------ */

function useSurveys() {
  return useQuery({
    queryKey: ['admin-surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useSurveyResults(surveyId: string | null) {
  return useQuery({
    queryKey: ['admin-survey-results', surveyId],
    queryFn: async () => {
      if (!surveyId) return []
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
      if (error) throw error
      return data ?? []
    },
    enabled: !!surveyId,
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const tabs = [
  { id: 'surveys', label: 'Surveys', icon: <ClipboardList size={14} /> },
  { id: 'templates', label: 'Templates', icon: <Copy size={14} /> },
  { id: 'results', label: 'Results', icon: <BarChart3 size={14} /> },
]

export default function AdminSurveysPage() {
  useAdminHeader('Surveys')
  const [activeTab, setActiveTab] = useState('surveys')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Create form state
  const [title, setTitle] = useState('')
  const [autoSendAfterEvent, setAutoSendAfterEvent] = useState(false)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [newQuestionType, setNewQuestionType] = useState<SurveyQuestion['type']>('rating')
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionOptions, setNewQuestionOptions] = useState('')

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: surveys, isLoading } = useSurveys()
  const { data: results } = useSurveyResults(selectedSurvey)

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
      setShowCreate(false)
      setTitle('')
      setQuestions([])
      setAutoSendAfterEvent(false)
      toast.success('Survey created')
    },
    onError: () => toast.error('Failed to create survey'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surveys').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] })
      setDeleteTarget(null)
      toast.success('Survey deleted')
    },
    onError: () => toast.error('Failed to delete survey'),
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

  const loadTemplate = (template: SurveyTemplate) => {
    setTitle(template.name)
    setQuestions(template.questions)
    setShowCreate(true)
    setActiveTab('surveys')
  }

  const exportResultsCSV = () => {
    if (!results?.length) return
    const headers = ['Response ID', 'User ID', 'Answers', 'Submitted At']
    const rows = results.map((r: any) => [r.id, r.user_id, JSON.stringify(r.answers), r.created_at])
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'survey-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const shouldReduceMotion = useReducedMotion()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
      </motion.div>

      {/* Surveys list */}
      {activeTab === 'surveys' && (
        <motion.div variants={fadeUp}>
          <div className="flex justify-end mb-4">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowCreate(true)}
            >
              Create Survey
            </Button>
          </div>

          {isLoading ? (
            <Skeleton variant="list-item" count={4} />
          ) : !surveys?.length ? (
            <EmptyState
              illustration="empty"
              title="No surveys yet"
              description="Create a survey or start from a template"
              action={{ label: 'Create Survey', onClick: () => setShowCreate(true) }}
            />
          ) : (
            <StaggeredList className="space-y-2">
              {surveys.map((survey) => (
                <StaggeredItem
                  key={survey.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 shrink-0">
                    <ClipboardList size={18} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-800 truncate">
                        {survey.title}
                      </p>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                          (survey as any).status === 'active' || survey.is_active
                            ? 'bg-success-100 text-success-700'
                            : 'bg-white text-primary-400',
                        )}
                      >
                        {(survey as any).status ?? (survey.is_active ? 'active' : 'inactive')}
                      </span>
                    </div>
                    <p className="text-xs text-primary-400 mt-0.5">
                      Created{' '}
                      {new Date(survey.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<BarChart3 size={14} />}
                    onClick={() => {
                      setSelectedSurvey(survey.id)
                      setActiveTab('results')
                    }}
                  >
                    Results
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(survey.id)}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                    aria-label="Delete survey"
                  >
                    <Trash2 size={16} />
                  </button>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </motion.div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((template) => (
            <StaggeredItem
              key={template.name}
              className="p-4 rounded-xl bg-white shadow-sm"
            >
              <h3 className="font-heading text-sm font-semibold text-primary-800">
                {template.name}
              </h3>
              <p className="text-xs text-primary-400 mt-1">{template.description}</p>
              <p className="text-xs text-primary-400 mt-2">
                {template.questions.length} questions
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => loadTemplate(template)}
                icon={<Copy size={14} />}
              >
                Use Template
              </Button>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}

      {/* Results */}
      {activeTab === 'results' && (
        <>
          {!selectedSurvey ? (
            <EmptyState
              illustration="search"
              title="Select a survey"
              description="Choose a survey from the Surveys tab to view results"
              action={{ label: 'Go to Surveys', onClick: () => setActiveTab('surveys') }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-primary-400">
                  {results?.length ?? 0} responses
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={exportResultsCSV}
                  disabled={!results?.length}
                >
                  Export CSV
                </Button>
              </div>

              {!results?.length ? (
                <EmptyState
                  illustration="empty"
                  title="No responses yet"
                  description="Share this survey to start collecting responses"
                />
              ) : (
                <div className="p-4 rounded-xl bg-white shadow-sm">
                  <p className="text-sm text-primary-400">
                    {results.length} total responses collected. Detailed aggregate charts will
                    render per question type once responses come in.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create survey modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Survey"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Survey Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Post-Event Feedback"
          />

          <Toggle
            checked={autoSendAfterEvent}
            onChange={setAutoSendAfterEvent}
            label="Auto-send after event"
            description="Automatically send this survey to attendees after each event"
          />

          {/* Existing questions */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary-800">
                Questions ({questions.length})
              </p>
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="flex items-start gap-2 p-3 rounded-lg bg-white"
                >
                  <span className="text-xs text-primary-400 mt-0.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary-400">
                        {questionTypeIcons[q.type]}
                      </span>
                      <span className="text-xs text-primary-400">
                        {questionTypeLabels[q.type]}
                      </span>
                    </div>
                    <p className="text-sm text-primary-800 mt-0.5">{q.text}</p>
                    {q.options && (
                      <p className="text-xs text-primary-400 mt-0.5">
                        Options: {q.options.join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="p-1 text-primary-400 hover:text-error-500 cursor-pointer"
                    aria-label="Remove question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add question */}
          <div className="p-3 rounded-lg bg-primary-50/60 space-y-3">
            <p className="text-sm font-medium text-primary-800">Add Question</p>
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
            <Button variant="secondary" size="sm" onClick={addQuestion} icon={<Plus size={14} />}>
              Add Question
            </Button>
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!title.trim() || questions.length === 0}
          >
            Create Survey
          </Button>
        </div>
      </Modal>

      <ConfirmationSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete Survey"
        description="This will delete the survey and all its responses."
        confirmLabel="Delete"
        variant="danger"
      />
    </motion.div>
  )
}

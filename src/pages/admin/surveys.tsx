import { useState, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  ClipboardList,
  Plus,
  Trash2,
  BarChart3,
  Download,
  Copy,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

/* ------------------------------------------------------------------ */
/*  Templates (shared with create page via index param)                */
/* ------------------------------------------------------------------ */

const TEMPLATES = [
  {
    name: 'Post-Event Satisfaction',
    description: 'Gather feedback after each event',
    questionCount: 4,
  },
  {
    name: 'New Member Welcome',
    description: 'Welcome survey for new members',
    questionCount: 4,
  },
  {
    name: 'Annual Feedback',
    description: 'Yearly membership feedback survey',
    questionCount: 5,
  },
]

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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('surveys')
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: surveys, isLoading } = useSurveys()
  const showLoading = useDelayedLoading(isLoading)
  const { data: results } = useSurveyResults(selectedSurvey)

  const heroStats = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Surveys</p>
        <p className="text-xl font-bold text-white tabular-nums">{surveys?.length ?? 0}</p>
      </div>
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Templates</p>
        <p className="text-xl font-bold text-white tabular-nums">{TEMPLATES.length}</p>
      </div>
    </div>
  ), [surveys?.length])

  useAdminHeader('Surveys', { heroContent: heroStats })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await logAudit({ action: 'survey_deleted', target_type: 'survey', target_id: id })
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

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <div>
        <motion.div variants={stagger} initial="hidden" animate="visible">
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
              onClick={() => navigate('/admin/surveys/create')}
            >
              Create Survey
            </Button>
          </div>

          {showLoading ? (
            <Skeleton variant="list-item" count={4} />
          ) : !surveys?.length ? (
            <EmptyState
              illustration="empty"
              title="No surveys yet"
              description="Create a survey or start from a template"
              action={{ label: 'Create Survey', onClick: () => navigate('/admin/surveys/create') }}
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
          {TEMPLATES.map((template, index) => (
            <StaggeredItem
              key={template.name}
              className="p-4 rounded-xl bg-white shadow-sm"
            >
              <h3 className="font-heading text-sm font-semibold text-primary-800">
                {template.name}
              </h3>
              <p className="text-xs text-primary-400 mt-1">{template.description}</p>
              <p className="text-xs text-primary-400 mt-2">
                {template.questionCount} questions
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => navigate(`/admin/surveys/create?template=${index}`)}
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
    </div>
  )
}

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
    Pencil,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow } from '@/components/admin-hero-stat'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { Toggle } from '@/components/toggle'
import { Input } from '@/components/input'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import { useAutoSurveyConfig, useUpdateAutoSurveyConfig } from '@/hooks/use-auto-survey'
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-events'

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
  { id: 'settings', label: 'Auto-Survey', icon: <ClipboardList size={14} /> },
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
  const { data: autoConfig } = useAutoSurveyConfig()
  const updateAutoConfig = useUpdateAutoSurveyConfig()

  const heroStats = useMemo(() => (
    <AdminHeroStatRow>
      <AdminHeroStat value={surveys?.length ?? 0} label="Surveys" icon={<ClipboardList size={18} />} color="moss" delay={0} reducedMotion={false} />
      <AdminHeroStat value={TEMPLATES.length} label="Templates" icon={<Copy size={18} />} color="plum" delay={1} reducedMotion={false} />
    </AdminHeroStatRow>
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
    const rows = results.map((r) => [r.id, r.user_id, JSON.stringify(r.answers), r.submitted_at])
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
              className="w-full sm:w-auto"
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
              {surveys.map((survey) => {
                const surveyRecord = survey as unknown as Record<string, unknown>
                const status = (surveyRecord.status as string) ?? (survey.is_active ? 'active' : 'inactive')
                const isActive = surveyRecord.status === 'active' || survey.is_active
                const questionCount = (() => {
                  try {
                    const q = typeof surveyRecord.questions === 'string'
                      ? JSON.parse(surveyRecord.questions as string)
                      : surveyRecord.questions
                    return Array.isArray(q) ? q.length : 0
                  } catch { return 0 }
                })()

                return (
                  <StaggeredItem
                    key={survey.id}
                    className="rounded-xl bg-white shadow-sm overflow-hidden"
                  >
                    {/* Tappable main area - navigates to edit */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/surveys/${survey.id}/edit`)}
                      className="w-full text-left p-4 pb-3 cursor-pointer active:bg-primary-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 shrink-0">
                          <ClipboardList size={18} className="text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-primary-800 truncate max-w-[70%]">
                              {survey.title}
                            </p>
                            <span
                              className={cn(
                                'text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                                isActive
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-primary-100 text-primary-400',
                              )}
                            >
                              {status}
                            </span>
                            {survey.activity_type && (
                              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-info-100 text-info-700">
                                Post-Event: {ACTIVITY_TYPE_LABELS[survey.activity_type] ?? survey.activity_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-primary-400">
                            <span>
                              {new Date(survey.created_at!).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {questionCount > 0 && (
                              <>
                                <span className="text-primary-200">·</span>
                                <span>{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Action bar - always visible, horizontal scroll on small screens */}
                    <div className="flex items-center gap-1 px-3 pb-3 -mt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSurvey(survey.id)
                          setActiveTab('results')
                        }}
                        className="flex items-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-medium text-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors cursor-pointer select-none active:scale-[0.97] whitespace-nowrap"
                      >
                        <BarChart3 size={14} />
                        Results
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/surveys/${survey.id}/edit`)}
                        className="flex items-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-medium text-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors cursor-pointer select-none active:scale-[0.97] whitespace-nowrap"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(survey.id)}
                        className="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-primary-300 hover:bg-error-50 hover:text-error-600 active:bg-error-100 transition-colors cursor-pointer select-none active:scale-[0.93]"
                        aria-label="Delete survey"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </StaggeredItem>
                )
              })}
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
              className="rounded-xl bg-white shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => navigate(`/admin/surveys/create?template=${index}`)}
                className="w-full text-left p-4 cursor-pointer active:bg-primary-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-plum-50 shrink-0">
                    <Copy size={16} className="text-plum-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-sm font-semibold text-primary-800">
                      {template.name}
                    </h3>
                    <p className="text-xs text-primary-400 mt-0.5">{template.description}</p>
                    <p className="text-xs text-primary-400 mt-1.5">
                      {template.questionCount} questions
                    </p>
                  </div>
                </div>
              </button>
              <div className="px-4 pb-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate(`/admin/surveys/create?template=${index}`)}
                  icon={<Copy size={14} />}
                >
                  Use Template
                </Button>
              </div>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-sm text-primary-400">
                  {results?.length ?? 0} responses
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={exportResultsCSV}
                  disabled={!results?.length}
                  className="w-full sm:w-auto"
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

      {/* Auto-Survey Settings */}
      {activeTab === 'settings' && autoConfig && (
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="p-5 rounded-xl bg-white shadow-sm space-y-5">
            <div>
              <h3 className="font-heading text-sm font-semibold text-primary-800 mb-1">
                Automated Post-Event Surveys
              </h3>
              <p className="text-xs text-primary-400">
                Automatically prompt attendees to complete a feedback survey after events conclude.
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-primary-800">Enable auto-surveys</p>
                <p className="text-xs text-primary-400 mt-0.5">
                  Send survey notifications to checked-in attendees when impact is logged
                </p>
              </div>
              <Toggle
                checked={autoConfig.enabled}
                onChange={(enabled) =>
                  updateAutoConfig.mutate({ ...autoConfig, enabled })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-primary-800">Use default questions</p>
                <p className="text-xs text-primary-400 mt-0.5">
                  Use activity-type-specific template questions for each event
                </p>
              </div>
              <Toggle
                checked={autoConfig.default_questions_enabled}
                onChange={(default_questions_enabled) =>
                  updateAutoConfig.mutate({ ...autoConfig, default_questions_enabled })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-primary-800">
                Survey window (hours)
              </label>
              <p className="text-xs text-primary-400">
                How long after event completion the survey banner appears for attendees
              </p>
              <Input
                type="number"
                min="1"
                max="168"
                value={String(autoConfig.delay_hours)}
                onChange={(e) =>
                  updateAutoConfig.mutate({
                    ...autoConfig,
                    delay_hours: Math.max(1, Math.min(168, Number(e.target.value) || 24)),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary-50/60 border border-primary-100/40">
            <p className="text-xs text-primary-500">
              When an event leader logs impact data, checked-in attendees will receive an in-app notification
              linking to the post-event survey. A banner also appears on their home screen for up to 7 days.
            </p>
          </div>
        </motion.div>
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

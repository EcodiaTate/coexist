import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    Users,
    CalendarDays,
    Clock,
    CalendarCheck,
    Plus,
    Pencil,
    Megaphone,
    TreePine,
    ChevronRight,
    ChevronLeft,
    Bell,
    MessageCircle,
    UserPlus,
    CheckCircle2,
    AlertTriangle,
    Send,
    MapPin,
    Trash2,
    Sprout,
    GraduationCap,
    CheckCircle,
    SkipForward,
    Flame,
    FileText,
    Share2,
    Copy,
    Check,
    ClipboardCheck,
    ClipboardList,
    BookOpen,
    Leaf,
    ListTodo,
    Circle,
    Calendar,
    ArrowRight,
} from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { EmptyState } from '@/components/empty-state'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'
import { useLeaderHeader, useLeaderContext, useIsLeaderLayout } from '@/components/leader-layout'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { TaskSurveyModal } from '@/components/task-survey-modal'
import { useToast } from '@/components/toast'
import { supabase } from '@/lib/supabase'
import { APP_NAME } from '@/lib/constants'
import { useUnreadUpdateCount } from '@/hooks/use-updates'
import {
    useMyTasks,
    useCompleteTask,
    useSkipTask,
    useGenerateTaskInstances,
    useGroupedTasks,
    type MyTask,
} from '@/hooks/use-tasks'
import { CATEGORY_COLORS } from '@/hooks/use-admin-tasks'
import {
    useLeaderTodos,
    useToggleTodo,
    PRIORITY_CONFIG,
    type LeaderTodo,
} from '@/hooks/use-leader-todos'
import {
    useLeaderDashboard,
    useCollectiveFullStats,
    useEngagementScores,
    usePendingItems,
    useEventCalendar,
} from '@/hooks/use-leader-dashboard'
import { useMyModuleProgress } from '@/hooks/use-development-progress'
import { useMyTargetedContent } from '@/hooks/use-development-assignments'

function MiniCalendar({ collectiveId }: { collectiveId: string | undefined }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data: events = [] } = useEventCalendar(collectiveId, currentMonth)

  const eventDays = useMemo(
    () => new Set(events.map((e) => new Date(e.date_start).getDate())),
    [events],
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1
    if (day < 1 || day > daysInMonth) return null
    return day
  })

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <div className="rounded-2xl bg-moss-50/40 shadow-sm border border-moss-100/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-bold text-primary-800">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month - 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-500 hover:bg-primary-100 active:scale-95 transition-[background-color,transform] duration-150 cursor-pointer select-none"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month + 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-500 hover:bg-primary-100 active:scale-95 transition-[background-color,transform] duration-150 cursor-pointer select-none"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[11px] font-semibold text-primary-300 uppercase tracking-wider pb-2">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={i} />

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
          const hasEvent = eventDays.has(day)

          return (
            <div
              key={i}
              className={cn(
                'relative flex items-center justify-center w-8 h-8 mx-auto rounded-lg text-xs transition-colors',
                hasEvent && 'bg-moss-100 text-moss-700 font-bold',
                isToday && !hasEvent && 'ring-2 ring-primary-200 text-primary-700 font-semibold',
                isToday && hasEvent && 'bg-moss-200 text-moss-800 font-bold ring-2 ring-moss-300',
                !isToday && !hasEvent && 'text-primary-500 font-medium',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Task card (inline version)                                         */
/* ------------------------------------------------------------------ */

function TaskCard({ task }: { task: MyTask }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showSurvey, setShowSurvey] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const completeMutation = useCompleteTask()
  const skipMutation = useSkipTask()
  const shouldReduceMotion = useReducedMotion()

  const hasSurvey = !!task.template?.survey_id

  const surveySubmitMutation = useMutation({
    mutationFn: async (answers: Record<string, unknown>) => {
      if (!user || !task.template?.survey_id) return
      await supabase.from('survey_responses').insert({
        survey_id: task.template.survey_id,
        user_id: user.id,
        answers: answers as unknown as import('@/types/database.types').Json,
      })
      await completeMutation.mutateAsync({
        instanceId: task.id,
        notes: notes || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Survey submitted & task completed!')
      setShowSurvey(false)
      setExpanded(false)
      setNotes('')
    },
    onError: () => toast.error('Failed to submit survey'),
  })

  const now = new Date()
  const dueDate = new Date(task.due_date)
  const isOverdue = task.status === 'pending' && dueDate < now
  const isCompleted = task.status === 'completed'
  const isSkipped = task.status === 'skipped'

  const formattedDue = dueDate.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
  const urgency = isOverdue ? 'overdue' : daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : daysUntil <= 3 ? 'soon' : 'normal'

  return (
    <motion.div
      layout={!shouldReduceMotion ? 'position' : false}
      className={cn(
        'rounded-2xl overflow-hidden transition-opacity duration-200',
        isCompleted && 'opacity-50',
        isSkipped && 'opacity-40',
        !isCompleted && !isSkipped && 'bg-primary-50/40 shadow-sm border border-primary-100/40',
        isOverdue && !isCompleted && 'bg-error-50/40 shadow-md ring-1 ring-error-200/60',
      )}
    >
      <div className="flex items-stretch">
        {!isCompleted && !isSkipped && (
          <div className={cn(
            'w-1 shrink-0 rounded-l-2xl',
            urgency === 'overdue' && 'bg-error-500',
            urgency === 'today' && 'bg-warning-500',
            urgency === 'tomorrow' && 'bg-amber-400',
            urgency === 'soon' && 'bg-moss-400',
            urgency === 'normal' && 'bg-primary-200',
          )} />
        )}

        <button
          type="button"
          onClick={() => !isCompleted && !isSkipped && setExpanded(!expanded)}
          className={cn(
            'flex-1 flex items-start gap-3 p-4 text-left cursor-pointer min-w-0 active:scale-[0.99] transition-transform duration-150',
            (isCompleted || isSkipped) && 'p-3',
          )}
        >
          <div className="mt-0.5 shrink-0">
            {isCompleted ? (
              <div className="w-5 h-5 rounded-full bg-success-500 flex items-center justify-center">
                <CheckCircle size={12} className="text-white" />
              </div>
            ) : isSkipped ? (
              <div className="w-5 h-5 rounded-full bg-primary-200 flex items-center justify-center">
                <SkipForward size={10} className="text-primary-400" />
              </div>
            ) : isOverdue ? (
              <div className="w-5 h-5 rounded-full bg-error-100 flex items-center justify-center animate-pulse">
                <AlertTriangle size={11} className="text-error-500" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-primary-200" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-semibold truncate',
              isCompleted || isSkipped ? 'text-primary-300 line-through' : 'text-primary-800',
            )}>
              {task.template?.title ?? 'Task'}
            </p>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {task.template?.category && (
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide', CATEGORY_COLORS[task.template.category])}>
                  {task.template.category.replace('_', ' ')}
                </span>
              )}

              {!isCompleted && !isSkipped && (
                (task.template?.assignment_mode ?? 'collective') === 'collective' && !task.assigned_user_id
                  ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide bg-primary-50 text-primary-500 flex items-center gap-0.5"><Users size={9} /> Shared</span>
                  : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide bg-moss-50 text-moss-600">You</span>
              )}

              {!isCompleted && !isSkipped && (
                <span className={cn(
                  'text-[11px] font-medium flex items-center gap-1',
                  urgency === 'overdue' ? 'text-error-600' : urgency === 'today' ? 'text-warning-700' : 'text-primary-400',
                )}>
                  <Clock size={10} />
                  {formattedDue}
                  {urgency === 'overdue' && ` · ${Math.abs(daysUntil)}d overdue`}
                  {urgency === 'today' && ' · Today'}
                  {urgency === 'tomorrow' && ' · Tomorrow'}
                </span>
              )}
            </div>
          </div>

          {!isCompleted && !isSkipped && (
            <div className="shrink-0 mt-1">
              <motion.div
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronRight size={16} className="text-primary-300" />
              </motion.div>
            </div>
          )}
        </button>
      </div>

      <AnimatePresence>
        {expanded && !isCompleted && !isSkipped && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-12 space-y-3">
              {task.template?.description && (
                <p className="text-xs text-primary-500 leading-relaxed">{task.template.description}</p>
              )}
              {task.template?.attachment_url && (
                <a
                  href={task.template.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-100 hover:bg-primary-100 transition-colors"
                >
                  <FileText size={18} className="text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary-700 truncate">
                      {task.template.attachment_label || 'View Attachment'}
                    </p>
                    <p className="text-[11px] text-primary-400">Tap to open</p>
                  </div>
                </a>
              )}
              <Input
                placeholder="Add a note (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                compact
              />
              {hasSurvey && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-plum-50 border border-plum-100 mb-1">
                  <ClipboardList size={14} className="text-plum-500 shrink-0" />
                  <p className="text-[11px] text-plum-600">
                    This task includes a survey that must be completed
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={hasSurvey ? <ClipboardList size={14} /> : <CheckCircle size={14} />}
                  loading={completeMutation.isPending}
                  onClick={() => {
                    if (hasSurvey) {
                      setShowSurvey(true)
                    } else {
                      completeMutation.mutate(
                        { instanceId: task.id, notes: notes || undefined },
                        {
                          onSuccess: () => {
                            toast.success('Task completed!')
                            setExpanded(false)
                            setNotes('')
                          },
                          onError: () => toast.error('Failed to complete task'),
                        },
                      )
                    }
                  }}
                >
                  {hasSurvey ? 'Complete & Fill Survey' : 'Done'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<SkipForward size={14} />}
                  loading={skipMutation.isPending}
                  onClick={() => {
                    skipMutation.mutate(task.id, {
                      onSuccess: () => {
                        toast.success('Task skipped')
                        setExpanded(false)
                      },
                      onError: () => toast.error('Failed to skip task'),
                    })
                  }}
                >
                  Skip
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survey modal */}
      {showSurvey && task.template?.survey_id && (
        <TaskSurveyModal
          open={showSurvey}
          onClose={() => setShowSurvey(false)}
          surveyId={task.template.survey_id}
          collectiveId={task.collective_id}
          onSubmit={(answers) => surveySubmitMutation.mutate(answers)}
          submitting={surveySubmitMutation.isPending}
        />
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Section heading (light mode - white background)                    */
/* ------------------------------------------------------------------ */

function SectionHeader({
  children,
  action,
  icon,
}: {
  children: React.ReactNode
  action?: { label: string; to: string }
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">
        {icon && <span className="text-primary-400">{icon}</span>}
        {children}
      </h2>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-0.5 text-xs text-primary-500 font-semibold hover:text-primary-700 active:scale-[0.97] transition-[colors,transform] duration-150"
        >
          {action.label}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact stat mini-card                                              */
/* ------------------------------------------------------------------ */

function ImpactMini({
  value,
  label,
  unit,
  icon,
  color,
}: {
  value: number | string
  label: string
  unit?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-moss-50/40 shadow-sm border border-moss-100/40 p-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading text-lg font-extrabold text-primary-800 tabular-nums leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}{unit && <span className="text-xs font-bold ml-0.5 text-primary-500">{unit}</span>}
        </p>
        <p className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Invite sheet (inline on dashboard)                                 */
/* ------------------------------------------------------------------ */

function InviteAction({ collectiveSlug, collectiveId, collectiveName }: { collectiveSlug: string | undefined; collectiveId: string | undefined; collectiveName: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/collective/${collectiveSlug ?? collectiveId}`
    : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${collectiveName} on ${APP_NAME}`,
          text: `Join our conservation collective and make a difference!`,
          url: inviteUrl,
        })
      } catch { /* cancelled */ }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-moss-50 to-primary-50/60 border border-moss-100/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-moss-100 flex items-center justify-center">
          <Send size={14} className="text-moss-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-primary-800">Invite Members</p>
          <p className="text-[11px] text-primary-400">Grow your collective</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-primary-100/50 mb-3">
        <span className="text-xs text-primary-400 truncate flex-1 font-mono">{inviteUrl}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white border border-primary-100 text-xs font-semibold text-primary-600 hover:bg-primary-50 active:scale-[0.97] transition-transform cursor-pointer"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-moss-600 text-xs font-bold text-white hover:bg-moss-500 active:scale-[0.97] transition-transform cursor-pointer shadow-sm"
        >
          <Share2 size={13} />
          Share
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Upcoming Todos Widget                                              */
/* ------------------------------------------------------------------ */

type TodoTimeGroup = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_date'

const TIME_GROUP_CONFIG: Record<TodoTimeGroup, { label: string; color: string; dotColor: string; icon: React.ReactNode }> = {
  overdue:   { label: 'Overdue',    color: 'text-error-600',   dotColor: 'bg-error-500',   icon: <Flame size={11} /> },
  today:     { label: 'Today',      color: 'text-warning-700', dotColor: 'bg-warning-500',  icon: <Clock size={11} /> },
  tomorrow:  { label: 'Tomorrow',   color: 'text-amber-600',   dotColor: 'bg-amber-400',   icon: <Calendar size={11} /> },
  this_week: { label: 'This Week',  color: 'text-moss-600',    dotColor: 'bg-moss-400',    icon: <CalendarDays size={11} /> },
  later:     { label: 'Later',      color: 'text-primary-500', dotColor: 'bg-primary-300',  icon: <CalendarDays size={11} /> },
  no_date:   { label: 'No Due Date',color: 'text-primary-400', dotColor: 'bg-primary-200',  icon: <Circle size={11} /> },
}

function getTimeGroup(todo: LeaderTodo): TodoTimeGroup {
  if (!todo.due_date) return 'no_date'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))

  const due = new Date(todo.due_date + 'T00:00:00')

  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  if (due.getTime() === tomorrow.getTime()) return 'tomorrow'
  if (due <= endOfWeek) return 'this_week'
  return 'later'
}

function TodoItem({ todo, reducedMotion }: { todo: LeaderTodo; reducedMotion: boolean }) {
  const toggleMutation = useToggleTodo()
  const { toast } = useToast()
  const group = getTimeGroup(todo)
  const config = TIME_GROUP_CONFIG[group]
  const priorityCfg = PRIORITY_CONFIG[todo.priority]

  const formattedDue = todo.due_date
    ? new Date(todo.due_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  return (
    <motion.div
      layout={!reducedMotion ? 'position' : false}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, x: -40, transition: { duration: 0.2 } }}
      className="group flex items-start gap-3 px-4 py-3 hover:bg-primary-25/50 active:bg-primary-50/50 transition-colors duration-100"
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => {
          toggleMutation.mutate(
            { id: todo.id, completed: true },
            {
              onSuccess: () => toast.success('Done!'),
              onError: () => toast.error('Could not complete todo'),
            },
          )
        }}
        className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary-200 hover:border-primary-400 active:scale-90 transition-all duration-150 cursor-pointer"
        aria-label={`Complete "${todo.title}"`}
      >
        {toggleMutation.isPending && (
          <div className="w-2.5 h-2.5 rounded-full bg-primary-300 animate-pulse" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-800 leading-snug line-clamp-2">
          {todo.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Priority badge (skip medium — it's the default) */}
          {todo.priority !== 'medium' && (
            <span className={cn(
              'inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md',
              todo.priority === 'urgent' && 'bg-error-50 text-error-600',
              todo.priority === 'high' && 'bg-warning-50 text-warning-600',
              todo.priority === 'low' && 'bg-primary-50 text-primary-400',
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', priorityCfg.dot)} />
              {priorityCfg.label}
            </span>
          )}

          {/* Due date */}
          {formattedDue && (
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', config.color)}>
              {config.icon}
              {group === 'overdue' ? formattedDue : group === 'today' ? 'Today' : group === 'tomorrow' ? 'Tomorrow' : formattedDue}
              {todo.due_time && (
                <span className="text-primary-300 ml-0.5">
                  {todo.due_time.slice(0, 5)}
                </span>
              )}
            </span>
          )}

          {/* Source template indicator */}
          {todo.source_template_id && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-plum-50 text-plum-500 uppercase tracking-wide">
              Task
            </span>
          )}
        </div>

        {/* Description snippet */}
        {todo.description && (
          <p className="text-[11px] text-primary-400 mt-1 line-clamp-1 leading-relaxed">
            {todo.description}
          </p>
        )}
      </div>

      {/* Urgency strip */}
      <div className={cn('w-1 self-stretch rounded-full shrink-0 -mr-1', config.dotColor, 'opacity-60')} />
    </motion.div>
  )
}

function UpcomingTodosWidget() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { data: todos = [], isLoading } = useLeaderTodos({ status: 'pending' })

  // Group todos by time
  const grouped = useMemo(() => {
    const groups: Record<TodoTimeGroup, LeaderTodo[]> = {
      overdue: [], today: [], tomorrow: [], this_week: [], later: [], no_date: [],
    }
    for (const todo of todos) {
      groups[getTimeGroup(todo)].push(todo)
    }
    // Sort within each group: urgent first, then by due_date
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    for (const key of Object.keys(groups) as TodoTimeGroup[]) {
      groups[key].sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 2
        const pb = priorityOrder[b.priority] ?? 2
        if (pa !== pb) return pa - pb
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        return 0
      })
    }
    return groups
  }, [todos])

  const totalCount = todos.length
  const overdueCount = grouped.overdue.length
  const todayCount = grouped.today.length

  // Show at most 8 items total, prioritising overdue → today → tomorrow → this_week → later → no_date
  const visibleTodos = useMemo(() => {
    const order: TodoTimeGroup[] = ['overdue', 'today', 'tomorrow', 'this_week', 'later', 'no_date']
    const items: { group: TodoTimeGroup; todo: LeaderTodo }[] = []
    for (const g of order) {
      for (const todo of grouped[g]) {
        items.push({ group: g, todo })
      }
    }
    return items.slice(0, 8)
  }, [grouped])

  // Track which groups appear in the visible list for section headers
  const visibleGroups = useMemo(() => {
    const seen = new Set<TodoTimeGroup>()
    const result: { group: TodoTimeGroup; startIdx: number }[] = []
    visibleTodos.forEach((item, idx) => {
      if (!seen.has(item.group)) {
        seen.add(item.group)
        result.push({ group: item.group, startIdx: idx })
      }
    })
    return result
  }, [visibleTodos])

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-primary-100/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-primary-50">
          <div className="h-4 w-32 bg-primary-50 rounded-lg animate-pulse" />
        </div>
        <div className="divide-y divide-primary-50/60">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="w-5 h-5 rounded-full bg-primary-50 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 bg-primary-50 rounded animate-pulse" />
                <div className="h-2.5 w-1/2 bg-primary-50/60 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-primary-50/60 to-moss-50/40 shadow-sm border border-primary-100/40 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-moss-100 flex items-center justify-center mx-auto mb-3">
          <ListTodo size={22} className="text-primary-400" />
        </div>
        <p className="text-sm font-semibold text-primary-600 mb-1">All caught up</p>
        <p className="text-xs text-primary-400 mb-3">No pending todos right now</p>
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => navigate('/leader/tasks')}
        >
          Add a Todo
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-primary-100/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary-50/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-moss-600 flex items-center justify-center shadow-sm">
            <ListTodo size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary-800">Your Todos</h3>
            <p className="text-[11px] text-primary-400 font-medium">
              {totalCount} pending
              {overdueCount > 0 && (
                <span className="text-error-500 font-bold ml-1">
                  · {overdueCount} overdue
                </span>
              )}
              {todayCount > 0 && overdueCount === 0 && (
                <span className="text-warning-600 font-bold ml-1">
                  · {todayCount} due today
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Circular progress ring */}
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary-50" />
            <motion.circle
              cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
              className={overdueCount > 0 ? 'text-error-400' : 'text-moss-500'}
              strokeDasharray={`${87.96}`}
              initial={{ strokeDashoffset: 87.96 }}
              animate={{ strokeDashoffset: totalCount > 0 ? 87.96 * (1 - Math.min(overdueCount + todayCount, totalCount) / totalCount) : 87.96 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-700 tabular-nums">
            {totalCount}
          </span>
        </div>
      </div>

      {/* Todo list */}
      <div className="divide-y divide-primary-50/60">
        <AnimatePresence mode="popLayout">
          {visibleTodos.map((item, idx) => {
            const groupInfo = visibleGroups.find((g) => g.startIdx === idx)
            return (
              <div key={item.todo.id}>
                {/* Group header */}
                {groupInfo && (
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <span className={cn('w-1.5 h-1.5 rounded-full', TIME_GROUP_CONFIG[groupInfo.group].dotColor)} />
                    <span className={cn('text-[10px] font-bold uppercase tracking-widest', TIME_GROUP_CONFIG[groupInfo.group].color)}>
                      {TIME_GROUP_CONFIG[groupInfo.group].label}
                    </span>
                    <span className="text-[10px] font-semibold text-primary-300 tabular-nums">
                      {grouped[groupInfo.group].length}
                    </span>
                  </div>
                )}
                <TodoItem todo={item.todo} reducedMotion={rm} />
              </div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {totalCount > 8 && (
        <div className="px-4 py-2 border-t border-primary-50/80 bg-primary-25/30">
          <p className="text-[11px] text-primary-400 text-center font-medium">
            +{totalCount - 8} more todos
          </p>
        </div>
      )}

      {/* View all link */}
      <Link
        to="/leader/tasks"
        className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-primary-50/80 bg-primary-25/20 hover:bg-primary-50/40 active:scale-[0.99] transition-all duration-150 group"
      >
        <span className="text-xs font-semibold text-primary-500 group-hover:text-primary-700 transition-colors">
          View all tasks & todos
        </span>
        <ArrowRight size={13} className="text-primary-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Leader Dashboard Page                                              */
/* ------------------------------------------------------------------ */

function LeaderPassthroughWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function LeaderPageWrapper({ children }: { children: React.ReactNode }) {
  return <Page swipeBack noBackground stickyOverlay={<Header title="" back transparent className="collapse-header" />}>{children}</Page>
}

export default function LeaderDashboardPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { collectiveRoles } = useAuth()
  const isInLeaderLayout = useIsLeaderLayout()
  const leaderCtx = useLeaderContext()
  const queryClient = useQueryClient()

  const fallbackCollectiveId = useMemo(() => {
    const membership = collectiveRoles.find(
      (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
    )
    return membership?.collective_id
  }, [collectiveRoles])

  const collectiveId = leaderCtx.collectiveId ?? fallbackCollectiveId

  const { data, isLoading } = useLeaderDashboard(collectiveId)
  const { data: impactStats } = useCollectiveFullStats(collectiveId)

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leader-dashboard', collectiveId] }),
      queryClient.invalidateQueries({ queryKey: ['leader-impact-full', collectiveId] }),
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
    ])
  }, [queryClient, collectiveId])
  const showLoading = useDelayedLoading(isLoading)
  const { data: collectiveDetail } = useCollective(collectiveId)
  const collectiveSlug = leaderCtx.collectiveSlug ?? collectiveDetail?.slug ?? collectiveId
  const { data: engagement } = useEngagementScores(collectiveId)
  const { data: pendingItems = [] } = usePendingItems(collectiveId)
  const { data: unreadUpdateCount = 0 } = useUnreadUpdateCount()

  // Development progress  find in-progress module for "Continue Learning" quick action
  const { data: moduleProgress = [] } = useMyModuleProgress()
  const { data: devContent } = useMyTargetedContent()
  const continueModule = useMemo(() => {
    const inProgress = moduleProgress.find((mp) => mp.status === 'in_progress')
    if (!inProgress || !devContent?.modules) return null
    const mod = devContent.modules.find((m) => m.id === inProgress.module_id)
    if (!mod) return null
    return { id: mod.id, title: mod.title }
  }, [moduleProgress, devContent])

  // Tasks integration
  const { data: tasks } = useMyTasks()
  const generateMutation = useGenerateTaskInstances()
  const groups = useGroupedTasks(tasks)
  useEffect(() => { generateMutation.mutate() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const pendingTasks = useMemo(() => {
    return groups.flatMap((g) => g.tasks).filter((t) => t.status === 'pending')
  }, [groups])
  const overdueTaskCount = useMemo(() => {
    const now = new Date()
    return pendingTasks.filter((t) => new Date(t.due_date) < now).length
  }, [pendingTasks])

  const collectiveNameRaw = collectiveDetail?.name ?? 'Your Collective'
  const collectiveName = collectiveNameRaw.replace(/\s+Collective$/i, '')

  const fullBleedOpts = useMemo(() => ({ fullBleed: true as const }), [])
  useLeaderHeader('Dashboard', fullBleedOpts)

  const Wrapper = isInLeaderLayout ? LeaderPassthroughWrapper : LeaderPageWrapper

  // Find an event within ±3 hours of now (must be before early returns)
  const [mountTime] = useState(() => Date.now())
  const currentEvent = useMemo(() => {
    if (!data?.upcomingEvents) return null
    const THREE_HOURS = 3 * 60 * 60 * 1000
    return (data.upcomingEvents as { date_start: string; id: string }[]).find((e) => {
      const start = new Date(e.date_start).getTime()
      return mountTime >= start - THREE_HOURS && mountTime <= start + THREE_HOURS
    }) ?? null
  }, [data, mountTime])

  // Next upcoming event for "Edit Event" quick action (must be before early returns)
  const nextUpcomingEvent = useMemo(() => {
    if (!data?.upcomingEvents?.length) return null
    return (data.upcomingEvents as { date_start: string; id: string }[])[0] ?? null
  }, [data])

  if (showLoading) {
    return (
      <Wrapper>
        <div className="relative min-h-dvh overflow-x-hidden bg-white">
          {/* Hero skeleton */}
          <div className="relative h-[280px] bg-gradient-to-br from-primary-200 via-moss-200 to-primary-300 animate-pulse" />
          <div className="relative z-10 px-6 -mt-6 space-y-4 pb-20">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-primary-50 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            <div className="h-12 rounded-2xl bg-primary-50" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-primary-50" />
              ))}
            </div>
          </div>
        </div>
      </Wrapper>
    )
  }

  if (!collectiveId) {
    return (
      <Wrapper>
        <EmptyState
          illustration="empty"
          title="No collective found"
          description="You need to be a leader, co-leader, or assist-leader of a collective to access this dashboard."
          action={{ label: 'Explore Collectives', to: '/collectives' }}
        />
      </Wrapper>
    )
  }

  const quickActions: { label: string; icon: React.ReactNode; to: string; bg: string; text: string; badge: number; pulse?: boolean }[] = [
    ...(currentEvent ? [{
      label: 'Current Event',
      icon: <Flame size={18} />,
      to: `/events/${currentEvent.id}`,
      bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      text: 'text-white',
      badge: 0,
      pulse: true,
    }] : []),
    ...(nextUpcomingEvent ? [{
      label: 'Edit Event',
      icon: <Pencil size={18} />,
      to: `/events/${nextUpcomingEvent.id}/edit?mode=day-of`,
      bg: 'bg-moss-600',
      text: 'text-white',
      badge: 0,
    }] : []),
    ...(pendingItems.length > 0 ? [{
      label: 'Log Impact',
      icon: <Leaf size={18} />,
      to: `/events/${pendingItems[0].id}/impact`,
      bg: 'bg-gradient-to-br from-moss-500 to-moss-700',
      text: 'text-white',
      badge: pendingItems.length > 1 ? pendingItems.length : 0,
    }] : []),
    ...(continueModule ? [{
      label: 'Continue Learning',
      icon: <BookOpen size={18} />,
      to: `/learn/module/${continueModule.id}`,
      bg: 'bg-gradient-to-br from-plum-500 to-plum-700',
      text: 'text-white',
      badge: 0,
    }] : []),
    { label: 'Chat', icon: <MessageCircle size={18} />, to: `/chat/${collectiveId}`, bg: 'bg-primary-600', text: 'text-white', badge: 0 },
    { label: 'Updates', icon: <Megaphone size={18} />, to: '/updates', bg: 'bg-primary-400', text: 'text-white', badge: unreadUpdateCount },
    { label: 'Invite', icon: <UserPlus size={18} />, to: `/collectives/${collectiveSlug}/manage`, bg: 'bg-bark-600', text: 'text-white', badge: 0 },
  ]

  // Build impact cards from stats
  const impactCards = impactStats ? [
    { value: impactStats.volunteerHours, label: 'Volunteer Hours', unit: 'hrs', icon: <Clock size={15} className="text-primary-600" />, color: 'bg-primary-100' },
    { value: impactStats.treesPlanted, label: 'Trees Planted', icon: <TreePine size={15} className="text-moss-600" />, color: 'bg-moss-100' },
    { value: impactStats.invasiveWeedsPulled, label: 'Weeds Pulled', icon: <Sprout size={15} className="text-plum-600" />, color: 'bg-plum-100' },
    { value: impactStats.rubbishKg, label: 'Rubbish Collected', unit: 'kg', icon: <Trash2 size={15} className="text-bark-600" />, color: 'bg-bark-100' },
    { value: impactStats.cleanupSites, label: 'Cleanup Sites', icon: <Trash2 size={15} className="text-sky-600" />, color: 'bg-sky-100' },
    { value: impactStats.leadersEmpowered, label: 'Leaders Empowered', icon: <GraduationCap size={15} className="text-bark-700" />, color: 'bg-bark-50' },
  ].filter((c) => c.value > 0) : []

  return (
    <Wrapper>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-full bg-white">
        {/* ── Hero with collective cover image + rocky wave overlay ── */}
        <div className={cn('relative', !isInLeaderLayout && '-mx-4 lg:-mx-6')}>
          <div className="relative w-full h-[52vw] min-h-[220px] max-h-[320px] overflow-hidden">
            {collectiveDetail?.cover_image_url ? (
              <img
                src={collectiveDetail.cover_image_url}
                alt={collectiveName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-moss-600 via-primary-700 to-primary-900" />
            )}
            {/* Dark overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

            {/* Hero text */}
            <div className="absolute inset-x-0 bottom-0 z-[2] px-6 pb-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 mb-1">
                Leader Dashboard
              </p>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white drop-shadow-md">
                {collectiveName}
              </h1>
              {collectiveDetail?.region && (
                <p className="flex items-center gap-1 text-xs text-white/70 mt-1">
                  <MapPin size={11} />
                  {collectiveDetail.region}{collectiveDetail?.state ? `, ${collectiveDetail.state}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Rocky wave overlay - single layer, like root homepage */}
          <div className="absolute bottom-0 left-0 right-0 z-[3]">
            <svg
              viewBox="0 0 1440 70"
              preserveAspectRatio="none"
              className="w-full h-7 sm:h-10 block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,25
                   C60,22 100,18 140,20
                   C180,22 200,15 220,18
                   L228,8 L234,5 L240,10
                   C280,18 340,24 400,20
                   C440,16 470,22 510,25
                   C560,28 600,20 640,22
                   C670,24 690,18 710,20
                   L718,10 L722,6 L728,12
                   C760,20 820,26 880,22
                   C920,18 950,24 990,26
                   C1020,28 1050,20 1080,18
                   C1100,16 1120,22 1140,24
                   L1148,12 L1153,7 L1158,9 L1165,16
                   C1200,22 1260,26 1320,22
                   C1360,18 1400,24 1440,22
                   L1440,70 L0,70 Z"
                className="fill-white"
              />
            </svg>
          </div>
        </div>

        {/* ── Content on white background ── */}
        <motion.div
          className="relative z-10 px-6 -mt-1 space-y-6 pb-24"
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── At-a-glance stats ── */}
          <motion.div variants={rm ? undefined : fadeUp}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-4 text-center shadow-md">
                <Users size={20} className="text-white/60 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-white tabular-nums leading-none">{data?.activeMembers ?? 0}</p>
                <p className="mt-1 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Members</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-moss-500 to-moss-600 p-4 text-center shadow-md">
                <CalendarDays size={20} className="text-white/60 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-white tabular-nums leading-none">{data?.upcomingEvents?.length ?? 0}</p>
                <p className="mt-1 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Upcoming</p>
              </div>
              <div className="rounded-2xl bg-primary-50/60 shadow-sm border border-primary-100/40 p-4 text-center">
                <Clock size={20} className="text-primary-400 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-primary-800 tabular-nums leading-none">{data?.hoursThisMonth ?? 0}</p>
                <p className="mt-1 text-[11px] font-semibold text-primary-400 uppercase tracking-wider">Hrs/Month</p>
              </div>
              <div className="rounded-2xl bg-primary-50/60 shadow-sm border border-primary-100/40 p-4 text-center">
                <CalendarCheck size={20} className="text-primary-400 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-primary-800 tabular-nums leading-none">{data?.eventsThisMonth ?? 0}</p>
                <p className="mt-1 text-[11px] font-semibold text-primary-400 uppercase tracking-wider">Events/Month</p>
              </div>
            </div>
          </motion.div>

          {/* ── Quick actions ── */}
          <motion.div variants={rm ? undefined : fadeUp}>
            <SectionHeader>Quick Actions</SectionHeader>
            <div className={cn('grid gap-2', quickActions.length <= 2 ? 'grid-cols-2' : quickActions.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 rounded-xl bg-primary-50/50 shadow-sm border border-primary-100/40 p-3 hover:shadow-md active:scale-[0.96] transition-transform duration-150',
                    action.pulse && 'ring-2 ring-amber-400/50 shadow-amber-200/30',
                  )}
                >
                  <div className={cn(
                    'relative flex items-center justify-center w-9 h-9 rounded-lg transition-transform group-hover:scale-105',
                    action.bg, action.text,
                  )}>
                    {action.icon}
                    {action.pulse && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse ring-2 ring-white" />
                    )}
                    {action.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                        {action.badge > 99 ? '99+' : action.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-primary-600 text-center leading-tight">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ── Needs attention ── */}
          {pendingItems.length > 0 && (
            <motion.div variants={rm ? undefined : fadeUp}>
              <SectionHeader icon={<Bell size={14} />}>
                Needs Attention
              </SectionHeader>
              <div className="rounded-2xl bg-warning-50 border border-warning-200/50 overflow-hidden">
                {pendingItems.map((item, idx) => (
                  <Link
                    key={item.id}
                    to={`/events/${item.id}/impact`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5',
                      'hover:bg-warning-100/50 active:scale-[0.99] transition-[colors,transform] duration-150',
                      idx > 0 && 'border-t border-warning-200/30',
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning-100 shrink-0">
                      <AlertTriangle size={14} className="text-warning-600" />
                    </div>
                    <span className="text-sm text-primary-700 flex-1 font-medium">{item.message}</span>
                    <ChevronRight size={14} className="text-warning-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Upcoming Todos Widget ── */}
          <motion.div variants={rm ? undefined : fadeUp}>
            <UpcomingTodosWidget />
          </motion.div>

          {/* ── Tasks (inline) ── */}
          {pendingTasks.length > 0 && (
            <motion.div variants={rm ? undefined : fadeUp}>
              <SectionHeader icon={<ClipboardCheck size={14} />}>
                Your Tasks
                {overdueTaskCount > 0 && (
                  <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-error-50 text-error-600 normal-case tracking-normal flex items-center gap-1">
                    <Flame size={10} /> {overdueTaskCount} overdue
                  </span>
                )}
              </SectionHeader>
              <div className="space-y-1.5">
                {pendingTasks.slice(0, 5).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {pendingTasks.length > 5 && (
                  <p className="text-xs text-primary-400 text-center pt-2">
                    +{pendingTasks.length - 5} more tasks
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Events (upcoming + calendar) ── */}
          <motion.div variants={rm ? undefined : fadeUp}>
            <SectionHeader action={{ label: 'View all', to: '/leader/events' }} icon={<CalendarDays size={14} />}>
              Events
            </SectionHeader>
            {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {data.upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-moss-50/50 shadow-sm border border-moss-100/40 hover:shadow-md active:scale-[0.99] transition-transform duration-150"
                  >
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-moss-50 to-primary-50 flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-moss-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm font-bold text-primary-800 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-primary-500 mt-0.5 font-medium">
                        {new Date(event.date_start).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      {event.address && (
                        <p className="text-[11px] text-primary-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {event.address}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-primary-200 shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-moss-50 border border-moss-100 text-center">
                <div className="w-12 h-12 rounded-2xl bg-moss-100 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays size={24} className="text-moss-400" />
                </div>
                <p className="text-sm font-medium text-primary-600 mb-3">No upcoming events</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/leader/events/create')}
                  icon={<Plus size={14} />}
                >
                  Create Event
                </Button>
              </div>
            )}
            <div className="mt-4">
              <MiniCalendar collectiveId={collectiveId} />
            </div>
          </motion.div>

          {/* ── Environmental Impact ── */}
          {impactCards.length > 0 && (
            <motion.div variants={rm ? undefined : fadeUp}>
              <SectionHeader icon={<TreePine size={14} />}>
                Environmental Impact
              </SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {impactCards.map((card) => (
                  <ImpactMini
                    key={card.label}
                    value={card.value}
                    label={card.label}
                    unit={card.unit}
                    icon={card.icon}
                    color={card.color}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Attendance rate ── */}
          {(data?.attendanceRate ?? 0) > 0 && (
            <motion.div variants={rm ? undefined : fadeUp}>
              <div className="rounded-2xl bg-success-50/40 shadow-sm border border-success-100/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-success-100 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-success-600" />
                  </div>
                  <span className="text-xs font-semibold text-primary-500">Attendance Rate</span>
                  <span className="ml-auto text-xl font-bold text-primary-800 tabular-nums">
                    {data?.attendanceRate}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-primary-50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${data?.attendanceRate}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Members (engagement + recent + invite) ── */}
          <motion.div variants={rm ? undefined : fadeUp}>
            <SectionHeader icon={<Users size={14} />}>
              Members
            </SectionHeader>
            <div className="space-y-4">
              {/* Engagement summary */}
              {engagement && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-success-50 border border-success-100/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-success-100 flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-success-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-primary-800 leading-none tabular-nums">
                      {engagement.active.length}
                    </p>
                    <p className="text-xs font-semibold text-success-600 mt-1">Active</p>
                    <p className="text-[11px] text-primary-400 mt-0.5">Last 30 days</p>
                  </div>
                  <div className="rounded-2xl bg-warning-50 border border-warning-100/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-warning-100 flex items-center justify-center">
                        <AlertTriangle size={12} className="text-warning-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-primary-800 leading-none tabular-nums">
                      {engagement.atRisk.length}
                    </p>
                    <p className="text-xs font-semibold text-warning-600 mt-1">At Risk</p>
                    <p className="text-[11px] text-primary-400 mt-0.5">Inactive 30+ days</p>
                  </div>
                </div>
              )}

              {/* Recent members */}
              {data?.recentMembers && data.recentMembers.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserPlus size={11} /> Recently Joined
                  </p>
                  <div className="rounded-2xl bg-primary-50/40 shadow-sm border border-primary-100/40 overflow-hidden">
                    {data.recentMembers.map((member, idx) => {
                      const profile = (member as unknown as { profiles?: { display_name?: string; avatar_url?: string } }).profiles
                      return (
                        <Link
                          key={member.id}
                          to={`/profile/${member.user_id}`}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3',
                            'hover:bg-primary-50/50 active:scale-[0.99] transition-[colors,transform] duration-150',
                            idx > 0 && 'border-t border-primary-50',
                          )}
                        >
                          <Avatar
                            src={profile?.avatar_url}
                            name={profile?.display_name ?? ''}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-primary-800 truncate">
                              {profile?.display_name ?? 'Unknown'}
                            </p>
                            <p className="text-[11px] text-primary-400 mt-0.5">
                              Joined{' '}
                              {new Date(member.joined_at).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-primary-200 shrink-0" />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-primary-400 bg-primary-50/40 shadow-sm border border-primary-100/40 rounded-2xl p-4">No recent members</p>
              )}

              {/* Invite / grow */}
              <InviteAction
                collectiveSlug={collectiveSlug}
                collectiveId={collectiveId}
                collectiveName={collectiveName}
              />
            </div>
          </motion.div>

        </motion.div>
      </PullToRefresh>
    </Wrapper>
  )
}

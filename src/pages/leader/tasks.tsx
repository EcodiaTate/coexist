import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    CheckCircle, Clock,
    AlertTriangle, ChevronRight,
    Calendar, FileText,
    SkipForward, Flame, Sparkles
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useLeaderHeader } from '@/components/leader-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import {
    useMyTasks,
    useCompleteTask,
    useSkipTask,
    useGenerateTaskInstances,
    useGroupedTasks,
    type MyTask,
} from '@/hooks/use-tasks'
import { CATEGORY_COLORS } from '@/hooks/use-admin-tasks'

/* ------------------------------------------------------------------ */
/*  Streak / momentum helper                                           */
/* ------------------------------------------------------------------ */

function getStreak(tasks: MyTask[]): number {
  const completed = tasks
    .filter((t) => t.status === 'completed' && t.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  if (completed.length === 0) return 0

  let streak = 0
  const now = new Date()
  let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (const task of completed) {
    const taskDate = new Date(task.completed_at!)
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
    const diff = Math.round((checkDate.getTime() - taskDay.getTime()) / 86400000)

    if (diff <= 1) {
      streak++
      checkDate = taskDay
    } else {
      break
    }
  }
  return streak
}

/* ------------------------------------------------------------------ */
/*  Task card - reimagined                                             */
/* ------------------------------------------------------------------ */

function TaskCard({ task }: { task: MyTask }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const { toast } = useToast()
  const completeMutation = useCompleteTask()
  const skipMutation = useSkipTask()
  const shouldReduceMotion = useReducedMotion()

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
      layout={!shouldReduceMotion}
      className={cn(
        'rounded-2xl overflow-hidden transition-all duration-200',
        isCompleted && 'opacity-50',
        isSkipped && 'opacity-40',
        !isCompleted && !isSkipped && 'bg-white shadow-sm',
        isOverdue && !isCompleted && 'bg-white shadow-md ring-1 ring-error-200/60',
      )}
    >
      <div className="flex items-stretch">
        {/* Left accent stripe */}
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
            'flex-1 flex items-start gap-3 p-4 text-left cursor-pointer min-w-0',
            (isCompleted || isSkipped) && 'p-3',
          )}
        >
          {/* Completion circle */}
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
              <div className="w-5 h-5 rounded-full border-2 border-primary-200 group-hover:border-moss-400 transition-colors" />
            )}
          </div>

          {/* Content */}
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

              {task.event && !isCompleted && !isSkipped && (
                <span className="text-[11px] text-primary-300 flex items-center gap-1">
                  <Calendar size={10} />
                  {task.event.title}
                </span>
              )}
            </div>
          </div>

          {/* Expand indicator */}
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

      {/* Expanded actions */}
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
                    <p className="text-[10px] text-primary-400">Tap to open</p>
                  </div>
                </a>
              )}
              <Input
                placeholder="Add a note (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                compact
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle size={14} />}
                  loading={completeMutation.isPending}
                  onClick={() => {
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
                  }}
                >
                  Done
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
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Collective group                                                   */
/* ------------------------------------------------------------------ */

function CollectiveGroup({
  name,
  tasks,
  pendingCount,
  overdueCount,
}: {
  name: string
  tasks: MyTask[]
  pendingCount: number
  overdueCount: number
}) {
  const [showCompleted, setShowCompleted] = useState(false)

  const pending = tasks.filter((t) => t.status === 'pending')
  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'skipped')

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">{name}</p>
        <div className="flex-1 h-px bg-primary-100" />
        {overdueCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error-50 text-error-600 flex items-center gap-1">
            <Flame size={10} /> {overdueCount}
          </span>
        )}
        {pendingCount > 0 && overdueCount === 0 && (
          <span className="text-[10px] font-semibold text-primary-400">{pendingCount} to do</span>
        )}
      </div>

      {/* Pending tasks */}
      <div className="space-y-1.5">
        {pending.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <button
          type="button"
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-1.5 text-[11px] text-primary-400 cursor-pointer select-none py-1 px-1 hover:text-primary-600 transition-colors"
        >
          <motion.div animate={{ rotate: showCompleted ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight size={12} />
          </motion.div>
          {completed.length} completed
        </button>
      )}
      <AnimatePresence>
        {showCompleted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 overflow-hidden"
          >
            {completed.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderTasksPage() {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { data: tasks, isLoading } = useMyTasks()
  const generateMutation = useGenerateTaskInstances()
  const groups = useGroupedTasks(tasks)

  useLeaderHeader('Tasks', { fullBleed: true })

  useEffect(() => {
    generateMutation.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = useCallback(async () => {
    await generateMutation.mutateAsync()
    await queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
  }, [generateMutation, queryClient])

  const totalPending = groups.reduce((sum, g) => sum + g.pendingCount, 0)
  const totalOverdue = groups.reduce((sum, g) => sum + g.overdueCount, 0)
  const totalCompleted = groups.reduce((sum, g) => g.tasks.filter((t) => t.status === 'completed').length + sum, 0)
  const allTasks = groups.flatMap((g) => g.tasks)
  const streak = getStreak(allTasks)

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-white to-moss-50/20" />
        <div className="relative z-10 px-6 pt-4 space-y-5 pb-20">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton variant="list-item" count={5} />
        </div>
      </div>
    )
  }

  /* ---- Empty state ---- */
  if (!groups.length) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-white to-moss-50/20" />

        {/* Decorative shapes */}
        <motion.div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full border border-amber-200/35"
          animate={rm ? undefined : { rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-32 -left-8 w-24 h-24 rounded-full bg-amber-100/25"
          animate={rm ? undefined : { y: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-52 right-8 w-3 h-3 rounded-full bg-amber-300/30"
          animate={rm ? undefined : { y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6">
          <motion.div
            initial={rm ? undefined : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-moss-100 to-moss-200 flex items-center justify-center mb-5"
          >
            <Sparkles size={36} className="text-moss-500" />
          </motion.div>
          <p className="font-heading text-xl font-bold text-primary-800 mb-1">All caught up!</p>
          <p className="text-sm text-primary-400">No tasks right now. Enjoy the moment.</p>
        </div>
      </div>
    )
  }

  // Progress ring percentage
  const total = totalPending + totalCompleted
  const progressPct = total > 0 ? Math.round((totalCompleted / total) * 100) : 0

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Full-bleed gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-white to-moss-50/20" />

      {/* Animated decorative shapes */}
      <motion.div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-amber-200/35"
        animate={rm ? undefined : { rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-20 -left-12 w-32 h-32 rounded-full border border-amber-200/35"
        animate={rm ? undefined : { rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-40 -right-6 w-20 h-20 rounded-full bg-amber-100/25"
        animate={rm ? undefined : { y: [0, 14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-72 -left-4 w-16 h-16 rounded-full bg-moss-100/20"
        animate={rm ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating dots */}
      <motion.div
        className="absolute top-28 right-12 w-2.5 h-2.5 rounded-full bg-amber-300/30"
        animate={rm ? undefined : { y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-56 left-10 w-2 h-2 rounded-full bg-moss-300/25"
        animate={rm ? undefined : { y: [0, 6, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute top-96 right-20 w-3 h-3 rounded-full bg-amber-300/30"
        animate={rm ? undefined : { y: [0, -10, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 px-6 pt-4 space-y-5 pb-20"
        variants={rm ? undefined : { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden"
        animate="visible"
      >
        {/* Hero title */}
        <motion.div
          className="text-center pt-2 pb-1"
          variants={rm ? undefined : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80 mb-1">Stay on track</p>
          <h1 className="font-heading text-2xl font-extrabold text-primary-900">Tasks</h1>
        </motion.div>

        {/* Momentum dashboard */}
        <motion.div
          variants={rm ? undefined : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="grid grid-cols-3 gap-3"
        >
          {/* Progress */}
          <div className="rounded-2xl bg-white shadow-sm p-4 flex flex-col items-center justify-center text-center">
            <div className="relative w-12 h-12 mb-2">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary-100" />
                <motion.circle
                  cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
                  className="text-moss-500"
                  strokeDasharray={`${progressPct * 0.942} 100`}
                  initial={{ strokeDasharray: '0 100' }}
                  animate={{ strokeDasharray: `${progressPct * 0.942} 100` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-700">
                {progressPct}%
              </span>
            </div>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider">Done</p>
          </div>

          {/* Overdue */}
          <div className={cn(
            'rounded-2xl p-4 flex flex-col items-center justify-center text-center',
            totalOverdue > 0
              ? 'bg-gradient-to-br from-error-50 to-error-100/60 shadow-sm'
              : 'bg-white shadow-sm',
          )}>
            <p className={cn(
              'font-heading text-2xl font-extrabold tabular-nums leading-none',
              totalOverdue > 0 ? 'text-error-600' : 'text-primary-300',
            )}>
              {totalOverdue}
            </p>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mt-1.5">Overdue</p>
          </div>

          {/* Streak */}
          <div className={cn(
            'rounded-2xl p-4 flex flex-col items-center justify-center text-center',
            streak >= 3
              ? 'bg-gradient-to-br from-amber-50 to-warning-100/60 shadow-sm'
              : 'bg-white shadow-sm',
          )}>
            <div className="flex items-center gap-0.5">
              {streak >= 3 && <Flame size={16} className="text-amber-500" />}
              <p className={cn(
                'font-heading text-2xl font-extrabold tabular-nums leading-none',
                streak >= 3 ? 'text-amber-600' : 'text-primary-300',
              )}>
                {streak}
              </p>
            </div>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mt-1.5">Streak</p>
          </div>
        </motion.div>

        {/* Task groups inside PullToRefresh */}
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-6">
            {groups.map((group) => (
              <motion.div
                key={group.collective_id}
                variants={rm ? undefined : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <CollectiveGroup
                  name={group.collective_name}
                  tasks={group.tasks}
                  pendingCount={group.pendingCount}
                  overdueCount={group.overdueCount}
                />
              </motion.div>
            ))}
          </div>
        </PullToRefresh>
      </motion.div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calendar,
  SkipForward,
  MessageSquare,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
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
import { formatSchedule, CATEGORY_COLORS } from '@/hooks/use-admin-tasks'

/* ------------------------------------------------------------------ */
/*  Task card                                                          */
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

  return (
    <motion.div
      layout={!shouldReduceMotion}
      className={cn(
        'rounded-xl overflow-hidden transition-colors duration-150',
        isCompleted ? 'bg-success-50/50' : isSkipped ? 'bg-surface-3' : 'bg-surface-2 shadow-sm',
        isOverdue && 'bg-error-50/60 shadow-md',
      )}
    >
      <button
        type="button"
        onClick={() => !isCompleted && !isSkipped && setExpanded(!expanded)}
        className={cn(
          'w-full flex items-start gap-3 p-3.5 text-left cursor-pointer',
          (isCompleted || isSkipped) && 'opacity-60',
        )}
      >
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          {isCompleted ? (
            <CheckCircle size={18} className="text-success-500" />
          ) : isSkipped ? (
            <SkipForward size={14} className="text-neutral-400" />
          ) : isOverdue ? (
            <AlertTriangle size={18} className="text-error-500" />
          ) : (
            <Circle size={18} className="text-primary-300" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={cn(
              'text-sm font-medium truncate',
              isCompleted || isSkipped ? 'text-primary-400 line-through' : 'text-primary-800',
            )}>
              {task.template?.title ?? 'Task'}
            </p>
            {task.template?.category && (
              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0', CATEGORY_COLORS[task.template.category])}>
                {task.template.category.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-primary-400">
            <span className={cn('flex items-center gap-1', isOverdue && 'text-error-500 font-medium')}>
              <Clock size={11} />
              {formattedDue}
              {!isCompleted && !isSkipped && (
                isOverdue
                  ? ` (${Math.abs(daysUntil)}d overdue)`
                  : daysUntil <= 2
                    ? ` (${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `${daysUntil}d`})`
                    : ''
              )}
            </span>
            {task.event && (
              <>
                <span className="text-primary-200">·</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {task.event.title}
                </span>
              </>
            )}
          </div>

          {task.template?.description && !isCompleted && !isSkipped && (
            <p className="text-[11px] text-primary-400 mt-1 line-clamp-1">{task.template.description}</p>
          )}
        </div>

        {/* Expand chevron */}
        {!isCompleted && !isSkipped && (
          <div className="shrink-0 mt-0.5">
            {expanded ? (
              <ChevronDown size={16} className="text-primary-400" />
            ) : (
              <ChevronRight size={16} className="text-primary-300" />
            )}
          </div>
        )}
      </button>

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
            <div className="px-3.5 pb-3.5 space-y-2">
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
                  Complete
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
  const [collapsed, setCollapsed] = useState(false)

  const pending = tasks.filter((t) => t.status === 'pending')
  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'skipped')

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full py-1 cursor-pointer"
      >
        {collapsed ? (
          <ChevronRight size={16} className="text-primary-400" />
        ) : (
          <ChevronDown size={16} className="text-primary-400" />
        )}
        <p className="text-sm font-semibold text-primary-800">{name}</p>
        {pendingCount > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600">
            {pendingCount}
          </span>
        )}
        {overdueCount > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-error-100 text-error-700">
            {overdueCount} overdue
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1.5">
          {pending.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {completed.length > 0 && (
            <details className="group">
              <summary className="text-[11px] text-primary-400 cursor-pointer py-1 select-none">
                {completed.length} completed
              </summary>
              <div className="space-y-1 mt-1">
                {completed.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { data: tasks, isLoading } = useMyTasks()
  const generateMutation = useGenerateTaskInstances()
  const groups = useGroupedTasks(tasks)

  // Lazy-generate task instances on mount
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

  if (isLoading) {
    return (
      <Page header={<Header title="Tasks" />}>
        <div className="py-4">
          <Skeleton variant="list-item" count={6} />
        </div>
      </Page>
    )
  }

  if (!groups.length) {
    return (
      <Page header={<Header title="Tasks" />}>
        <EmptyState
          illustration="empty"
          title="All caught up!"
          description="No tasks assigned to your collectives right now"
        />
      </Page>
    )
  }

  return (
    <Page header={<Header title="Tasks" />}>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="py-4 space-y-6">
          {/* Summary bar */}
          {(totalPending > 0 || totalOverdue > 0) && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-primary-600 font-medium">
                {totalPending} pending
              </span>
              {totalOverdue > 0 && (
                <span className="text-error-600 font-medium">
                  {totalOverdue} overdue
                </span>
              )}
            </div>
          )}

          {/* Grouped task list */}
          {groups.map((group) => (
            <CollectiveGroup
              key={group.collective_id}
              name={group.collective_name}
              tasks={group.tasks}
              pendingCount={group.pendingCount}
              overdueCount={group.overdueCount}
            />
          ))}
        </div>
      </PullToRefresh>
    </Page>
  )
}

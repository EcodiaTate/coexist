import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BookOpen,
  Layers,
  Clock,
  ChevronRight,
  Compass,
} from 'lucide-react'
import { Skeleton } from '@/components/skeleton'
import { ProgressRing } from '@/components/development/progress-ring'
import { cn } from '@/lib/cn'
import { useMyAssignments, type DevAssignment } from '@/hooks/use-development-assignments'
import { useMyModuleProgress, useMySectionProgress } from '@/hooks/use-development-progress'

/* ------------------------------------------------------------------ */
/*  Assignment card                                                    */
/* ------------------------------------------------------------------ */

function AssignmentCard({
  assignment,
  progressPct,
  status,
  delay,
  rm,
}: {
  assignment: DevAssignment
  progressPct: number
  status: 'not_started' | 'in_progress' | 'completed'
  delay: number
  rm: boolean
}) {
  const isModule = !!assignment.module_id
  const item = isModule ? assignment.module : assignment.section
  if (!item) return null

  const linkTo = isModule
    ? `/learn/module/${assignment.module_id}`
    : `/learn/section/${assignment.section_id}`

  const actionLabel = status === 'completed' ? 'Review' : status === 'in_progress' ? 'Continue' : 'Start'

  return (
    <motion.div
      initial={rm ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: rm ? 0 : delay }}
    >
      <Link
        to={linkTo}
        className="group flex items-center gap-3.5 p-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
      >
        {/* Thumbnail or icon */}
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200/60 shrink-0">
            {isModule ? (
              <BookOpen size={22} className="text-primary-500" />
            ) : (
              <Layers size={22} className="text-secondary-500" />
            )}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary-800 truncate group-hover:text-primary-600 transition-colors">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-primary-500 capitalize">
              {(item.category ?? '').replace(/_/g, ' ')}
            </span>
            {'estimated_minutes' in item && (
              <span className="flex items-center gap-0.5 text-xs text-primary-400">
                <Clock size={10} />
                {item.estimated_minutes}m
              </span>
            )}
            {assignment.due_date && (
              <span className="text-xs text-bark-500">
                Due {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Progress + action */}
        <div className="flex items-center gap-2 shrink-0">
          <ProgressRing percent={progressPct} size={36} />
          <span className="text-xs font-semibold text-primary-500 hidden sm:block">
            {actionLabel}
          </span>
          <ChevronRight size={16} className="text-primary-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LearnIndexPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  const { data: assignments, isLoading: assignmentsLoading } = useMyAssignments()
  const { data: moduleProgress = [] } = useMyModuleProgress()
  const { data: sectionProgress = [] } = useMySectionProgress()

  const progressMap = useMemo(() => {
    const map = new Map<string, { pct: number; status: 'not_started' | 'in_progress' | 'completed' }>()
    for (const mp of moduleProgress) {
      map.set(mp.module_id, { pct: mp.progress_pct, status: mp.status })
    }
    for (const sp of sectionProgress) {
      map.set(sp.section_id, { pct: sp.progress_pct, status: sp.status })
    }
    return map
  }, [moduleProgress, sectionProgress])

  const getProgress = (a: DevAssignment) => {
    const key = a.module_id ?? a.section_id ?? ''
    return progressMap.get(key) ?? { pct: 0, status: 'not_started' as const }
  }

  // Group assignments
  const grouped = useMemo(() => {
    const all = assignments ?? []
    const inProgress = all.filter((a) => getProgress(a).status === 'in_progress')
    const assigned = all.filter((a) => getProgress(a).status === 'not_started')
    const completed = all.filter((a) => getProgress(a).status === 'completed')
    return { inProgress, assigned, completed }
  }, [assignments, progressMap])

  const isLoading = assignmentsLoading

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={rm ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h1 className="font-heading text-xl font-bold text-primary-800">My Leadership Journey</h1>
        <p className="text-sm text-primary-500 mt-0.5">Your learning and development modules</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : (assignments ?? []).length === 0 ? (
        <motion.div
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/30"
        >
          <Compass size={40} className="text-primary-300 mb-3" />
          <p className="text-base font-semibold text-primary-600">No modules assigned yet</p>
          <p className="text-sm text-primary-400 mt-1 text-center max-w-xs">
            Your collective leader will assign learning and development modules for you to complete
          </p>
        </motion.div>
      ) : (
        <>
          {/* In Progress */}
          {grouped.inProgress.length > 0 && (
            <div>
              <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
                In Progress
              </h2>
              <div className="space-y-2">
                {grouped.inProgress.map((a, i) => {
                  const p = getProgress(a)
                  return (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      progressPct={p.pct}
                      status={p.status}
                      delay={i * 0.04}
                      rm={rm}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Assigned (not started) */}
          {grouped.assigned.length > 0 && (
            <div>
              <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
                Assigned
              </h2>
              <div className="space-y-2">
                {grouped.assigned.map((a, i) => {
                  const p = getProgress(a)
                  return (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      progressPct={p.pct}
                      status={p.status}
                      delay={i * 0.04}
                      rm={rm}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {grouped.completed.length > 0 && (
            <div>
              <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
                Completed
              </h2>
              <div className="space-y-2">
                {grouped.completed.map((a, i) => {
                  const p = getProgress(a)
                  return (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      progressPct={p.pct}
                      status={p.status}
                      delay={i * 0.04}
                      rm={rm}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

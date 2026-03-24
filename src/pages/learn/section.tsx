import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { ProgressRing } from '@/components/development/progress-ring'
import { cn } from '@/lib/cn'
import { useDevSection, useDevSectionModules } from '@/hooks/use-admin-development'
import { useMyModuleProgress } from '@/hooks/use-development-progress'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LearnSectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  const { data: section, isLoading: sectionLoading } = useDevSection(sectionId)
  const { data: sectionModules = [], isLoading: modulesLoading } = useDevSectionModules(sectionId)
  const { data: moduleProgress = [] } = useMyModuleProgress()

  const progressMap = useMemo(() => {
    const map = new Map<string, { pct: number; status: string }>()
    for (const mp of moduleProgress) {
      map.set(mp.module_id, { pct: mp.progress_pct, status: mp.status })
    }
    return map
  }, [moduleProgress])

  const completedCount = sectionModules.filter(
    (sm) => progressMap.get(sm.module_id)?.status === 'completed',
  ).length
  const totalCount = sectionModules.length
  const sectionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const isLoading = sectionLoading || modulesLoading

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    )
  }

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-primary-500">Section not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/learn')} className="mt-3">
          Back to My Learning
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => navigate('/learn')}
          className="text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-bold text-primary-800 truncate">{section.title}</h1>
          <p className="text-xs text-primary-500 capitalize">{section.category.replace(/_/g, ' ')}</p>
        </div>
        <ProgressRing percent={sectionPct} size={44} />
      </div>

      {section.description && (
        <motion.p
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-primary-600 mb-6 leading-relaxed"
        >
          {section.description}
        </motion.p>
      )}

      {/* Progress summary */}
      <motion.div
        initial={rm ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-primary-50/60 border border-primary-100 px-4 py-3 mb-6 flex items-center justify-between"
      >
        <p className="text-sm text-primary-600">
          <span className="font-bold text-primary-800">{completedCount}</span> of{' '}
          <span className="font-bold text-primary-800">{totalCount}</span> modules completed
        </p>
        <div className="h-1.5 flex-1 max-w-32 ml-4 rounded-full bg-primary-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${sectionPct}%` }}
          />
        </div>
      </motion.div>

      {/* Module list */}
      <div className="space-y-2">
        {sectionModules.map((sm, i) => {
          const mod = sm.module
          if (!mod) return null

          const modProgress = progressMap.get(sm.module_id)
          const status = modProgress?.status ?? 'not_started'
          const pct = modProgress?.pct ?? 0

          // Check if previous required module is completed
          const prevRequired = sectionModules
            .slice(0, i)
            .filter((prev) => prev.is_required)
          const allPrevComplete = prevRequired.every(
            (prev) => progressMap.get(prev.module_id)?.status === 'completed',
          )
          const isLocked = sm.is_required && !allPrevComplete && i > 0

          return (
            <motion.div
              key={sm.id}
              initial={rm ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rm ? 0 : i * 0.04 }}
            >
              {isLocked ? (
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-primary-50/40 border border-primary-100 opacity-60">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 shrink-0">
                    <Lock size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-500 truncate">{mod.title}</p>
                    <p className="text-xs text-primary-400">Complete previous modules first</p>
                  </div>
                </div>
              ) : (
                <Link
                  to={`/learn/module/${sm.module_id}`}
                  className="group flex items-center gap-3.5 p-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  {/* Status icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                      status === 'completed' && 'bg-moss-100',
                      status === 'in_progress' && 'bg-primary-100',
                      status === 'not_started' && 'bg-primary-50',
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 size={20} className="text-moss-500" />
                    ) : status === 'in_progress' ? (
                      <ProgressRing percent={pct} size={28} strokeWidth={3} />
                    ) : (
                      <Circle size={20} className="text-primary-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary-400 tabular-nums font-medium">
                        {i + 1}.
                      </span>
                      <p className="text-sm font-semibold text-primary-800 truncate group-hover:text-primary-600 transition-colors">
                        {mod.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5 text-xs text-primary-400">
                        <Clock size={10} />
                        {mod.estimated_minutes}m
                      </span>
                      {!sm.is_required && (
                        <span className="text-xs text-bark-400">Optional</span>
                      )}
                    </div>
                  </div>

                  <BookOpen size={16} className="text-primary-400 shrink-0 group-hover:text-primary-600 transition-colors" />
                </Link>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

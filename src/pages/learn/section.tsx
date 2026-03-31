import { useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  Play,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { ProgressRing } from '@/components/development/progress-ring'
import { cn } from '@/lib/cn'
import { useDevSection, useDevSectionModules } from '@/hooks/use-admin-development'
import { useMyModuleProgress, useUpsertSectionProgress } from '@/hooks/use-development-progress'
import { adminStagger as stagger, fadeUp } from '@/lib/admin-motion'

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
    for (const mp of moduleProgress) map.set(mp.module_id, { pct: mp.progress_pct, status: mp.status })
    return map
  }, [moduleProgress])

  const completedCount = sectionModules.filter((sm) => progressMap.get(sm.module_id)?.status === 'completed').length
  const totalCount = sectionModules.length
  const sectionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Persist section progress whenever module completions change
  const upsertSectionProgress = useUpsertSectionProgress()
  const lastSavedRef = useRef('')
  useEffect(() => {
    if (!sectionId || totalCount === 0) return
    const key = `${completedCount}/${totalCount}`
    if (key === lastSavedRef.current) return
    lastSavedRef.current = key
    const status = completedCount === 0 ? 'not_started' : completedCount >= totalCount ? 'completed' : 'in_progress'
    upsertSectionProgress.mutate({
      section_id: sectionId,
      status,
      modules_completed: completedCount,
      modules_total: totalCount,
      progress_pct: sectionPct,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- upsertSectionProgress is stable
  }, [sectionId, completedCount, totalCount, sectionPct])

  const isLoading = sectionLoading || modulesLoading

  if (isLoading) {
    return (
      <Page noBackground className="!px-0 bg-white" stickyOverlay={<Header title="" back transparent onBack={() => navigate('/learn')} />}>
        <div className="max-w-3xl mx-auto space-y-6 pb-20 pt-4">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </Page>
    )
  }

  if (!section) {
    return (
      <Page noBackground className="!px-0 bg-white" stickyOverlay={<Header title="" back transparent onBack={() => navigate('/learn')} />}>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 mb-4">
            <Layers size={24} strokeWidth={1.5} className="text-neutral-400" />
          </div>
          <p className="text-[15px] font-bold text-neutral-900">Section not found</p>
          <p className="text-[13px] text-neutral-500 mt-1">This section may have been removed or is no longer available.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/learn')} className="mt-3">
            Back to My Learning
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page noBackground className="!px-0 bg-white" stickyOverlay={<Header title="" back transparent onBack={() => navigate('/learn')} />}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-white">
        <div
          className="relative z-10 px-6 pt-14 pb-14"
          style={{ paddingTop: '3.5rem' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500 block mb-1.5">
                Learning Pathway
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                {section.title}
              </h1>
              <p className="text-[12px] text-neutral-500 mt-1 capitalize">
                {section.category.replace(/_/g, ' ')}
              </p>
            </div>
            <ProgressRing percent={sectionPct} size={52} strokeWidth={4} />
          </div>

          {section.description && (
            <p className="text-sm text-neutral-500 mt-4 max-w-lg leading-relaxed">{section.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary-400"
                initial={{ width: 0 }}
                animate={{ width: `${sectionPct}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
            <span className="text-[12px] font-bold text-neutral-500 tabular-nums shrink-0">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-7 sm:h-10 block">
            <path
              d="M0,28 C80,24 160,20 240,22 C320,24 360,12 400,14 L408,5 L414,3 L420,8 C460,16 540,26 640,24 C740,22 800,18 880,20 C960,22 1000,10 1040,12 L1048,4 L1054,2 L1060,7 C1100,16 1180,28 1280,26 C1360,24 1400,28 1440,26 L1440,70 L0,70 Z"
              className="fill-white"
            />
          </svg>
        </div>
      </div>

      {/* ── Module list ── */}
      <motion.div
        variants={rm ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="px-5 sm:px-6 pb-20 space-y-2.5"
      >
        {sectionModules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 mb-4">
              <BookOpen size={28} strokeWidth={1.5} className="text-neutral-400" />
            </div>
            <p className="text-sm font-bold text-neutral-900">No modules in this section yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
              Modules will appear here once they're published.
            </p>
          </div>
        )}
        {sectionModules.map((sm, i) => {
          const mod = sm.module
          if (!mod) return null

          const modProgress = progressMap.get(sm.module_id)
          const status = modProgress?.status ?? 'not_started'
          const pct = modProgress?.pct ?? 0

          const prevRequired = sectionModules.slice(0, i).filter((prev) => prev.is_required)
          const allPrevComplete = prevRequired.every(
            (prev) => progressMap.get(prev.module_id)?.status === 'completed',
          )
          const isLocked = sm.is_required && !allPrevComplete && i > 0

          return (
            <motion.div key={sm.id} variants={rm ? undefined : fadeUp}>
              {isLocked ? (
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 opacity-50">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 shrink-0">
                    <Lock size={16} className="text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-neutral-500 truncate">{mod.title}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Complete previous modules first</p>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-400 tabular-nums shrink-0">{i + 1}</span>
                </div>
              ) : (
                <Link to={`/learn/module/${sm.module_id}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={cn(
                      'flex items-center gap-3.5 p-4 rounded-2xl border shadow-sm transition-shadow hover:shadow-md',
                      status === 'completed'
                        ? 'bg-white border-neutral-100'
                        : 'bg-white border-neutral-100',
                    )}
                  >
                    {/* Step number / status */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-11 h-11 rounded-xl shrink-0',
                        status === 'completed' && 'bg-primary-50',
                        status === 'in_progress' && 'bg-primary-50',
                        status === 'not_started' && 'bg-neutral-50',
                      )}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-primary-600" />
                      ) : status === 'in_progress' ? (
                        <ProgressRing percent={pct} size={28} strokeWidth={3} />
                      ) : (
                        <span className="text-sm font-bold text-neutral-400 tabular-nums">{i + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] font-bold truncate',
                        status === 'completed' ? 'text-neutral-900' : 'text-neutral-900',
                      )}>
                        {mod.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[11px] text-neutral-500">
                          <Clock size={10} />
                          {mod.estimated_minutes}m
                        </span>
                        {!sm.is_required && (
                          <span className="text-[10px] font-bold text-bark-500 bg-bark-50 px-1.5 py-0.5 rounded-full">
                            Optional
                          </span>
                        )}
                      </div>
                    </div>

                    {status === 'in_progress' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 shrink-0">
                        <Play size={11} className="text-neutral-600" />
                        <span className="text-[11px] font-bold text-neutral-600">Continue</span>
                      </div>
                    ) : status === 'not_started' ? (
                      <BookOpen size={16} className="text-neutral-400 shrink-0" />
                    ) : null}
                  </motion.div>
                </Link>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </Page>
  )
}

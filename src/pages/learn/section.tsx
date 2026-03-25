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

import { Skeleton } from '@/components/skeleton'
import { ProgressRing } from '@/components/development/progress-ring'
import { cn } from '@/lib/cn'
import { useDevSection, useDevSectionModules } from '@/hooks/use-admin-development'
import { useMyModuleProgress, useUpsertSectionProgress } from '@/hooks/use-development-progress'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

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
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100/60 mb-4">
            <Layers size={24} strokeWidth={1.5} className="text-primary-400" />
          </div>
          <p className="text-[15px] font-bold text-primary-700">Section not found</p>
        </div>
      </Page>
    )
  }

  return (
    <Page noBackground className="!px-0 bg-white" stickyOverlay={<Header title="" back transparent onBack={() => navigate('/learn')} />}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-700 via-secondary-800 to-primary-900">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.05] pointer-events-none" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full border border-white/[0.08] pointer-events-none" />
        <div className="absolute right-12 bottom-6 w-16 h-16 rounded-full border border-white/[0.10] pointer-events-none" />

        <div
          className="relative z-10 px-6 pt-14 pb-14"
          style={{ paddingTop: '3.5rem' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50 block mb-1.5">
                Learning Pathway
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {section.title}
              </h1>
              <p className="text-[12px] text-white/50 mt-1 capitalize">
                {section.category.replace(/_/g, ' ')}
              </p>
            </div>
            <ProgressRing percent={sectionPct} size={52} strokeWidth={4} />
          </div>

          {section.description && (
            <p className="text-sm text-white/50 mt-4 max-w-lg leading-relaxed">{section.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-white/60 to-moss-300"
                initial={{ width: 0 }}
                animate={{ width: `${sectionPct}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
            <span className="text-[12px] font-bold text-white/70 tabular-nums shrink-0">
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
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-primary-50/40 border border-primary-100 opacity-50">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-100 shrink-0">
                    <Lock size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-primary-500 truncate">{mod.title}</p>
                    <p className="text-[11px] text-primary-400 mt-0.5">Complete previous modules first</p>
                  </div>
                  <span className="text-[11px] font-bold text-primary-300 tabular-nums shrink-0">{i + 1}</span>
                </div>
              ) : (
                <Link to={`/learn/module/${sm.module_id}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={cn(
                      'flex items-center gap-3.5 p-4 rounded-2xl border shadow-sm transition-shadow hover:shadow-md',
                      status === 'completed'
                        ? 'bg-moss-50/40 border-moss-200/60'
                        : 'bg-white border-primary-100/80',
                    )}
                  >
                    {/* Step number / status */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-11 h-11 rounded-xl shrink-0',
                        status === 'completed' && 'bg-gradient-to-br from-moss-100 to-moss-200/60',
                        status === 'in_progress' && 'bg-gradient-to-br from-primary-100 to-primary-200/60',
                        status === 'not_started' && 'bg-primary-50',
                      )}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-moss-600" />
                      ) : status === 'in_progress' ? (
                        <ProgressRing percent={pct} size={28} strokeWidth={3} />
                      ) : (
                        <span className="text-sm font-bold text-primary-300 tabular-nums">{i + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] font-bold truncate',
                        status === 'completed' ? 'text-moss-800' : 'text-primary-800',
                      )}>
                        {mod.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[11px] text-primary-400">
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
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-100/60 shrink-0">
                        <Play size={11} className="text-primary-600" />
                        <span className="text-[11px] font-bold text-primary-600">Continue</span>
                      </div>
                    ) : status === 'not_started' ? (
                      <BookOpen size={16} className="text-primary-300 shrink-0" />
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

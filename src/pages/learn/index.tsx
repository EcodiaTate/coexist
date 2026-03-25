import { useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BookOpen,
  Layers,
  Clock,
  ChevronRight,
  Compass,
  GraduationCap,
  Play,
  Star,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Skeleton } from '@/components/skeleton'
import { ProgressRing } from '@/components/development/progress-ring'
import { cn } from '@/lib/cn'
import { useMyTargetedContent } from '@/hooks/use-development-assignments'
import { useMyModuleProgress, useMySectionProgress } from '@/hooks/use-development-progress'
import type { DevModule, DevSection } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Content card                                                       */
/* ------------------------------------------------------------------ */

function ContentCard({
  item,
  isModule,
  progressPct,
  status,
  delay,
  rm,
}: {
  item: DevModule | DevSection
  isModule: boolean
  progressPct: number
  status: 'not_started' | 'in_progress' | 'completed'
  delay: number
  rm: boolean
}) {
  const linkTo = isModule ? `/learn/module/${item.id}` : `/learn/section/${item.id}`

  return (
    <motion.div
      initial={rm ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: rm ? 0 : delay }}
    >
      <Link to={linkTo}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'flex items-center gap-3.5 p-3.5 rounded-2xl border shadow-sm transition-shadow hover:shadow-md',
            status === 'completed'
              ? 'bg-moss-50/40 border-moss-200/60'
              : 'bg-white border-primary-100/80',
          )}
        >
          {/* Thumbnail or icon */}
          {item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className={cn(
              'flex items-center justify-center w-14 h-14 rounded-xl shrink-0',
              status === 'completed'
                ? 'bg-gradient-to-br from-moss-100 to-moss-200/60'
                : isModule
                  ? 'bg-gradient-to-br from-amber-100 to-amber-200/60'
                  : 'bg-gradient-to-br from-secondary-100 to-secondary-200/60',
            )}>
              {isModule ? (
                <BookOpen size={22} className={status === 'completed' ? 'text-moss-600' : 'text-amber-700'} />
              ) : (
                <Layers size={22} className={status === 'completed' ? 'text-moss-600' : 'text-secondary-600'} />
              )}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-[13px] font-bold truncate',
              status === 'completed' ? 'text-moss-800' : 'text-primary-800',
            )}>
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={cn(
                'text-[11px] font-medium capitalize',
                status === 'completed' ? 'text-moss-500' : 'text-primary-500',
              )}>
                {item.category.replace(/_/g, ' ')}
              </span>
              {'estimated_minutes' in item && (
                <span className="flex items-center gap-0.5 text-[11px] text-primary-400">
                  <Clock size={10} />
                  {(item as DevModule).estimated_minutes}m
                </span>
              )}
            </div>
          </div>

          {/* Progress + action */}
          <div className="flex items-center gap-2 shrink-0">
            {status === 'completed' ? (
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-moss-100">
                <Star size={16} className="text-moss-600" />
              </div>
            ) : (
              <ProgressRing percent={progressPct} size={36} />
            )}
            <ChevronRight size={16} className="text-primary-300" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionLabel({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary-400">{icon}</span>
      <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">
        {label}
      </h2>
      <span className="text-[11px] font-bold text-primary-400 tabular-nums bg-primary-100/60 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LearnIndexPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  const { data: content, isLoading: contentLoading } = useMyTargetedContent()
  const { data: moduleProgress = [] } = useMyModuleProgress()
  const { data: sectionProgress = [] } = useMySectionProgress()

  const progressMap = useMemo(() => {
    const map = new Map<string, { pct: number; status: 'not_started' | 'in_progress' | 'completed' }>()
    for (const mp of moduleProgress) map.set(mp.module_id, { pct: mp.progress_pct, status: mp.status })
    for (const sp of sectionProgress) map.set(sp.section_id, { pct: sp.progress_pct, status: sp.status })
    return map
  }, [moduleProgress, sectionProgress])

  const getProgress = useCallback((id: string) =>
    progressMap.get(id) ?? { pct: 0, status: 'not_started' as const }, [progressMap])

  type ContentItem = { item: DevModule | DevSection; isModule: boolean }

  const allContent: ContentItem[] = useMemo(() => {
    if (!content) return []
    return [
      ...content.modules.map((m) => ({ item: m, isModule: true })),
      ...content.sections.map((s) => ({ item: s, isModule: false })),
    ]
  }, [content])

  const grouped = useMemo(() => {
    const inProgress = allContent.filter((c) => getProgress(c.item.id).status === 'in_progress')
    const notStarted = allContent.filter((c) => getProgress(c.item.id).status === 'not_started')
    const completed = allContent.filter((c) => getProgress(c.item.id).status === 'completed')
    return { inProgress, notStarted, completed }
  }, [allContent, getProgress])

  const totalCount = allContent.length
  const completedCount = grouped.completed.length
  const overallPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <Page noBackground className="!px-0 bg-white">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-secondary-800">
        {/* Decorative shapes */}
        <div className="absolute -left-14 -top-14 w-72 h-72 rounded-full border border-white/[0.07] pointer-events-none" />
        <div className="absolute right-[-3rem] top-2 w-48 h-48 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute left-[60%] bottom-4 w-16 h-16 rounded-full border border-white/[0.10] pointer-events-none" />

        <div
          className="relative z-10 px-6 pt-14 pb-16 text-center"
          style={{ paddingTop: '3.5rem' }}
        >
          <motion.div
            initial={rm ? {} : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-5"
          >
            <GraduationCap size={32} className="text-white" />
          </motion.div>

          <motion.div
            initial={rm ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 block mb-2">
              Leadership Development
            </span>
            <span className="font-heading text-3xl sm:text-4xl font-bold text-white block">
              My Learning
            </span>
            <p className="text-sm text-white/60 mt-3 max-w-md mx-auto leading-relaxed">
              Your personalised modules and pathways
            </p>
          </motion.div>

          {/* Overall progress */}
          {totalCount > 0 && (
            <motion.div
              initial={rm ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.08]"
            >
              <ProgressRing percent={overallPct} size={44} strokeWidth={4} />
              <div className="text-left">
                <p className="text-sm font-bold text-white">
                  {completedCount} of {totalCount} complete
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">{overallPct}% overall progress</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-7 sm:h-10 block">
            <path
              d="M0,30 C120,28 200,22 320,26 C440,30 520,18 600,20 C680,22 720,14 760,16 L768,6 L774,4 L780,10 C820,18 920,28 1040,24 C1120,20 1200,26 1280,30 C1360,32 1400,28 1440,26 L1440,70 L0,70 Z"
              className="fill-white"
            />
          </svg>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-5 sm:px-6 pb-20">
        {contentLoading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : allContent.length === 0 ? (
          <motion.div
            initial={rm ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100/60 mb-4">
              <Compass size={32} strokeWidth={1.5} className="text-primary-400" />
            </div>
            <p className="text-[15px] font-bold text-primary-700">No modules available yet</p>
            <p className="text-[13px] text-primary-400 mt-1 text-center max-w-xs leading-relaxed">
              Development modules will appear here when they're published for your role
            </p>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8 pt-4">
            {/* In Progress */}
            {grouped.inProgress.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionLabel icon={<Play size={13} />} label="Continue Learning" count={grouped.inProgress.length} />
                <div className="space-y-2.5">
                  {grouped.inProgress.map((c, i) => {
                    const p = getProgress(c.item.id)
                    return (
                      <ContentCard key={c.item.id} item={c.item} isModule={c.isModule} progressPct={p.pct} status={p.status} delay={i * 0.04} rm={rm} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* Available */}
            {grouped.notStarted.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionLabel icon={<BookOpen size={13} />} label="Available" count={grouped.notStarted.length} />
                <div className="space-y-2.5">
                  {grouped.notStarted.map((c, i) => {
                    const p = getProgress(c.item.id)
                    return (
                      <ContentCard key={c.item.id} item={c.item} isModule={c.isModule} progressPct={p.pct} status={p.status} delay={i * 0.04} rm={rm} />
                    )
                  })}
                </div>
              </motion.section>
            )}

            {/* Completed */}
            {grouped.completed.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionLabel icon={<Star size={13} />} label="Completed" count={grouped.completed.length} />
                <div className="space-y-2.5">
                  {grouped.completed.map((c, i) => {
                    const p = getProgress(c.item.id)
                    return (
                      <ContentCard key={c.item.id} item={c.item} isModule={c.isModule} progressPct={p.pct} status={p.status} delay={i * 0.04} rm={rm} />
                    )
                  })}
                </div>
              </motion.section>
            )}
          </motion.div>
        )}
      </div>
    </Page>
  )
}

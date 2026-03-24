import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { ContentBlockRenderer } from '@/components/development/content-block-renderer'
import { cn } from '@/lib/cn'
import { useDevModule, useDevModuleContent } from '@/hooks/use-admin-development'
import { useModuleProgress, useUpsertModuleProgress } from '@/hooks/use-development-progress'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LearnModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { toast } = useToast()

  const { data: module, isLoading: moduleLoading } = useDevModule(moduleId)
  const { data: blocks = [], isLoading: blocksLoading } = useDevModuleContent(moduleId)
  const { data: progress } = useModuleProgress(moduleId)
  const upsertProgress = useUpsertModuleProgress()

  // Track which blocks have been viewed
  const [viewedBlocks, setViewedBlocks] = useState<Set<string>>(new Set())
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const timerRef = useRef<number>(0)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start time tracking
  useEffect(() => {
    timerRef.current = progress?.time_spent_sec ?? 0

    const interval = setInterval(() => {
      if (!document.hidden) {
        timerRef.current += 1
      }
    }, 1000)
    timerIntervalRef.current = interval

    return () => clearInterval(interval)
  }, [progress?.time_spent_sec])

  // IntersectionObserver for block viewing
  useEffect(() => {
    if (blocks.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const blockId = entry.target.getAttribute('data-block-id')
            if (blockId) {
              setViewedBlocks((prev) => {
                const next = new Set(prev)
                next.add(blockId)
                return next
              })
            }
          }
        })
      },
      { threshold: 0.5 },
    )

    blockRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [blocks])

  // Debounced progress save
  useEffect(() => {
    if (!moduleId || blocks.length === 0) return

    const saveInterval = setInterval(() => {
      const pct = Math.round((viewedBlocks.size / blocks.length) * 100)
      const lastViewed = blocks.filter((b) => viewedBlocks.has(b.id))
      const lastContentId = lastViewed.length > 0 ? lastViewed[lastViewed.length - 1].id : null

      upsertProgress.mutate({
        module_id: moduleId,
        status: pct >= 100 ? 'completed' : 'in_progress',
        last_content_id: lastContentId,
        progress_pct: pct,
        time_spent_sec: timerRef.current,
      })
    }, 5000)

    return () => clearInterval(saveInterval)
  }, [moduleId, blocks, viewedBlocks])

  // Resume scroll position
  useEffect(() => {
    if (progress?.last_content_id && blocks.length > 0) {
      const el = blockRefs.current.get(progress.last_content_id)
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          toast.info('Resuming where you left off')
        }, 300)
      }
    }
  }, [progress?.last_content_id, blocks.length])

  const handleComplete = useCallback(() => {
    if (!moduleId) return
    upsertProgress.mutate({
      module_id: moduleId,
      status: 'completed',
      progress_pct: 100,
      time_spent_sec: timerRef.current,
    })
    navigate(`/learn/complete?type=module&id=${moduleId}`)
  }, [moduleId, upsertProgress, navigate])

  const progressPct = blocks.length > 0 ? Math.round((viewedBlocks.size / blocks.length) * 100) : 0
  const isLoading = moduleLoading || blocksLoading

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-primary-500">Module not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/learn')} className="mt-3">
          Back to My Learning
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-primary-100 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/learn')}
            className="text-primary-500 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-800 truncate">{module.title}</p>
            <p className="text-xs text-primary-400">
              Block {viewedBlocks.size} of {blocks.length}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 rounded-full bg-primary-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content blocks */}
      <div className="space-y-8">
        {blocks.map((block, i) => (
          <motion.div
            key={block.id}
            ref={(el) => {
              if (el) blockRefs.current.set(block.id, el)
            }}
            data-block-id={block.id}
            initial={rm ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: rm ? 0 : i * 0.05 }}
          >
            <ContentBlockRenderer block={block} />
          </motion.div>
        ))}
      </div>

      {/* Complete button */}
      {blocks.length > 0 && (
        <motion.div
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="sticky bottom-4 mt-8"
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<CheckCircle2 size={18} />}
            onClick={handleComplete}
            className={cn(
              'shadow-lg',
              progressPct < 100 && 'opacity-80',
            )}
          >
            {progressPct >= 100 ? 'Complete Module' : `Continue (${progressPct}%)`}
          </Button>
        </motion.div>
      )}
    </div>
  )
}

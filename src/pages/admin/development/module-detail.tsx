import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  ArrowLeft,
  Pencil,
  Clock,
  Users,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { ContentBlockRenderer } from '@/components/development/content-block-renderer'
import { cn } from '@/lib/cn'
import { useDevModule, useDevModuleContent, useDevAnalytics } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminModuleDetailPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)

  useAdminHeader('Module Detail')

  const { data: module, isLoading: moduleLoading } = useDevModule(moduleId)
  const { data: blocks = [], isLoading: blocksLoading } = useDevModuleContent(moduleId)
  const { data: analytics } = useDevAnalytics()

  // Module-specific analytics
  const moduleProgress = analytics?.progress.filter((p) => p.module_id === moduleId) ?? []
  const completedCount = moduleProgress.filter((p) => p.status === 'completed').length
  const assignedCount = moduleProgress.length

  const isLoading = moduleLoading || blocksLoading

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-primary-500">Module not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/development')} className="mt-3">
          Back to Development
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Back + edit */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/development')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <Link to={`/admin/development/modules/${moduleId}/edit`}>
          <Button variant="secondary" size="sm" icon={<Pencil size={12} />}>
            Edit
          </Button>
        </Link>
      </motion.div>

      {/* Module info card */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-gradient-to-br from-white to-primary-50/40 border border-white/60 shadow-sm p-5"
      >
        <div className="flex items-start gap-4">
          {module.thumbnail_url ? (
            <img src={module.thumbnail_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200/60 shrink-0">
              <BookOpen size={28} className="text-primary-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-lg font-bold text-primary-800">{module.title}</h1>
            {module.description && (
              <p className="text-sm text-primary-600 mt-1 line-clamp-2">{module.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold',
                module.status === 'published' ? 'bg-moss-100 text-moss-700' : 'bg-bark-100 text-bark-700',
              )}>
                {module.status}
              </span>
              <span className="text-xs text-primary-500 capitalize">
                {module.category.replace(/_/g, ' ')}
              </span>
              <span className="flex items-center gap-0.5 text-xs text-primary-400">
                <Clock size={10} />
                {module.estimated_minutes}m
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-primary-100">
          <div className="text-center">
            <p className="text-lg font-bold text-primary-700 tabular-nums">{blocks.length}</p>
            <p className="text-xs text-primary-400">Blocks</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary-700 tabular-nums">{assignedCount}</p>
            <p className="text-xs text-primary-400">Learners</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-moss-600 tabular-nums">{completedCount}</p>
            <p className="text-xs text-primary-400">Completed</p>
          </div>
        </div>
      </motion.div>

      {/* Content preview */}
      <motion.div variants={fadeUp}>
        <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
          Content Preview
        </h2>
        <div className="space-y-6">
          {blocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-primary-100 bg-white/60 p-4">
              <ContentBlockRenderer block={block} />
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="text-sm text-primary-400 text-center py-8">No content blocks</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

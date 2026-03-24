import { useState, useMemo } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Layers,
  Clock,
  Search,
  BarChart3,
  Send,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { AssignmentSheet } from '@/components/development/assignment-sheet'
import { cn } from '@/lib/cn'
import { useDevModules, useDevSections, type DevModule, type DevSection } from '@/hooks/use-admin-development'
import { useCollectiveAssignments } from '@/hooks/use-development-assignments'
import { useAuth } from '@/hooks/use-auth'
import { useLeaderHeader } from '@/components/leader-layout'
import { adminVariants } from '@/lib/admin-motion'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderDevelopmentPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const { profile } = useAuth()

  useLeaderHeader('Development')

  // TODO: Get leader's collective from context/hook
  const collectiveId = '' // Will be wired up to actual collective

  const { data: modules = [], isLoading: modulesLoading } = useDevModules()
  const { data: sections = [], isLoading: sectionsLoading } = useDevSections()
  const { data: assignments = [] } = useCollectiveAssignments(collectiveId || undefined)

  const [tab, setTab] = useState<'library' | 'assigned'>('library')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [assignTarget, setAssignTarget] = useState<{
    moduleId?: string
    sectionId?: string
    title: string
  } | null>(null)

  const publishedModules = useMemo(() => {
    const q = search.toLowerCase()
    return modules
      .filter((m) => m.status === 'published')
      .filter((m) => !q || m.title.toLowerCase().includes(q))
      .filter((m) => !categoryFilter || m.category === categoryFilter)
  }, [modules, search, categoryFilter])

  const publishedSections = useMemo(() => {
    const q = search.toLowerCase()
    return sections
      .filter((s) => s.status === 'published')
      .filter((s) => !q || s.title.toLowerCase().includes(q))
      .filter((s) => !categoryFilter || s.category === categoryFilter)
  }, [sections, search, categoryFilter])

  const isLoading = modulesLoading || sectionsLoading

  const CATEGORIES = [
    { value: '', label: 'All' },
    { value: 'learning', label: 'Learning' },
    { value: 'leadership_development', label: 'Leadership Dev' },
    { value: 'onboarding', label: 'Onboarding' },
  ]

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-bold text-primary-800">Development</h1>
          <p className="text-sm text-primary-500">Browse and assign learning content</p>
        </div>
        <Link to="/leader/development/progress">
          <Button variant="ghost" size="sm" icon={<BarChart3 size={14} />}>
            Progress
          </Button>
        </Link>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-1 bg-primary-100/50 p-1 rounded-xl">
        {(['library', 'assigned'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all text-center',
              tab === t
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-primary-500 hover:text-primary-700',
            )}
          >
            {t === 'library' ? 'Library' : 'Assigned'}
          </button>
        ))}
      </motion.div>

      {tab === 'library' && (
        <>
          {/* Search + filters */}
          <motion.div variants={fadeUp} className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content..."
                className="w-full pl-9 pr-3 h-10 rounded-xl border border-primary-200 bg-white text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategoryFilter(c.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                    categoryFilter === c.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-primary-50 text-primary-500 hover:bg-primary-100',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content grid */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Modules */}
              {publishedModules.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
                    <BookOpen size={12} />
                    Modules
                  </h2>
                  <div className="space-y-2">
                    {publishedModules.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm"
                      >
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200/60 shrink-0">
                          <BookOpen size={18} className="text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary-800 truncate">{m.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-primary-500 capitalize">{m.category.replace(/_/g, ' ')}</span>
                            <span className="flex items-center gap-0.5 text-xs text-primary-400">
                              <Clock size={10} />
                              {m.estimated_minutes}m
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Send size={12} />}
                          onClick={() => setAssignTarget({ moduleId: m.id, title: m.title })}
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections */}
              {publishedSections.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
                    <Layers size={12} />
                    Sections
                  </h2>
                  <div className="space-y-2">
                    {publishedSections.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm"
                      >
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-secondary-100 to-secondary-200/60 shrink-0">
                          <Layers size={18} className="text-secondary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary-800 truncate">{s.title}</p>
                          <span className="text-xs text-primary-500 capitalize">{s.category.replace(/_/g, ' ')}</span>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Send size={12} />}
                          onClick={() => setAssignTarget({ sectionId: s.id, title: s.title })}
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {publishedModules.length === 0 && publishedSections.length === 0 && (
                <div className="flex flex-col items-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
                  <BookOpen size={32} className="text-primary-300 mb-2" />
                  <p className="text-sm font-medium text-primary-500">No published content yet</p>
                  <p className="text-xs text-primary-400 mt-1">National staff will add development modules here</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'assigned' && (
        <div className="space-y-2">
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
              <Send size={28} className="text-primary-300 mb-2" />
              <p className="text-sm font-medium text-primary-500">No assignments yet</p>
              <p className="text-xs text-primary-400 mt-1">Assign content from the Library tab</p>
            </div>
          ) : (
            assignments.map((a) => {
              const item = a.module ?? a.section
              if (!item) return null
              return (
                <div key={a.id} className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 shrink-0">
                    {a.module_id ? <BookOpen size={16} className="text-primary-600" /> : <Layers size={16} className="text-secondary-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">{item.title}</p>
                    <p className="text-xs text-primary-400">
                      Assigned {new Date(a.created_at).toLocaleDateString()}
                      {a.due_date && ` · Due ${new Date(a.due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Assignment sheet */}
      <AnimatePresence>
        {assignTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setAssignTarget(null)}
            />
            <AssignmentSheet
              moduleId={assignTarget.moduleId}
              sectionId={assignTarget.sectionId}
              title={assignTarget.title}
              collectiveId={collectiveId}
              members={[]} // Will be wired to actual collective members
              onClose={() => setAssignTarget(null)}
            />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

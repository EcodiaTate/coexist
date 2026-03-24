import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { adminVariants, tabFade } from '@/lib/admin-motion'
import {
  Plus,
  BookOpen,
  Layers,
  CircleDot,
  Search,
  BarChart3,
  Clock,
  Trash2,
  Pencil,
  ArrowRight,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import {
  useDevModules,
  useDevSections,
  useDevQuizzes,
  useDeleteModule,
  useDeleteSection,
  useDeleteQuiz,
  useDevStats,
  type DevModule,
  type DevSection,
  type DevQuiz,
} from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

type Tab = 'modules' | 'sections' | 'quizzes'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'modules', label: 'Modules', icon: <BookOpen size={14} /> },
  { key: 'sections', label: 'Sections', icon: <Layers size={14} /> },
  { key: 'quizzes', label: 'Quizzes', icon: <CircleDot size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold',
        status === 'published' && 'bg-moss-100 text-moss-700',
        status === 'draft' && 'bg-bark-100 text-bark-700',
        status === 'archived' && 'bg-primary-100 text-primary-500',
      )}
    >
      {status}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const label = category.replace(/_/g, ' ')
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-600 capitalize">
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Module row                                                         */
/* ------------------------------------------------------------------ */

function ModuleRow({ module, onDelete }: { module: DevModule; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200/60 shrink-0">
        <BookOpen size={18} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/admin/development/modules/${module.id}`}
            className="text-sm font-semibold text-primary-800 hover:text-primary-600 transition-colors truncate"
          >
            {module.title}
          </Link>
          <StatusBadge status={module.status} />
          <CategoryBadge category={module.category} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-primary-400">
          <span className="flex items-center gap-0.5">
            <Clock size={10} />
            {module.estimated_minutes}m
          </span>
          <span>{new Date(module.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          to={`/admin/development/modules/${module.id}/edit`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100/60 transition-colors"
        >
          <Pencil size={14} />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100/60 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section row                                                        */
/* ------------------------------------------------------------------ */

function SectionRow({ section, onDelete }: { section: DevSection; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-100 to-secondary-200/60 shrink-0">
        <Layers size={18} className="text-secondary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-primary-800 truncate">{section.title}</p>
          <StatusBadge status={section.status} />
          <CategoryBadge category={section.category} />
        </div>
        <p className="text-xs text-primary-400 mt-0.5">
          {new Date(section.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          to={`/admin/development/sections/${section.id}/edit`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100/60 transition-colors"
        >
          <Pencil size={14} />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100/60 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quiz row                                                           */
/* ------------------------------------------------------------------ */

function QuizRow({ quiz, onDelete }: { quiz: DevQuiz; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-moss-100 to-moss-200/60 shrink-0">
        <CircleDot size={18} className="text-moss-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-primary-800 truncate">{quiz.title}</p>
          <span className="text-[11px] text-primary-400">Pass: {quiz.pass_score}%</span>
        </div>
        <p className="text-xs text-primary-400 mt-0.5">
          {new Date(quiz.created_at).toLocaleDateString()}
          {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes}m limit` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          to={`/admin/development/quizzes/${quiz.id}/edit`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100/60 transition-colors"
        >
          <Pencil size={14} />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100/60 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminDevelopmentPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)

  useAdminHeader('Development')

  const { data: modules, isLoading: modulesLoading } = useDevModules()
  const { data: sections, isLoading: sectionsLoading } = useDevSections()
  const { data: quizzes, isLoading: quizzesLoading } = useDevQuizzes()
  const { data: stats } = useDevStats()
  const deleteModule = useDeleteModule()
  const deleteSection = useDeleteSection()
  const deleteQuiz = useDeleteQuiz()

  const [tab, setTab] = useState<Tab>('modules')
  const [search, setSearch] = useState('')

  const isLoading = modulesLoading || sectionsLoading || quizzesLoading

  const filteredModules = useMemo(() => {
    const q = search.toLowerCase()
    return (modules ?? []).filter((m) => !q || m.title.toLowerCase().includes(q))
  }, [modules, search])

  const filteredSections = useMemo(() => {
    const q = search.toLowerCase()
    return (sections ?? []).filter((s) => !q || s.title.toLowerCase().includes(q))
  }, [sections, search])

  const filteredQuizzes = useMemo(() => {
    const q = search.toLowerCase()
    return (quizzes ?? []).filter((qz) => !q || qz.title.toLowerCase().includes(q))
  }, [quizzes, search])

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Modules', value: stats?.totalModules ?? 0, accent: 'text-primary-600' },
          { label: 'Published', value: stats?.publishedModules ?? 0, accent: 'text-moss-600' },
          { label: 'Sections', value: stats?.totalSections ?? 0, accent: 'text-secondary-600' },
          { label: 'Quizzes', value: stats?.totalQuizzes ?? 0, accent: 'text-sky-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/80 border border-white/60 shadow-sm p-4 text-center">
            <p className={cn('text-2xl font-bold tabular-nums', s.accent)}>{s.value}</p>
            <p className="text-xs text-primary-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Actions bar */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 h-10 rounded-xl border border-primary-200 bg-white text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/development/modules/new">
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              New Module
            </Button>
          </Link>
          <Link to="/admin/development/sections/new">
            <Button variant="secondary" size="sm" icon={<Layers size={14} />}>
              New Section
            </Button>
          </Link>
          <Link to="/admin/development/quizzes/new">
            <Button variant="ghost" size="sm" icon={<CircleDot size={14} />}>
              New Quiz
            </Button>
          </Link>
          <Link to="/admin/development/results">
            <Button variant="ghost" size="sm" icon={<BarChart3 size={14} />}>
              Results
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-1 bg-primary-100/50 p-1 rounded-xl">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t.key
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-primary-500 hover:text-primary-700',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 'modules' && (
            <motion.div key="modules" {...tabFade} className="space-y-2">
              {filteredModules.length === 0 ? (
                <div className="flex flex-col items-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
                  <BookOpen size={32} className="text-primary-300 mb-2" />
                  <p className="text-sm font-medium text-primary-500">No modules yet</p>
                  <Link to="/admin/development/modules/new" className="mt-3">
                    <Button variant="primary" size="sm" icon={<Plus size={14} />}>Create First Module</Button>
                  </Link>
                </div>
              ) : (
                filteredModules.map((m) => (
                  <ModuleRow key={m.id} module={m} onDelete={() => deleteModule.mutate(m.id)} />
                ))
              )}
            </motion.div>
          )}

          {tab === 'sections' && (
            <motion.div key="sections" {...tabFade} className="space-y-2">
              {filteredSections.length === 0 ? (
                <div className="flex flex-col items-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
                  <Layers size={32} className="text-primary-300 mb-2" />
                  <p className="text-sm font-medium text-primary-500">No sections yet</p>
                  <Link to="/admin/development/sections/new" className="mt-3">
                    <Button variant="primary" size="sm" icon={<Plus size={14} />}>Create First Section</Button>
                  </Link>
                </div>
              ) : (
                filteredSections.map((s) => (
                  <SectionRow key={s.id} section={s} onDelete={() => deleteSection.mutate(s.id)} />
                ))
              )}
            </motion.div>
          )}

          {tab === 'quizzes' && (
            <motion.div key="quizzes" {...tabFade} className="space-y-2">
              {filteredQuizzes.length === 0 ? (
                <div className="flex flex-col items-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
                  <CircleDot size={32} className="text-primary-300 mb-2" />
                  <p className="text-sm font-medium text-primary-500">No quizzes yet</p>
                  <Link to="/admin/development/quizzes/new" className="mt-3">
                    <Button variant="primary" size="sm" icon={<Plus size={14} />}>Create First Quiz</Button>
                  </Link>
                </div>
              ) : (
                filteredQuizzes.map((q) => (
                  <QuizRow key={q.id} quiz={q} onDelete={() => deleteQuiz.mutate(q.id)} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

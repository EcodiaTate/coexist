import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { adminVariants, tabFade } from '@/lib/admin-motion'
import {
  ArrowLeft,
  Users,
  BookOpen,
  CircleDot,
  BarChart3,
  Download,
  Layers,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import { useDevAnalytics, useDevModules, useDevQuizzes } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  CSV export helper                                                  */
/* ------------------------------------------------------------------ */

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type Tab = 'overview' | 'modules' | 'quizzes' | 'learners'

export default function AdminDevelopmentResultsPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const navigate = useNavigate()

  useAdminHeader('Development Results')

  const { data: analytics, isLoading } = useDevAnalytics()
  const { data: modules = [] } = useDevModules()
  const { data: quizzes = [] } = useDevQuizzes()

  const [tab, setTab] = useState<Tab>('overview')

  // Per-module stats
  const moduleStats = useMemo(() => {
    if (!analytics) return []
    return modules.map((m) => {
      const progress = analytics.progress.filter((p) => p.module_id === m.id)
      const completed = progress.filter((p) => p.status === 'completed').length
      const avgTime = progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.time_spent_sec, 0) / progress.length / 60)
        : 0
      return {
        ...m,
        assigned: progress.length,
        completed,
        completionRate: progress.length > 0 ? Math.round((completed / progress.length) * 100) : 0,
        avgTimeMin: avgTime,
      }
    }).filter((m) => m.assigned > 0)
  }, [analytics, modules])

  // Per-quiz stats
  const quizStats = useMemo(() => {
    if (!analytics) return []
    return quizzes.map((q) => {
      const attempts = analytics.attempts.filter((a) => a.quiz_id === q.id)
      const passed = attempts.filter((a) => a.passed).length
      const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.score_pct, 0) / attempts.length)
        : 0
      return {
        ...q,
        totalAttempts: attempts.length,
        passRate: attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0,
        avgScore,
        highScore: attempts.length > 0 ? Math.max(...attempts.map((a) => a.score_pct)) : 0,
        lowScore: attempts.length > 0 ? Math.min(...attempts.map((a) => a.score_pct)) : 0,
      }
    }).filter((q) => q.totalAttempts > 0)
  }, [analytics, quizzes])

  // Per-learner stats
  const learnerStats = useMemo(() => {
    if (!analytics) return []
    const userMap = new Map<string, { completed: number; total: number; avgScore: number; scores: number[]; lastActive: string }>()

    for (const p of analytics.progress) {
      const existing = userMap.get(p.user_id) ?? { completed: 0, total: 0, avgScore: 0, scores: [], lastActive: '' }
      existing.total++
      if (p.status === 'completed') existing.completed++
      if (p.updated_at > existing.lastActive) existing.lastActive = p.updated_at
      userMap.set(p.user_id, existing)
    }

    for (const a of analytics.attempts) {
      const existing = userMap.get(a.user_id)
      if (existing) existing.scores.push(a.score_pct)
    }

    return Array.from(userMap.entries()).map(([userId, stats]) => ({
      userId,
      modulesCompleted: stats.completed,
      modulesTotal: stats.total,
      avgQuizScore: stats.scores.length > 0 ? Math.round(stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length) : null,
      lastActive: stats.lastActive,
    }))
  }, [analytics])

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { key: 'modules', label: 'Modules', icon: <BookOpen size={14} /> },
    { key: 'quizzes', label: 'Quizzes', icon: <CircleDot size={14} /> },
    { key: 'learners', label: 'Learners', icon: <Users size={14} /> },
  ]

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Back */}
      <motion.div variants={fadeUp}>
        <button
          type="button"
          onClick={() => navigate('/admin/development')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Development
        </button>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Learners', value: analytics?.totalLearners ?? 0, accent: 'text-primary-600' },
          { label: 'Avg Completion', value: `${analytics?.avgCompletion ?? 0}%`, accent: 'text-moss-600' },
          { label: 'Modules Done', value: analytics?.completedModules ?? 0, accent: 'text-secondary-600' },
          { label: 'Avg Quiz Score', value: `${analytics?.avgQuizScore ?? 0}%`, accent: 'text-sky-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/80 border border-white/60 shadow-sm p-4 text-center">
            <p className={cn('text-2xl font-bold tabular-nums', s.accent)}>{s.value}</p>
            <p className="text-xs text-primary-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
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
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" {...tabFade} className="text-center py-8">
              <BarChart3 size={40} className="text-primary-300 mx-auto mb-3" />
              <p className="text-sm text-primary-600 font-medium">
                {analytics?.totalLearners ?? 0} learners have engaged with development content.
              </p>
              <p className="text-xs text-primary-400 mt-1">
                Use the tabs above to drill into modules, quizzes, or individual learner data.
              </p>
            </motion.div>
          )}

          {tab === 'modules' && (
            <motion.div key="modules" {...tabFade} className="space-y-2">
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Download size={12} />}
                  onClick={() =>
                    downloadCsv(
                      'module-results.csv',
                      ['Module', 'Category', 'Assigned', 'Completed', 'Rate', 'Avg Time (min)'],
                      moduleStats.map((m) => [
                        m.title, m.category, String(m.assigned), String(m.completed),
                        `${m.completionRate}%`, String(m.avgTimeMin),
                      ]),
                    )
                  }
                >
                  Export CSV
                </Button>
              </div>
              {moduleStats.length === 0 ? (
                <p className="text-sm text-primary-400 text-center py-8">No module progress data yet</p>
              ) : (
                moduleStats.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800 truncate">{m.title}</p>
                      <p className="text-xs text-primary-400 capitalize">{m.category.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-4 text-center shrink-0">
                      <div>
                        <p className="text-sm font-bold text-primary-700 tabular-nums">{m.assigned}</p>
                        <p className="text-[10px] text-primary-400">Assigned</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-moss-600 tabular-nums">{m.completed}</p>
                        <p className="text-[10px] text-primary-400">Done</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary-600 tabular-nums">{m.completionRate}%</p>
                        <p className="text-[10px] text-primary-400">Rate</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-sky-600 tabular-nums">{m.avgTimeMin}m</p>
                        <p className="text-[10px] text-primary-400">Avg Time</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === 'quizzes' && (
            <motion.div key="quizzes" {...tabFade} className="space-y-2">
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Download size={12} />}
                  onClick={() =>
                    downloadCsv(
                      'quiz-results.csv',
                      ['Quiz', 'Attempts', 'Pass Rate', 'Avg Score', 'High', 'Low'],
                      quizStats.map((q) => [
                        q.title, String(q.totalAttempts), `${q.passRate}%`,
                        `${q.avgScore}%`, `${q.highScore}%`, `${q.lowScore}%`,
                      ]),
                    )
                  }
                >
                  Export CSV
                </Button>
              </div>
              {quizStats.length === 0 ? (
                <p className="text-sm text-primary-400 text-center py-8">No quiz attempt data yet</p>
              ) : (
                quizStats.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800 truncate">{q.title}</p>
                      <p className="text-xs text-primary-400">Pass threshold: {q.pass_score}%</p>
                    </div>
                    <div className="flex items-center gap-4 text-center shrink-0">
                      <div>
                        <p className="text-sm font-bold text-primary-700 tabular-nums">{q.totalAttempts}</p>
                        <p className="text-[10px] text-primary-400">Attempts</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-moss-600 tabular-nums">{q.passRate}%</p>
                        <p className="text-[10px] text-primary-400">Pass Rate</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-sky-600 tabular-nums">{q.avgScore}%</p>
                        <p className="text-[10px] text-primary-400">Avg</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === 'learners' && (
            <motion.div key="learners" {...tabFade} className="space-y-2">
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Download size={12} />}
                  onClick={() =>
                    downloadCsv(
                      'learner-results.csv',
                      ['User ID', 'Modules Completed', 'Total', 'Avg Quiz Score', 'Last Active'],
                      learnerStats.map((l) => [
                        l.userId, String(l.modulesCompleted), String(l.modulesTotal),
                        l.avgQuizScore !== null ? `${l.avgQuizScore}%` : 'N/A',
                        l.lastActive ? new Date(l.lastActive).toLocaleDateString() : 'N/A',
                      ]),
                    )
                  }
                >
                  Export CSV
                </Button>
              </div>
              {learnerStats.length === 0 ? (
                <p className="text-sm text-primary-400 text-center py-8">No learner data yet</p>
              ) : (
                learnerStats
                  .sort((a, b) => b.modulesCompleted - a.modulesCompleted)
                  .map((l) => (
                    <div key={l.userId} className="flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-600 shrink-0">
                        {l.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-800 truncate font-mono">{l.userId.slice(0, 8)}...</p>
                        <p className="text-xs text-primary-400">
                          Last active: {l.lastActive ? new Date(l.lastActive).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-center shrink-0">
                        <div>
                          <p className="text-sm font-bold text-primary-700 tabular-nums">{l.modulesCompleted}/{l.modulesTotal}</p>
                          <p className="text-[10px] text-primary-400">Modules</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-sky-600 tabular-nums">{l.avgQuizScore ?? '—'}%</p>
                          <p className="text-[10px] text-primary-400">Quiz Avg</p>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

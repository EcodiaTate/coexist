import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Users, BookOpen, CircleDot, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/skeleton'
import { ProgressRing } from '@/components/development/progress-ring'
import { adminVariants } from '@/lib/admin-motion'
import { cn } from '@/lib/cn'
import { useLeaderHeader } from '@/components/leader-layout'
import { useCollectiveProgress, type MemberProgress } from '@/hooks/use-development-assignments'

/* ------------------------------------------------------------------ */
/*  Member row                                                         */
/* ------------------------------------------------------------------ */

function MemberRow({ member }: { member: MemberProgress }) {
  const completionPct =
    member.modules_total > 0
      ? Math.round((member.modules_completed / member.modules_total) * 100)
      : 0

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-white/60 shadow-sm">
      {/* Avatar */}
      {member.avatar_url ? (
        <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-600 shrink-0">
          {member.display_name.charAt(0)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-800 truncate">{member.display_name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-0.5 text-xs text-primary-400">
            <BookOpen size={10} />
            {member.modules_completed}/{member.modules_total}
          </span>
          {member.avg_quiz_score !== null && (
            <span className="flex items-center gap-0.5 text-xs text-primary-400">
              <CircleDot size={10} />
              {member.avg_quiz_score}%
            </span>
          )}
          {member.last_activity && (
            <span className="flex items-center gap-0.5 text-xs text-primary-400">
              <Clock size={10} />
              {new Date(member.last_activity).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <ProgressRing percent={completionPct} size={36} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderDevelopmentProgressPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const navigate = useNavigate()

  useLeaderHeader('Member Progress')

  // TODO: Wire to actual collective ID from context
  const collectiveId = ''
  const { data: members, isLoading } = useCollectiveProgress(collectiveId || undefined)

  // Summary stats
  const totalMembers = members?.length ?? 0
  const avgCompletion =
    members && members.length > 0
      ? Math.round(
          members.reduce((sum, m) => {
            const pct = m.modules_total > 0 ? (m.modules_completed / m.modules_total) * 100 : 0
            return sum + pct
          }, 0) / members.length,
        )
      : 0
  const totalCompleted = members?.reduce((sum, m) => sum + m.modules_completed, 0) ?? 0
  const avgQuizScore =
    members && members.filter((m) => m.avg_quiz_score !== null).length > 0
      ? Math.round(
          members
            .filter((m) => m.avg_quiz_score !== null)
            .reduce((sum, m) => sum + (m.avg_quiz_score ?? 0), 0) /
            members.filter((m) => m.avg_quiz_score !== null).length,
        )
      : 0

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/leader/development')}
          className="text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-heading text-lg font-bold text-primary-800">Member Progress</h1>
          <p className="text-sm text-primary-500">Track your collective's learning progress</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Members', value: totalMembers, icon: <Users size={14} />, accent: 'text-primary-600' },
          { label: 'Avg Completion', value: `${avgCompletion}%`, icon: <BookOpen size={14} />, accent: 'text-moss-600' },
          { label: 'Modules Done', value: totalCompleted, icon: <BookOpen size={14} />, accent: 'text-secondary-600' },
          { label: 'Avg Quiz Score', value: `${avgQuizScore}%`, icon: <CircleDot size={14} />, accent: 'text-sky-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/80 border border-white/60 shadow-sm p-3 text-center">
            <p className={cn('text-xl font-bold tabular-nums', s.accent)}>{s.value}</p>
            <p className="text-xs text-primary-500 font-medium mt-0.5 flex items-center justify-center gap-1">
              {s.icon}
              {s.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Member list */}
      <motion.div variants={fadeUp}>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : !members || members.length === 0 ? (
          <div className="flex flex-col items-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
            <Users size={32} className="text-primary-300 mb-2" />
            <p className="text-sm font-medium text-primary-500">No member progress yet</p>
            <p className="text-xs text-primary-400 mt-1">Assign content to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members
              .sort((a, b) => b.modules_completed - a.modules_completed)
              .map((m) => (
                <MemberRow key={m.user_id} member={m} />
              ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

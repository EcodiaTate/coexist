import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Users,
    Search,
    ChevronRight,
    Crown,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useLeaderHeader, useLeaderContext } from '@/components/leader-layout'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

function useCollectiveMembers(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-members', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return []

      const { data } = await supabase
        .from('collective_members' as any)
        .select('id, user_id, role, joined_at, profiles(display_name, avatar_url)')
        .eq('collective_id', collectiveId)
        .order('joined_at', { ascending: false })

      return (data ?? []) as any[]
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Role config                                                        */
/* ------------------------------------------------------------------ */

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  leader: { label: 'Leader', icon: <Crown size={12} />, className: 'bg-warning-100 text-warning-700' },
  co_leader: { label: 'Co-Leader', icon: <ShieldCheck size={12} />, className: 'bg-moss-100 text-moss-700' },
  assist_leader: { label: 'Assistant', icon: <ShieldAlert size={12} />, className: 'bg-sky-100 text-sky-700' },
  member: { label: 'Member', icon: <Users size={12} />, className: 'bg-primary-50 text-primary-400' },
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Decorative shapes                                                  */
/* ------------------------------------------------------------------ */

function Shapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Large ring — CSS breathe */}
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full border-[3px] border-primary-200/40 will-change-transform animate-[breatheWide_7s_ease-in-out_infinite]" />
      {/* Filled glow - bottom-left */}
      <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-bark-100/30 blur-2xl will-change-transform animate-[breatheWide_9s_ease-in-out_infinite]" />
      {/* Small ring - mid-left */}
      <div className="absolute top-1/3 -left-8 h-24 w-24 rounded-full border-2 border-primary-100/25 will-change-transform animate-[breatheWide_6s_ease-in-out_infinite]" />
      {/* Floating dots — CSS-only */}
      <div className="absolute top-28 right-12 h-2.5 w-2.5 rounded-full bg-primary-200/50 will-change-transform animate-[float_4s_ease-in-out_infinite]" />
      <div className="absolute top-1/2 right-1/4 h-2 w-2 rounded-full bg-bark-200/40 will-change-transform animate-[floatDown_5s_ease-in-out_1s_infinite]" />
      <div className="absolute bottom-40 left-16 h-1.5 w-1.5 rounded-full bg-primary-300/30 will-change-transform animate-[float_4.5s_ease-in-out_2s_infinite]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderMembersPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { collectiveId, collectiveSlug } = useLeaderContext()
  const [search, setSearch] = useState('')

  useLeaderHeader('Members', { fullBleed: true })

  const { data: members, isLoading } = useCollectiveMembers(collectiveId)
  const showLoading = useDelayedLoading(isLoading)

  const filtered = (members ?? []).filter((m: any) => {
    if (!search) return true
    const name = m.profiles?.display_name ?? ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  // Group by role
  const leaders = filtered.filter((m: any) => ['leader', 'co_leader', 'assist_leader'].includes(m.role))
  const regularMembers = filtered.filter((m: any) => m.role === 'member')

  if (showLoading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-primary-50/80 via-white to-bark-50/20">
        <Shapes />
        <div className="relative z-10 px-4 pt-14 pb-10 space-y-4">
          <Skeleton className="h-8 w-40 mx-auto rounded-xl" />
          <Skeleton className="h-5 w-24 mx-auto rounded-lg" />
          <div className="grid grid-cols-3 gap-3 pt-4">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton variant="list-item" count={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-primary-50/80 via-white to-bark-50/20">
      <Shapes />

      <div className="relative z-10 px-4 pt-14 pb-10">
        <motion.div
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Hero title */}
          <motion.div variants={rm ? undefined : fadeUp} className="text-center pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-400 mb-1">
              Community
            </p>
            <h1 className="font-heading text-2xl font-extrabold text-primary-900">
              Members
            </h1>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={rm ? undefined : fadeUp} className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-3.5 shadow-sm border border-white/60 text-center">
              <p className="font-heading text-2xl font-extrabold text-primary-800 tabular-nums">
                {members?.length ?? 0}
              </p>
              <p className="text-[11px] font-semibold text-primary-400 mt-0.5">Total</p>
            </div>
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-3.5 shadow-sm border border-white/60 text-center">
              <p className="font-heading text-2xl font-extrabold text-moss-700 tabular-nums">
                {leaders.length}
              </p>
              <p className="text-[11px] font-semibold text-primary-400 mt-0.5">Leaders</p>
            </div>
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-3.5 shadow-sm border border-white/60 text-center">
              <p className="font-heading text-2xl font-extrabold text-secondary-700 tabular-nums">
                {regularMembers.length}
              </p>
              <p className="text-[11px] font-semibold text-primary-400 mt-0.5">Members</p>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div variants={rm ? undefined : fadeUp} className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full h-11 pl-10 pr-4 rounded-xl',
                'bg-white/90 backdrop-blur-sm shadow-sm border border-primary-100',
                'text-sm text-primary-800 placeholder:text-primary-300',
                'focus:outline-none focus:ring-2 focus:ring-moss-300 focus:border-moss-300',
                'transition-shadow duration-150',
              )}
            />
          </motion.div>

          {/* Leadership team */}
          {leaders.length > 0 && (
            <motion.div variants={rm ? undefined : fadeUp}>
              <p className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-2 px-1">
                Leadership Team
              </p>
              <motion.div
                variants={rm ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm border border-white/60 overflow-hidden"
              >
                {leaders.map((member: any, idx: number) => {
                  const profile = member.profiles
                  const roleConfig = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member
                  return (
                    <motion.div key={member.id} variants={rm ? undefined : fadeUp}>
                      <Link
                        to={`/profile/${member.user_id}`}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3',
                          'hover:bg-moss-50/50 transition-colors duration-150',
                          idx > 0 && 'border-t border-primary-50',
                        )}
                      >
                        <Avatar
                          src={profile?.avatar_url}
                          name={profile?.display_name ?? ''}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary-800 truncate">
                            {profile?.display_name ?? 'Unknown'}
                          </p>
                        </div>
                        <span className={cn(
                          'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                          roleConfig.className,
                        )}>
                          {roleConfig.icon}
                          {roleConfig.label}
                        </span>
                        <ChevronRight size={14} className="text-primary-200 shrink-0" />
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            </motion.div>
          )}

          {/* Regular members */}
          <motion.div variants={rm ? undefined : fadeUp}>
            <p className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-2 px-1">
              Members ({regularMembers.length})
            </p>
            {regularMembers.length === 0 ? (
              <EmptyState
                illustration="empty"
                title={search ? 'No members found' : 'No members yet'}
                description={search ? 'Try a different search' : 'Invite people to join your collective'}
              />
            ) : (
              <motion.div
                variants={rm ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm border border-white/60 overflow-hidden"
              >
                {regularMembers.map((member: any, idx: number) => {
                  const profile = member.profiles
                  return (
                    <motion.div key={member.id} variants={rm ? undefined : fadeUp}>
                      <Link
                        to={`/profile/${member.user_id}`}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3',
                          'hover:bg-moss-50/50 transition-colors duration-150',
                          idx > 0 && 'border-t border-primary-50',
                        )}
                      >
                        <Avatar
                          src={profile?.avatar_url}
                          name={profile?.display_name ?? ''}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary-800 truncate">
                            {profile?.display_name ?? 'Unknown'}
                          </p>
                          <p className="text-[11px] text-primary-400">
                            Joined {new Date(member.joined_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-primary-200 shrink-0" />
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

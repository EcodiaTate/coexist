import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  TreePine,
  Waves,
  Clock,
  Eye,
  Leaf,
  MapPin,
  Users,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLeaderHeader, useLeaderContext } from '@/components/leader-layout'
import { useCollective } from '@/hooks/use-collective'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Data — all collective stats                                        */
/* ------------------------------------------------------------------ */

function useCollectiveFullStats(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-impact-full', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return null

      const now = new Date()

      const [impactRes, membersRes, eventsRes, pastEventsRes] = await Promise.all([
        supabase
          .from('event_impact')
          .select('trees_planted, hours_total, rubbish_kg, coastline_cleaned_m, area_restored_sqm, native_plants, wildlife_sightings, events!inner(collective_id)')
          .eq('events.collective_id' as any, collectiveId),
        supabase
          .from('collective_members')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId),
        supabase
          .from('events')
          .select('id')
          .eq('collective_id', collectiveId)
          .lt('date_start', now.toISOString()),
      ])

      const rows = (impactRes.data ?? []) as any[]
      const eventIds = (pastEventsRes.data ?? []).map((e: any) => e.id)

      let attendanceRate = 0
      if (eventIds.length > 0) {
        const { count: totalReg } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .in('status', ['registered', 'attended'])
        const { count: totalAttended } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .eq('status', 'attended')
        if (totalReg && totalReg > 0) {
          attendanceRate = Math.round(((totalAttended ?? 0) / totalReg) * 100)
        }
      }

      return {
        trees: rows.reduce((s, r) => s + (r.trees_planted ?? 0), 0),
        hours: Math.round(rows.reduce((s, r) => s + (r.hours_total ?? 0), 0)),
        rubbish: Math.round(rows.reduce((s, r) => s + (r.rubbish_kg ?? 0), 0) * 10) / 10,
        coastline: Math.round(rows.reduce((s, r) => s + (r.coastline_cleaned_m ?? 0), 0)),
        area: Math.round(rows.reduce((s, r) => s + (r.area_restored_sqm ?? 0), 0)),
        plants: rows.reduce((s, r) => s + (r.native_plants ?? 0), 0),
        wildlife: rows.reduce((s, r) => s + (r.wildlife_sightings ?? 0), 0),
        eventsLogged: rows.length,
        totalMembers: membersRes.count ?? 0,
        totalEvents: eventsRes.count ?? 0,
        attendanceRate,
      }
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background shapes                                       */
/* ------------------------------------------------------------------ */

function DecoShapes({ rm }: { rm: boolean }) {
  return (
    <>
      {/* Large breathing ring — top right */}
      <motion.div
        className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-moss-300/25"
        animate={rm ? undefined : { scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Concentric inner ring */}
      <motion.div
        className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-primary-200/18"
        animate={rm ? undefined : { scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Medium ring — left side */}
      <motion.div
        className="absolute top-[32%] -left-14 w-52 h-52 rounded-full border-[2.5px] border-sprout-300/22"
        animate={rm ? undefined : { scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Small ring — bottom right */}
      <motion.div
        className="absolute bottom-[18%] right-2 w-32 h-32 rounded-full border-2 border-moss-300/18"
        animate={rm ? undefined : { rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      />

      {/* Deep warm glow — mid left */}
      <motion.div
        className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-sprout-100/22 blur-[50px]"
        animate={rm ? undefined : { scale: [1, 1.14, 1], opacity: [0.22, 0.4, 0.22] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Bottom gradient pool */}
      <motion.div
        className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-moss-200/20 blur-[55px]"
        animate={rm ? undefined : { scale: [1, 1.08, 1], opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Floating particles */}
      <motion.div className="absolute top-24 right-14 w-3 h-3 rounded-full bg-moss-400/18"
        animate={rm ? undefined : { y: [-5, 5, -5], x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[48%] left-8 w-2.5 h-2.5 rounded-full bg-sprout-400/15"
        animate={rm ? undefined : { y: [3, -5, 3] }} transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 1.5 }} />
      <motion.div className="absolute bottom-[28%] right-[18%] w-2 h-2 rounded-full bg-moss-400/15"
        animate={rm ? undefined : { y: [-3, 4, -3], x: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }} />
      <motion.div className="absolute top-[62%] left-[22%] w-2 h-2 rounded-full bg-primary-400/12"
        animate={rm ? undefined : { y: [2, -3, 2] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 2.5 }} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact card                                                        */
/* ------------------------------------------------------------------ */

function ImpactCard({
  value,
  label,
  unit,
  icon,
  gradient,
}: {
  value: number | string
  label: string
  unit?: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn('rounded-2xl p-4 relative overflow-hidden', gradient)}
    >
      <div className="absolute top-3 right-3 opacity-15">
        <span className="[&>svg]:w-8 [&>svg]:h-8">{icon}</span>
      </div>
      <p className="font-heading text-2xl font-extrabold text-white tabular-nums leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}{unit && <span className="text-sm font-bold ml-0.5">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-semibold text-white/80">{label}</p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat row — lighter style for secondary stats                       */
/* ------------------------------------------------------------------ */

function StatRow({
  value,
  label,
  icon,
  color,
}: {
  value: number | string
  label: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-primary-100/40 p-3.5"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider">{label}</p>
        <p className="font-heading text-lg font-extrabold text-primary-800 tabular-nums leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderImpactPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { collectiveId } = useLeaderContext()
  const navigate = useNavigate()
  const { data: collective } = useCollective(collectiveId)

  useLeaderHeader('Impact', { fullBleed: true })

  const { data: stats, isLoading } = useCollectiveFullStats(collectiveId)

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/55 via-primary-100/30 via-25% to-moss-50/20 to-60%" />
        <DecoShapes rm={rm} />
        <div className="relative z-10 px-6 pt-4 space-y-5 pb-20">
          {/* Hero skeleton */}
          <div className="text-center pt-2 pb-1">
            <Skeleton className="h-3 w-28 mx-auto mb-2" />
            <Skeleton className="h-8 w-24 mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} variant="stat-card" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/55 via-primary-100/30 via-25% to-moss-50/20 to-60%" />
        <DecoShapes rm={rm} />
        <div className="relative z-10 px-6 pt-4 pb-20">
          <EmptyState
            illustration="wildlife"
            title="No impact data yet"
            description="Impact metrics will show up here once you log impact data for your events."
          />
        </div>
      </div>
    )
  }

  // Build cards list — only show cards with data
  const impactCards = [
    { value: stats.trees, label: 'Trees Planted', icon: <TreePine />, gradient: 'bg-gradient-to-br from-moss-500 to-moss-700' },
    { value: stats.hours, label: 'Volunteer Hours', unit: 'hrs', icon: <Clock />, gradient: 'bg-gradient-to-br from-primary-500 to-primary-700' },
    { value: stats.rubbish, label: 'Rubbish Collected', unit: 'kg', icon: <Waves />, gradient: 'bg-gradient-to-br from-bark-500 to-bark-700' },
    { value: stats.coastline, label: 'Coastline Cleaned', unit: 'm', icon: <Waves />, gradient: 'bg-gradient-to-br from-sky-500 to-sky-700' },
    { value: stats.area, label: 'Area Restored', unit: 'm²', icon: <MapPin />, gradient: 'bg-gradient-to-br from-secondary-500 to-secondary-700' },
    { value: stats.plants, label: 'Native Plants', icon: <Leaf />, gradient: 'bg-gradient-to-br from-moss-600 to-primary-700' },
    { value: stats.wildlife, label: 'Wildlife Sightings', icon: <Eye />, gradient: 'bg-gradient-to-br from-bark-600 to-bark-800' },
  ].filter((c) => c.value > 0)

  const hasAnyImpact = impactCards.length > 0

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Full-bleed gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/55 via-primary-100/30 via-25% to-moss-50/20 to-60%" />

      {/* Animated decorative shapes */}
      <DecoShapes rm={rm} />

      {/* Top hero glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-primary-300/28 via-primary-200/18 to-transparent blur-[60px]" />

      {/* Content */}
      <motion.div
        className="relative z-10 px-6 pt-4 space-y-5 pb-20"
        variants={rm ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Floating back button */}
        <div className="pt-[var(--safe-top)]">
          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            whileTap={rm ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex items-center justify-center w-9 h-9 rounded-full text-primary-800 hover:bg-primary-50/80 cursor-pointer select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </motion.button>
        </div>

        {/* Collective overview stats */}
        <div>
          <motion.p
            variants={fadeUp}
            className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-2.5 px-1"
          >
            Collective Overview
          </motion.p>
          <div className="grid grid-cols-2 gap-3">
            <StatRow
              value={stats.totalMembers}
              label="Members"
              icon={<Users size={18} className="text-primary-600" />}
              color="bg-primary-100"
            />
            <StatRow
              value={stats.totalEvents}
              label="Total Events"
              icon={<CalendarDays size={18} className="text-moss-600" />}
              color="bg-moss-100"
            />
            <StatRow
              value={stats.eventsLogged}
              label="Impact Logged"
              icon={<CheckCircle2 size={18} className="text-success-600" />}
              color="bg-success-100"
            />
            <StatRow
              value={stats.attendanceRate > 0 ? `${stats.attendanceRate}%` : '—'}
              label="Attendance Rate"
              icon={<TrendingUp size={18} className="text-secondary-600" />}
              color="bg-secondary-100"
            />
          </div>
        </div>

        {/* Environmental impact */}
        {hasAnyImpact && (
          <div>
            <motion.p
              variants={fadeUp}
              className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-2.5 px-1"
            >
              Environmental Impact
            </motion.p>
            <div className="grid grid-cols-2 gap-3">
              {impactCards.map((card) => (
                <ImpactCard
                  key={card.label}
                  value={card.value}
                  label={card.label}
                  unit={card.unit}
                  icon={card.icon}
                  gradient={card.gradient}
                />
              ))}
            </div>
          </div>
        )}

        {!hasAnyImpact && (
          <motion.div variants={fadeUp} className="rounded-2xl bg-moss-50 p-6 text-center">
            <TreePine size={32} className="text-moss-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-moss-700">No environmental impact logged yet</p>
            <p className="text-xs text-moss-500 mt-1">Log impact for your events to see metrics here</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

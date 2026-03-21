import { motion, useReducedMotion } from 'framer-motion'
import {
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
  visible: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
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
      className="flex items-center gap-3 rounded-xl bg-white shadow-sm p-3.5"
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
  const { collectiveId } = useLeaderContext()
  const { data: collective } = useCollective(collectiveId)

  useLeaderHeader('Impact')

  const { data: stats, isLoading } = useCollectiveFullStats(collectiveId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} variant="stat-card" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <EmptyState
        illustration="wildlife"
        title="No impact data yet"
        description="Impact metrics will show up here once you log impact data for your events."
      />
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
    <motion.div
      variants={shouldReduceMotion ? undefined : stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Collective overview stats */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-2.5 px-1">
          Collective Overview
        </p>
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
          <p className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-2.5 px-1">
            Environmental Impact
          </p>
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
        <div className="rounded-2xl bg-moss-50 p-6 text-center">
          <TreePine size={32} className="text-moss-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-moss-700">No environmental impact logged yet</p>
          <p className="text-xs text-moss-500 mt-1">Log impact for your events to see metrics here</p>
        </div>
      )}
    </motion.div>
  )
}

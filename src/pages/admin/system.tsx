import { useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  Database,
  HardDrive,
  Zap,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow } from '@/components/admin-hero-stat'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  System Stats                                                       */
/* ------------------------------------------------------------------ */

function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      // Use SECURITY DEFINER RPC to get real counts bypassing RLS
      const [rpcRes, storageRes] = await Promise.all([
        supabase.rpc('get_admin_system_stats' as string & keyof never),
        supabase.storage.listBuckets(),
      ])

      if (rpcRes.error) throw rpcRes.error

      const counts = rpcRes.data as unknown as Record<string, number>
      const totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0)

      // Count files across all storage buckets
      let totalFiles = 0
      if (storageRes.data) {
        const fileCounts = await Promise.all(
          storageRes.data.map(async (bucket) => {
            const { data } = await supabase.storage.from(bucket.name).list('', { limit: 1000 })
            return data?.length ?? 0
          }),
        )
        totalFiles = fileCounts.reduce((sum, c) => sum + c, 0)
      }

      return {
        counts,
        totalRows,
        authUsers: (counts as Record<string, number>).auth_users ?? (counts as Record<string, number>).profiles ?? 0,
        storageBuckets: storageRes.data?.length ?? 0,
        storageFiles: totalFiles,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Usage gauge                                                        */
/* ------------------------------------------------------------------ */

function UsageGauge({
  label,
  icon,
  value,
  limit,
  unit,
}: {
  label: string
  icon: React.ReactNode
  value: number
  limit: number
  unit: string
}) {
  const percent = limit > 0 ? Math.min((value / limit) * 100, 100) : 0
  const isNearLimit = percent > 80

  return (
    <div className={cn(
      'p-4 rounded-xl shadow-sm',
      isNearLimit ? 'bg-error-50' : 'bg-white',
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('text-primary-400', isNearLimit && 'text-error-500')}>
          {icon}
        </span>
        <span className="text-sm font-medium text-primary-800">{label}</span>
        {isNearLimit && (
          <AlertTriangle size={14} className="text-error-500 ml-auto" />
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="font-heading text-2xl font-bold text-primary-800 tabular-nums">
          {value.toLocaleString()}
        </span>
        <span className="text-xs text-primary-400 mb-1">
          / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            isNearLimit ? 'bg-error-500' : 'bg-primary-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminSystemPage() {
  const { data: stats, isLoading: statsLoading } = useSystemStats()
  const showStatsLoading = useDelayedLoading(statsLoading)

  const heroStats = useMemo(() => (
    <AdminHeroStatRow>
      <AdminHeroStat value={stats?.authUsers ?? 0} label="Auth Users" icon={<Users size={18} />} color="info" delay={0} reducedMotion={false} />
    </AdminHeroStatRow>
  ), [stats?.authUsers])

  useAdminHeader('System', { heroContent: heroStats })

  const shouldReduceMotion = useReducedMotion()

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <div>
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <div className="space-y-6">
          {/* Supabase Usage */}
          <motion.div variants={fadeUp}><section>
        <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
          Supabase Usage
        </h2>

        {showStatsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
          </div>
        ) : statsLoading ? null : (<>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <UsageGauge
              label="Database Rows"
              icon={<Database size={16} />}
              value={stats?.totalRows ?? 0}
              limit={500000}
              unit="rows"
            />
            <UsageGauge
              label="Auth Users"
              icon={<Users size={16} />}
              value={stats?.counts?.profiles ?? 0}
              limit={50000}
              unit="users"
            />
            <UsageGauge
              label="Storage"
              icon={<HardDrive size={16} />}
              value={stats?.storageBuckets ?? 0}
              limit={100}
              unit="buckets"
            />
            <UsageGauge
              label="Edge Functions"
              icon={<Zap size={16} />}
              value={8}
              limit={100}
              unit="deployed"
            />
          </div>

          {/* Per-table breakdown */}
          {stats?.counts && (
            <div className="mt-4 p-4 rounded-xl bg-white shadow-sm">
              <h3 className="text-sm font-semibold text-primary-800 mb-3">Row Counts by Table</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                {Object.entries(stats.counts)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([table, count]) => (
                    <div key={table} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-primary-500 font-mono truncate">{table}</span>
                      <span className="text-sm font-semibold text-primary-800 tabular-nums">
                        {(count as number).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>)}
      </section></motion.div>
    </div>
      </motion.div>
    </div>
  )
}

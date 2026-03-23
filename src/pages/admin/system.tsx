import { useState, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  Database,
  HardDrive,
  Zap,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Modal } from '@/components/modal'
import { Skeleton } from '@/components/skeleton'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { Toggle } from '@/components/toggle'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

/* ------------------------------------------------------------------ */
/*  Feature Flags                                                      */
/* ------------------------------------------------------------------ */

function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('key')
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  System Stats                                                       */
/* ------------------------------------------------------------------ */

function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      // Use SECURITY DEFINER RPC to get real counts bypassing RLS
      const [rpcRes, storageRes] = await Promise.all([
        supabase.rpc('get_admin_system_stats' as any),
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
        authUsers: (counts as any).auth_users ?? (counts as any).profiles ?? 0,
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
  warning,
}: {
  label: string
  icon: React.ReactNode
  value: number
  limit: number
  unit: string
  warning?: boolean
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
  const [showAddFlag, setShowAddFlag] = useState(false)
  const [newFlagKey, setNewFlagKey] = useState('')
  const [newFlagDesc, setNewFlagDesc] = useState('')

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: stats, isLoading: statsLoading } = useSystemStats()
  const showStatsLoading = useDelayedLoading(statsLoading)
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags()
  const showFlagsLoading = useDelayedLoading(flagsLoading)

  const heroStats = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Auth Users</p>
        <p className="text-xl font-bold text-white tabular-nums">{(stats?.authUsers ?? 0).toLocaleString()}</p>
      </div>
      <div className="rounded-xl bg-white/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Feature Flags</p>
        <p className="text-xl font-bold text-white tabular-nums">{flags?.length ?? 0}</p>
      </div>
    </div>
  ), [stats?.authUsers, flags?.length])

  useAdminHeader('System', { heroContent: heroStats })

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, enabled, key }: { id: string; enabled: boolean; key?: string }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled })
        .eq('id', id)
      if (error) throw error
      await logAudit({ action: 'feature_flag_toggled', target_type: 'feature_flag', target_id: id, details: { key, enabled } })
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      toast.success(`Flag ${enabled ? 'enabled' : 'disabled'}`)
    },
    onError: () => toast.error('Failed to toggle flag'),
  })

  const addFlagMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('feature_flags').insert({
        key: newFlagKey,
        description: newFlagDesc,
        enabled: false,
      }).select('id').single()
      if (error) throw error
      await logAudit({ action: 'feature_flag_added', target_type: 'feature_flag', target_id: data?.id, details: { key: newFlagKey } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      setShowAddFlag(false)
      setNewFlagKey('')
      setNewFlagDesc('')
      toast.success('Flag added')
    },
    onError: () => toast.error('Failed to add flag'),
  })

  const deleteFlagMutation = useMutation({
    mutationFn: async (id: string) => {
      await logAudit({ action: 'feature_flag_deleted', target_type: 'feature_flag', target_id: id })
      const { error } = await supabase.from('feature_flags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      toast.success('Flag deleted')
    },
    onError: () => toast.error('Failed to delete flag'),
  })

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

      {/* Feature Flags */}
      <motion.div variants={fadeUp}><section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-semibold text-primary-800">
            Feature Flags
          </h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowAddFlag(true)}
          >
            Add Flag
          </Button>
        </div>

        {showFlagsLoading ? (
          <Skeleton variant="list-item" count={4} />
        ) : flagsLoading ? null : !flags?.length ? (
          <div className="p-4 rounded-xl bg-white text-center">
            <p className="text-sm text-primary-400">No feature flags configured</p>
          </div>
        ) : (
          <StaggeredList className="space-y-2">
            {flags.map((flag) => (
              <StaggeredItem
                key={flag.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-primary-800">
                      {flag.key}
                    </code>
                    <span
                      className={cn(
                        'text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                        flag.enabled
                          ? 'bg-success-100 text-success-700'
                          : 'bg-white text-primary-400',
                      )}
                    >
                      {flag.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="text-xs text-primary-400 mt-0.5">
                      {flag.description}
                    </p>
                  )}
                </div>

                <Toggle
                  checked={flag.enabled}
                  onChange={(v) =>
                    toggleFlagMutation.mutate({ id: flag.id, enabled: v, key: flag.key })
                  }
                  size="sm"
                />

                <button
                  type="button"
                  onClick={() => deleteFlagMutation.mutate(flag.id)}
                  className="p-1.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                  aria-label={`Delete ${flag.key}`}
                >
                  <Trash2 size={14} />
                </button>
              </StaggeredItem>
            ))}
          </StaggeredList>
        )}
      </section></motion.div>
    </div>

    {/* Add flag modal */}
    <Modal
      open={showAddFlag}
      onClose={() => setShowAddFlag(false)}
      title="Add Feature Flag"
    >
      <div className="space-y-4">
        <Input
          label="Flag Key"
          value={newFlagKey}
          onChange={(e) => setNewFlagKey(e.target.value)}
          required
          placeholder="e.g. enable_merch_store"
        />
        <Input
          label="Description"
          value={newFlagDesc}
          onChange={(e) => setNewFlagDesc(e.target.value)}
          placeholder="What does this flag control?"
        />
        <Button
          variant="primary"
          fullWidth
          onClick={() => addFlagMutation.mutate()}
          loading={addFlagMutation.isPending}
          disabled={!newFlagKey.trim()}
        >
          Add Flag
        </Button>
      </div>
    </Modal>
      </motion.div>
    </div>
  )
}

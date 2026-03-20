import { useState } from 'react'
import {
  Settings,
  Database,
  HardDrive,
  Wifi,
  Zap,
  Users,
  AlertTriangle,
  ToggleLeft,
  Plus,
  Trash2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Modal } from '@/components/modal'
import { Skeleton } from '@/components/skeleton'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { Toggle } from '@/components/toggle'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

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
      // Get counts for key tables
      const [usersRes, collectivesRes, eventsRes, storageRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.storage.listBuckets(),
      ])

      return {
        authUsers: usersRes.count ?? 0,
        collectives: collectivesRes.count ?? 0,
        events: eventsRes.count ?? 0,
        storageBuckets: storageRes.data?.length ?? 0,
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
      'p-4 rounded-xl border',
      isNearLimit ? 'bg-red-50 border-red-200' : 'bg-white border-primary-100',
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('text-primary-400', isNearLimit && 'text-red-500')}>
          {icon}
        </span>
        <span className="text-sm font-medium text-primary-800">{label}</span>
        {isNearLimit && (
          <AlertTriangle size={14} className="text-red-500 ml-auto" />
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
            'h-full rounded-full transition-all duration-500',
            isNearLimit ? 'bg-red-500' : 'bg-primary-500',
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
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags()

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      toast.success(`Flag ${enabled ? 'enabled' : 'disabled'}`)
    },
    onError: () => toast.error('Failed to toggle flag'),
  })

  const addFlagMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('feature_flags').insert({
        key: newFlagKey,
        description: newFlagDesc,
        enabled: false,
      })
      if (error) throw error
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
      const { error } = await supabase.from('feature_flags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      toast.success('Flag deleted')
    },
    onError: () => toast.error('Failed to delete flag'),
  })

  return (
    <AdminLayout title="System">
      <div className="space-y-6">
        {/* Supabase Usage */}
        <section>
          <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
            Supabase Usage
          </h2>

          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Skeleton variant="stat-card" />
              <Skeleton variant="stat-card" />
              <Skeleton variant="stat-card" />
              <Skeleton variant="stat-card" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <UsageGauge
                label="Database Rows"
                icon={<Database size={16} />}
                value={(stats?.authUsers ?? 0) + (stats?.events ?? 0) * 5}
                limit={500000}
                unit="rows"
              />
              <UsageGauge
                label="Storage"
                icon={<HardDrive size={16} />}
                value={stats?.storageBuckets ?? 0}
                limit={10}
                unit="buckets"
              />
              <UsageGauge
                label="Auth Users"
                icon={<Users size={16} />}
                value={stats?.authUsers ?? 0}
                limit={50000}
                unit="users"
              />
              <UsageGauge
                label="Edge Functions"
                icon={<Zap size={16} />}
                value={0}
                limit={500000}
                unit="invocations"
              />
            </div>
          )}
        </section>

        {/* Feature Flags */}
        <section>
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

          {flagsLoading ? (
            <Skeleton variant="list-item" count={4} />
          ) : !flags?.length ? (
            <div className="p-4 rounded-xl bg-white text-center">
              <p className="text-sm text-primary-400">No feature flags configured</p>
            </div>
          ) : (
            <StaggeredList className="space-y-2">
              {flags.map((flag) => (
                <StaggeredItem
                  key={flag.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-primary-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-primary-800">
                        {flag.key}
                      </code>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          flag.enabled
                            ? 'bg-green-100 text-green-700'
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
                      toggleFlagMutation.mutate({ id: flag.id, enabled: v })
                    }
                    size="sm"
                  />

                  <button
                    type="button"
                    onClick={() => deleteFlagMutation.mutate(flag.id)}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    aria-label={`Delete ${flag.key}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </section>
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
    </AdminLayout>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MapPin,
  Users,
  CalendarDays,
  Search,
  Plus,
  Archive,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Modal } from '@/components/modal'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

function useCollectives(search: string) {
  return useQuery({
    queryKey: ['admin-collectives', search],
    queryFn: async () => {
      let query = supabase
        .from('collectives')
        .select('id, name, location_name, cover_image_url, is_archived, created_at' as any)
        .order('name')

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      // Enrich with member counts
      const enriched = await Promise.all(
        (data as any[] ?? []).map(async (collective: any) => {
          const [membersRes, eventsRes] = await Promise.all([
            supabase
              .from('collective_members')
              .select('id', { count: 'exact', head: true })
              .eq('collective_id', collective.id),
            supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('collective_id', collective.id),
          ])

          // Simple health score: based on member count + recent events
          const memberCount = membersRes.count ?? 0
          const eventCount = eventsRes.count ?? 0
          const health =
            memberCount >= 10 && eventCount >= 3
              ? 'healthy'
              : memberCount >= 5
                ? 'moderate'
                : 'needs-attention'

          return {
            ...collective,
            memberCount,
            eventCount,
            health: health as 'healthy' | 'moderate' | 'needs-attention',
          }
        }),
      )

      return enriched
    },
    staleTime: 2 * 60 * 1000,
  })
}

const healthColors = {
  healthy: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  'needs-attention': 'bg-red-100 text-red-700',
}

const healthLabels = {
  healthy: 'Healthy',
  moderate: 'Moderate',
  'needs-attention': 'Needs Attention',
}

export default function AdminCollectivesPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: collectives, isLoading } = useCollectives(search)

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('collectives').insert({
        name: newName,
        location_name: newLocation,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
      setShowCreate(false)
      setNewName('')
      setNewLocation('')
      toast.success('Collective created')
    },
    onError: () => toast.error('Failed to create collective'),
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collectives')
        .update({ is_active: false } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
      setArchiveTarget(null)
      toast.success('Collective archived')
    },
    onError: () => toast.error('Failed to archive collective'),
  })

  return (
    <AdminLayout
      title="Collectives"
      actions={
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => setShowCreate(true)}
        >
          Create
        </Button>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <Input
          type="search"
          label="Search collectives"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
        />
      </div>

      {/* List */}
      {isLoading ? (
        <Skeleton variant="list-item" count={5} />
      ) : !collectives?.length ? (
        <EmptyState
          illustration="empty"
          title="No collectives found"
          description={search ? 'Try a different search term' : 'Create your first collective'}
          action={
            !search
              ? { label: 'Create Collective', onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {collectives.map((c: any) => (
            <Link
              key={c.id}
              to={`/collectives/${c.slug ?? c.id}`}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl',
                'bg-white border border-primary-100 shadow-sm',
                'hover:shadow-md transition-shadow duration-150',
                c.is_archived && 'opacity-50',
              )}
            >
              {c.cover_image_url ? (
                <img
                  src={c.cover_image_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <MapPin size={24} className="text-primary-500" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm font-semibold text-primary-800 truncate">
                    {c.name}
                  </p>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                      healthColors[c.health as keyof typeof healthColors],
                    )}
                  >
                    {healthLabels[c.health as keyof typeof healthLabels]}
                  </span>
                </div>
                {c.location_name && (
                  <p className="text-xs text-primary-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={12} />
                    {c.location_name}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-primary-400">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {c.memberCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} /> {c.eventCount} events
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!c.is_archived && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setArchiveTarget(c.id)
                    }}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 hover:text-primary-400 cursor-pointer"
                    aria-label={`Archive ${c.name}`}
                  >
                    <Archive size={16} />
                  </button>
                )}
                <ChevronRight size={16} className="text-primary-300" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Collective"
      >
        <div className="space-y-4">
          <Input
            label="Collective Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="e.g. Byron Bay Collective"
          />
          <Input
            label="Location"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="e.g. Byron Bay, NSW"
          />
          <Button
            variant="primary"
            fullWidth
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!newName.trim()}
          >
            Create Collective
          </Button>
        </div>
      </Modal>

      {/* Archive confirmation */}
      <ConfirmationSheet
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
        title="Archive Collective"
        description="This collective will be hidden from members. You can restore it later."
        confirmLabel="Archive"
        variant="warning"
      />
    </AdminLayout>
  )
}

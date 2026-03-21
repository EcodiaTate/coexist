import { useState, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Trophy,
  Plus,
  Calendar,
  Target,
  Trash2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Modal } from '@/components/modal'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

function useChallenges() {
  return useQuery({
    queryKey: ['admin-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })
}

export default function AdminChallengesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_type: 'events',
    goal_value: '',
    start_date: '',
    end_date: '',
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: challenges, isLoading } = useChallenges()

  const heroActions = useMemo(() => (
    <Button
      variant="primary"
      size="sm"
      icon={<Plus size={16} />}
      onClick={() => setShowCreate(true)}
      className="!bg-white/15 !border-white/10 hover:!bg-white/25 !text-white"
    >
      Create Challenge
    </Button>
  ), [])

  const heroStats = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Total</p>
        <p className="text-xl font-bold text-white tabular-nums">{challenges?.length ?? 0}</p>
      </div>
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Active</p>
        <p className="text-xl font-bold text-white tabular-nums">{challenges?.filter((c: any) => (c as any).status === 'active').length ?? 0}</p>
      </div>
    </div>
  ), [challenges])

  useAdminHeader('Challenges', { actions: heroActions, heroContent: heroStats })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('challenges').insert({
        title: form.title,
        description: form.description,
        goal_type: form.goal_type,
        goal_value: parseInt(form.goal_value) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
        status: 'active',
      }).select('id').single()
      if (error) throw error
      await logAudit({ action: 'challenge_created', target_type: 'challenge', target_id: data?.id, details: { title: form.title } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] })
      setShowCreate(false)
      setForm({
        title: '',
        description: '',
        goal_type: 'events',
        goal_value: '',
        start_date: '',
        end_date: '',
      })
      toast.success('Challenge created')
    },
    onError: () => toast.error('Failed to create challenge'),
  })

  const endMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'ended', end_date: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await logAudit({ action: 'challenge_ended', target_type: 'challenge', target_id: id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] })
      toast.success('Challenge ended')
    },
    onError: () => toast.error('Failed to end challenge'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await logAudit({ action: 'challenge_deleted', target_type: 'challenge', target_id: id })
      const { error } = await supabase.from('challenges').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] })
      setDeleteTarget(null)
      toast.success('Challenge deleted')
    },
    onError: () => toast.error('Failed to delete challenge'),
  })

  const shouldReduceMotion = useReducedMotion()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <div>
        <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
          {isLoading ? (
            <Skeleton variant="list-item" count={4} />
          ) : !challenges?.length ? (
            <EmptyState
              illustration="empty"
              title="No challenges yet"
              description="Create your first national challenge to motivate collectives"
              action={{ label: 'Create Challenge', onClick: () => setShowCreate(true) }}
            />
          ) : (
            <StaggeredList className="space-y-3">
              {challenges.map((challenge) => {
                const isActive = (challenge as any).status === 'active'

                return (
                  <StaggeredItem
                    key={challenge.id}
                    className={cn(
                      'p-4 rounded-xl bg-white shadow-sm',
                      !isActive && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                            isActive ? 'bg-accent-100' : 'bg-white',
                          )}
                        >
                          <Trophy
                            size={20}
                            className={isActive ? 'text-primary-400' : 'text-primary-400'}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading text-sm font-semibold text-primary-800 truncate">
                              {challenge.title}
                            </h3>
                            <span
                              className={cn(
                                'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                                isActive
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-white text-primary-400',
                              )}
                            >
                              {isActive ? 'Active' : 'Ended'}
                            </span>
                          </div>
                          {challenge.description && (
                            <p className="text-xs text-primary-400 mt-0.5 line-clamp-2">
                              {challenge.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-primary-400">
                            <span className="flex items-center gap-1">
                              <Target size={12} />
                              {challenge.goal_value} {challenge.goal_type}
                            </span>
                            {challenge.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(challenge.start_date).toLocaleDateString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                                {challenge.end_date &&
                                  ` - ${new Date(challenge.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => endMutation.mutate(challenge.id)}
                          >
                            End
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(challenge.id)}
                          className="p-1.5 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                          aria-label="Delete challenge"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </StaggeredItem>
                )
              })}
            </StaggeredList>
          )}
          </motion.div>

          {/* Create modal */}
          <Modal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            title="Create National Challenge"
            size="lg"
          >
            <div className="space-y-4">
              <Input
                label="Challenge Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                placeholder="e.g. Plant 10,000 Trees"
              />
              <Input
                type="textarea"
                label="Description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe the challenge..."
              />
              <div className="grid grid-cols-2 gap-3">
                <Dropdown
                  options={[
                    { value: 'events', label: 'Events' },
                    { value: 'trees', label: 'Trees Planted' },
                    { value: 'hours', label: 'Volunteer Hours' },
                    { value: 'rubbish', label: 'Rubbish (kg)' },
                    { value: 'members', label: 'New Members' },
                  ]}
                  value={form.goal_type}
                  onChange={(v) => setForm((p) => ({ ...p, goal_type: v }))}
                  label="Goal Type"
                />
                <Input
                  label="Goal Value"
                  value={form.goal_value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, goal_value: e.target.value }))
                  }
                  placeholder="e.g. 100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                  placeholder="YYYY-MM-DD"
                />
                <Input
                  label="End Date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <Button
                variant="primary"
                fullWidth
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!form.title.trim()}
              >
                Create Challenge
              </Button>
            </div>
          </Modal>

          <ConfirmationSheet
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            title="Delete Challenge"
            description="This will permanently delete this challenge and its data."
            confirmLabel="Delete"
            variant="danger"
          />
        </motion.div>
    </div>
  )
}

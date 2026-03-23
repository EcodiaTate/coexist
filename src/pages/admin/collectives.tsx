import { useState, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  MapPin,
  Users,
  CalendarDays,
  Plus,
  Archive,
  RotateCcw,
  ChevronRight,
  Crown,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow } from '@/components/admin-hero-stat'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { SearchBar } from '@/components/search-bar'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Modal } from '@/components/modal'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import {
  useAdminCollectives,
  useCreateCollective,
  useArchiveCollective,
  type AdminCollective,
} from '@/hooks/use-admin-collectives'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const healthConfig = {
  healthy: { color: 'bg-success-100 text-success-700', label: 'Healthy' },
  moderate: { color: 'bg-warning-100 text-warning-700', label: 'Moderate' },
  'needs-attention': { color: 'bg-error-100 text-error-700', label: 'Needs Attention' },
} as const

const AUSTRALIAN_STATES = [
  '', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
] as const

type StatusFilter = 'all' | 'active' | 'archived'

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Create collective modal                                            */
/* ------------------------------------------------------------------ */

function CreateCollectiveModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const createCollective = useCreateCollective()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [state, setState] = useState('')

  const handleCreate = async () => {
    try {
      await createCollective.mutateAsync({
        name,
        description: description || undefined,
        region: region || undefined,
        state: state || undefined,
      })
      toast.success('Collective created')
      setName('')
      setDescription('')
      setRegion('')
      setState('')
      onClose()
    } catch {
      toast.error('Failed to create collective')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Collective">
      <div className="space-y-4">
        <Input
          label="Collective Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Byron Bay Collective"
        />
        <div>
          <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this collective focus on?"
            rows={3}
            className={cn(
              'w-full rounded-xl bg-primary-50/50 px-3 py-2.5 text-sm text-primary-800',
              'placeholder:text-primary-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
              'resize-none',
            )}
          />
        </div>
        <Input
          label="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. Byron Bay"
        />
        <div>
          <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={cn(
              'w-full rounded-xl bg-primary-50/50 px-3 py-2.5 text-sm text-primary-800',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
            )}
          >
            <option value="">Select state...</option>
            {AUSTRALIAN_STATES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          fullWidth
          onClick={handleCreate}
          loading={createCollective.isPending}
          disabled={!name.trim()}
        >
          Create Collective
        </Button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminCollectivesPage() {
  const shouldReduceMotion = useReducedMotion()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<AdminCollective | null>(null)
  const { toast } = useToast()

  const { data: collectives, isLoading } = useAdminCollectives({
    search,
    status: statusFilter,
  })
  const showLoading = useDelayedLoading(isLoading)
  const archiveMutation = useArchiveCollective()

  const heroActions = useMemo(() => (
    <Button
      variant="primary"
      size="sm"
      icon={<Plus size={16} />}
      onClick={() => setShowCreate(true)}
      className="!bg-white/15 !border-white/10 hover:!bg-white/25 !text-white"
    >
      Create
    </Button>
  ), [])

  const handleArchiveToggle = async () => {
    if (!archiveTarget) return
    const isCurrentlyActive = archiveTarget.is_active
    try {
      await archiveMutation.mutateAsync({
        collectiveId: archiveTarget.id,
        archive: isCurrentlyActive,
      })
      toast.success(isCurrentlyActive ? 'Collective archived' : 'Collective restored')
    } catch {
      toast.error('Failed to update collective')
    }
    setArchiveTarget(null)
  }

  // Stats summary
  const stats = useMemo(() => {
    if (!collectives) return null
    const total = collectives.length
    const active = collectives.filter((c) => c.is_active).length
    const totalMembers = collectives.reduce((acc, c) => acc + c.memberCount, 0)
    const totalEvents = collectives.reduce((acc, c) => acc + c.eventCount, 0)
    return { total, active, totalMembers, totalEvents }
  }, [collectives])

  const rm = !!shouldReduceMotion

  const heroStats = useMemo(() => (
    <AdminHeroStatRow>
      <AdminHeroStat value={stats?.total ?? 0} label="Total" icon={<MapPin size={18} />} color="primary" delay={0} reducedMotion={rm} />
      <AdminHeroStat value={stats?.active ?? 0} label="Active" icon={<Users size={18} />} color="success" delay={1} reducedMotion={rm} />
      <AdminHeroStat value={stats?.totalMembers ?? 0} label="Members" icon={<Users size={18} />} color="info" delay={2} reducedMotion={rm} />
      <AdminHeroStat value={stats?.totalEvents ?? 0} label="Events" icon={<CalendarDays size={18} />} color="sprout" delay={3} reducedMotion={rm} />
    </AdminHeroStatRow>
  ), [stats, rm])

  useAdminHeader('Collectives', { actions: heroActions, heroContent: heroStats })

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <div>
        <motion.div variants={stagger} initial="hidden" animate="visible">
          {/* Filters */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search collectives..."
              compact
              className="flex-1"
            />
            <div className="flex items-center gap-1 rounded-xl shadow-sm bg-white p-0.5">
              {(['active', 'archived', 'all'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize',
                    'transition-colors duration-150 cursor-pointer select-none',
                    statusFilter === s
                      ? 'bg-primary-100 text-primary-800'
                      : 'text-primary-400 hover:text-primary-600',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* List */}
          <motion.div variants={fadeUp}>
          {showLoading ? (
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
              {collectives.map((c, i) => {
                const healthCfg = healthConfig[c.health]

                return (
                  <motion.div
                    key={c.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(i * 0.025, 0.2),
                      duration: 0.2,
                      ease: 'easeOut',
                    }}
                  >
                    <Link
                      to={`/admin/collectives/${c.id}`}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl',
                        'bg-white shadow-sm',
                        'hover:shadow-md active:scale-[0.99] transition-[color,background-color,box-shadow,transform] duration-150',
                        !c.is_active && 'opacity-60',
                      )}
                    >
                      {/* Cover image */}
                      {c.cover_image_url ? (
                        <img
                          src={c.cover_image_url}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center shrink-0">
                          <MapPin size={24} className="text-primary-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-heading text-sm font-semibold text-primary-800 truncate">
                            {c.name}
                          </p>
                          <span
                            className={cn(
                              'text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                              healthCfg.color,
                            )}
                          >
                            {healthCfg.label}
                          </span>
                          {!c.is_active && (
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 shrink-0">
                              Archived
                            </span>
                          )}
                        </div>
                        {(c.region || c.state) && (
                          <p className="text-xs text-primary-400 flex items-center gap-1">
                            <MapPin size={12} />
                            {[c.region, c.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-primary-400">
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {c.memberCount} members
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays size={12} /> {c.eventCount} events
                          </span>
                          {c.leaderName && (
                            <span className="flex items-center gap-1 truncate">
                              <Crown size={12} /> {c.leaderName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setArchiveTarget(c)
                          }}
                          className="p-2 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer active:scale-[0.93] transition-[colors,transform]"
                          aria-label={c.is_active ? `Archive ${c.name}` : `Restore ${c.name}`}
                        >
                          {c.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}
                        </button>
                        <ChevronRight size={16} className="text-primary-300" />
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
          </motion.div>
        </motion.div>

      {/* Create modal */}
      <CreateCollectiveModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Archive / Restore confirmation */}
      <ConfirmationSheet
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveToggle}
        title={archiveTarget?.is_active ? 'Archive Collective' : 'Restore Collective'}
        description={
          archiveTarget?.is_active
            ? `"${archiveTarget?.name}" will be hidden from members. You can restore it later.`
            : `"${archiveTarget?.name}" will be made visible to members again.`
        }
        confirmLabel={archiveTarget?.is_active ? 'Archive' : 'Restore'}
        variant="warning"
      />
    </div>
  )
}

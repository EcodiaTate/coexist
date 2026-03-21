import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  CalendarDays,
  MapPin,
  TreePine,
  Trash2 as TrashIcon,
  Clock,
  Crown,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserMinus,
  UserPlus,
  RotateCcw,
  Search,
  Download,
  Archive,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Modal } from '@/components/modal'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import {
  useAdminCollectiveDetail,
  useAdminCollectiveMembers,
  useAdminCollectiveEvents,
  useAdminCollectiveStats,
  useAdminUpdateCollective,
  useAdminUpdateMemberRole,
  useAdminRemoveMember,
  useAdminRestoreMember,
  useAdminAddMember,
  useArchiveCollective,
  useDeleteCollective,
  useSearchUsers,
  exportAdminMembersCSV,
  type AdminCollectiveMember,
  type AdminCollectiveEvent,
} from '@/hooks/use-admin-collectives'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Role helpers                                                       */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<CollectiveRole, string> = {
  leader: 'Leader',
  co_leader: 'Co-Leader',
  assist_leader: 'Assist Leader',
  member: 'Member',
}

const ROLE_ICONS: Record<CollectiveRole, typeof Crown> = {
  leader: Crown,
  co_leader: ShieldCheck,
  assist_leader: ShieldAlert,
  member: Users,
}

const ROLE_COLORS: Record<CollectiveRole, string> = {
  leader: 'bg-warning-100 text-warning-700',
  co_leader: 'bg-primary-100 text-primary-700',
  assist_leader: 'bg-info-100 text-info-700',
  member: 'bg-neutral-100 text-neutral-600',
}

const ALL_ROLES: CollectiveRole[] = ['leader', 'co_leader', 'assist_leader', 'member']

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const

type TabKey = 'overview' | 'members' | 'events' | 'settings'

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-primary-400 mb-1">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-primary-800">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overview tab                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ collectiveId }: { collectiveId: string }) {
  const { data: detail } = useAdminCollectiveDetail(collectiveId)
  const { data: stats, isLoading: statsLoading } = useAdminCollectiveStats(collectiveId)
  const { data: members = [] } = useAdminCollectiveMembers(collectiveId)
  const { data: events = [] } = useAdminCollectiveEvents(collectiveId)

  const leaders = members.filter((m) =>
    ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  const recentEvents = events.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Collective header card */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {detail?.cover_image_url && (
          <div className="h-32 bg-primary-100">
            <img
              src={detail.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold text-primary-800">
                {detail?.name}
              </h2>
              {(detail?.region || detail?.state) && (
                <p className="text-sm text-primary-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={14} />
                  {[detail.region, detail.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            {!detail?.is_active && (
              <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
                Archived
              </span>
            )}
          </div>
          {detail?.description && (
            <p className="mt-3 text-sm text-primary-600 leading-relaxed">
              {detail.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <Skeleton variant="card" count={2} />
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Members"
            value={stats.member_count}
            icon={<Users size={16} />}
          />
          <StatCard
            label="Events"
            value={stats.event_count}
            icon={<CalendarDays size={16} />}
          />
          <StatCard
            label="Trees Planted"
            value={stats.trees_planted}
            icon={<TreePine size={16} />}
          />
          <StatCard
            label="Hours"
            value={Math.round(stats.hours_total)}
            icon={<Clock size={16} />}
          />
          <StatCard
            label="Rubbish (kg)"
            value={Math.round(stats.rubbish_kg)}
            icon={<TrashIcon size={16} />}
          />
          <StatCard
            label="Native Plants"
            value={stats.native_plants}
            icon={<TreePine size={16} />}
          />
          <StatCard
            label="Area Restored"
            value={`${Math.round(stats.area_restored_sqm)}m²`}
            icon={<MapPin size={16} />}
          />
          <StatCard
            label="Coastline"
            value={`${Math.round(stats.coastline_cleaned_m)}m`}
            icon={<MapPin size={16} />}
          />
          {(stats.wildlife_sightings ?? 0) > 0 && (
            <StatCard
              label="Wildlife Sightings"
              value={stats.wildlife_sightings}
              icon={<Eye size={16} />}
            />
          )}
        </div>
      ) : null}

      {/* Leadership team */}
      <div>
        <h3 className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">
          Leadership Team ({leaders.length})
        </h3>
        {leaders.length === 0 ? (
          <p className="text-sm text-primary-400 italic">No leaders assigned</p>
        ) : (
          <div className="space-y-2">
            {leaders.map((m) => {
              const Icon = ROLE_ICONS[m.role]
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-white shadow-sm px-3 py-2.5"
                >
                  <Avatar
                    src={m.profiles?.avatar_url}
                    name={m.profiles?.display_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {m.profiles?.display_name ?? 'Unknown'}
                    </p>
                    {m.profiles?.instagram_handle && (
                      <p className="text-xs text-primary-400 truncate">
                        @{m.profiles.instagram_handle}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0',
                      ROLE_COLORS[m.role],
                    )}
                  >
                    <Icon size={12} />
                    {ROLE_LABELS[m.role]}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <h3 className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">
          Recent Events ({events.length} total)
        </h3>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-primary-400 italic">No events yet</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Event row                                                          */
/* ------------------------------------------------------------------ */

const EVENT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  published: 'bg-primary-100 text-primary-700',
  completed: 'bg-success-100 text-success-700',
  cancelled: 'bg-error-100 text-error-600',
}

function EventRow({ event }: { event: AdminCollectiveEvent }) {
  const date = new Date(event.date_start)
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white shadow-sm px-3 py-2.5">
      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-primary-50 shrink-0">
        <span className="text-[10px] font-bold text-primary-500 uppercase leading-none">
          {date.toLocaleDateString('en-AU', { month: 'short' })}
        </span>
        <span className="text-sm font-bold text-primary-800 leading-tight">
          {date.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary-800 truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-primary-400">
          <span className="capitalize">{event.activity_type.replace(/_/g, ' ')}</span>
          <span>&middot;</span>
          <span>{event.registrationCount} registered</span>
          {event.capacity && (
            <>
              <span>/</span>
              <span>{event.capacity} capacity</span>
            </>
          )}
        </div>
      </div>
      <span
        className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0',
          EVENT_STATUS_COLORS[event.status] ?? 'bg-neutral-100 text-neutral-500',
        )}
      >
        {event.status}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Members tab                                                        */
/* ------------------------------------------------------------------ */

function MembersTab({ collectiveId }: { collectiveId: string }) {
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [roleAssignMember, setRoleAssignMember] = useState<AdminCollectiveMember | null>(null)
  const [removingMember, setRemovingMember] = useState<AdminCollectiveMember | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)

  const { data: detail } = useAdminCollectiveDetail(collectiveId)
  const { data: members = [], isLoading } = useAdminCollectiveMembers(
    collectiveId,
    showInactive ? 'all' : 'active',
  )
  const updateRole = useAdminUpdateMemberRole()
  const removeMember = useAdminRemoveMember()
  const restoreMember = useAdminRestoreMember()

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) =>
        m.profiles?.display_name?.toLowerCase().includes(q) ||
        m.profiles?.instagram_handle?.toLowerCase().includes(q),
    )
  }, [members, search])

  const handleRoleChange = async (userId: string, role: CollectiveRole) => {
    try {
      await updateRole.mutateAsync({ collectiveId, userId, role })
      setRoleAssignMember(null)
      toast.success(`Role updated to ${ROLE_LABELS[role]}`)
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleRemove = async () => {
    if (!removingMember) return
    try {
      await removeMember.mutateAsync({
        collectiveId,
        userId: removingMember.user_id,
      })
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
    setRemovingMember(null)
  }

  const handleRestore = async (member: AdminCollectiveMember) => {
    try {
      await restoreMember.mutateAsync({
        collectiveId,
        userId: member.user_id,
      })
      toast.success('Member restored')
    } catch {
      toast.error('Failed to restore member')
    }
  }

  const handleExport = () => {
    exportAdminMembersCSV(members, detail?.name ?? 'collective')
    toast.success('CSV downloaded')
  }

  if (isLoading) return <Skeleton variant="list-item" count={8} />

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className={cn(
              'w-full rounded-xl bg-primary-50/50 py-2 pl-9 pr-3 text-sm text-primary-800',
              'placeholder:text-primary-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInactive((p) => !p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm',
              'transition-colors cursor-pointer select-none',
              showInactive
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white text-primary-400 hover:bg-primary-50',
            )}
          >
            {showInactive ? 'All statuses' : 'Active only'}
          </button>
          <Button
            variant="ghost"
            size="sm"
            icon={<UserPlus size={16} />}
            onClick={() => setShowAddMember(true)}
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={16} />}
            onClick={handleExport}
          >
            CSV
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-primary-400">
        {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
        {search && ` matching "${search}"`}
      </p>

      {/* Member list */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No members found"
          description={search ? 'Try a different search' : 'This collective has no members yet'}
        />
      ) : (
        <div className="space-y-1">
          {filteredMembers.map((member) => {
            const Icon = ROLE_ICONS[member.role]
            const isInactive = member.status !== 'active'

            return (
              <div
                key={member.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isInactive ? 'opacity-50 bg-neutral-50' : 'hover:bg-primary-50/50',
                )}
              >
                <Avatar
                  src={member.profiles?.avatar_url}
                  name={member.profiles?.display_name}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-800 truncate">
                    {member.profiles?.display_name ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold',
                        ROLE_COLORS[member.role],
                      )}
                    >
                      <Icon size={10} />
                      {ROLE_LABELS[member.role]}
                    </span>
                    {member.profiles?.instagram_handle && (
                      <span className="text-[11px] text-primary-400 truncate">
                        @{member.profiles.instagram_handle}
                      </span>
                    )}
                    {isInactive && (
                      <span className="text-[10px] font-semibold text-error-500 capitalize">
                        {member.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isInactive ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(member)}
                      className="p-2 rounded-lg text-primary-400 hover:bg-primary-100 cursor-pointer transition-colors"
                      aria-label="Restore member"
                    >
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setRoleAssignMember(member)}
                        className="p-2 rounded-lg text-primary-400 hover:bg-primary-100 cursor-pointer transition-colors"
                        aria-label="Change role"
                      >
                        <Shield size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemovingMember(member)}
                        className="p-2 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-500 cursor-pointer transition-colors"
                        aria-label="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Role assignment sheet */}
      {roleAssignMember && (
        <BottomSheet open={!!roleAssignMember} onClose={() => setRoleAssignMember(null)}>
          <div className="space-y-3 pb-2">
            <h3 className="font-heading text-lg font-semibold text-primary-800">
              Change Role
            </h3>
            <p className="text-sm text-primary-500">
              {roleAssignMember.profiles?.display_name ?? 'Member'} is currently{' '}
              <strong>{ROLE_LABELS[roleAssignMember.role]}</strong>
            </p>

            <div className="space-y-1">
              {ALL_ROLES.map((role) => {
                const RoleIcon = ROLE_ICONS[role]
                const isActive = roleAssignMember.role === role

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(roleAssignMember.user_id, role)}
                    disabled={isActive}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm',
                      'active:scale-[0.97] transition-all duration-150 cursor-pointer select-none',
                      isActive
                        ? 'bg-primary-50 text-primary-500'
                        : 'text-primary-800 hover:bg-primary-50',
                    )}
                  >
                    <RoleIcon size={18} className={isActive ? 'text-primary-500' : 'text-primary-400'} />
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                    {isActive && (
                      <span className="ml-auto text-xs text-primary-500 font-semibold">
                        Current
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Remove confirmation */}
      <ConfirmationSheet
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemove}
        title="Remove member?"
        description={`${removingMember?.profiles?.display_name ?? 'This member'} will be removed from the collective and lose access to chat and events.`}
        confirmLabel="Remove Member"
        variant="danger"
      />

      {/* Add member modal */}
      {showAddMember && (
        <AddMemberModal
          collectiveId={collectiveId}
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add member modal                                                   */
/* ------------------------------------------------------------------ */

function AddMemberModal({
  collectiveId,
  open,
  onClose,
}: {
  collectiveId: string
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<CollectiveRole>('member')
  const { data: results = [], isLoading } = useSearchUsers(query)
  const addMember = useAdminAddMember()

  const handleAdd = async (userId: string) => {
    try {
      await addMember.mutateAsync({
        collectiveId,
        userId,
        role: selectedRole,
      })
      toast.success('Member added')
      onClose()
    } catch {
      toast.error('Failed to add member')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <div className="space-y-4">
        <Input
          label="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
        />

        <div>
          <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">
            Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as CollectiveRole)}
            className={cn(
              'w-full rounded-xl bg-primary-50/50 px-3 py-2.5 text-sm text-primary-800',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
            )}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {isLoading ? (
              <Skeleton variant="list-item" count={3} />
            ) : results.length === 0 ? (
              <p className="text-sm text-primary-400 py-4 text-center">
                No users found for &quot;{query}&quot;
              </p>
            ) : (
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleAdd(user.id)}
                  disabled={addMember.isPending}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                    'hover:bg-primary-50 active:scale-[0.98] transition-all duration-150',
                    'cursor-pointer select-none',
                  )}
                >
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {user.display_name ?? 'Unknown'}
                    </p>
                    {user.instagram_handle && (
                      <p className="text-xs text-primary-400 truncate">@{user.instagram_handle}</p>
                    )}
                  </div>
                  <UserPlus size={16} className="text-primary-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Events tab                                                         */
/* ------------------------------------------------------------------ */

function EventsTab({ collectiveId }: { collectiveId: string }) {
  const { data: events = [], isLoading } = useAdminCollectiveEvents(collectiveId)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return events
    return events.filter((e) => e.status === statusFilter)
  }, [events, statusFilter])

  const statuses = ['all', 'published', 'completed', 'draft', 'cancelled']

  if (isLoading) return <Skeleton variant="list-item" count={5} />

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize',
              'transition-colors duration-150 cursor-pointer select-none',
              statusFilter === s
                ? 'bg-primary-100 text-primary-800'
                : 'bg-primary-50/60 text-primary-400 hover:text-primary-600',
            )}
          >
            {s} {s !== 'all' && `(${events.filter((e) => e.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Event list */}
      {filtered.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No events"
          description={statusFilter !== 'all' ? 'No events with this status' : 'This collective has no events yet'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((ev) => (
            <EventRow key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Settings tab                                                       */
/* ------------------------------------------------------------------ */

function SettingsTab({ collectiveId }: { collectiveId: string }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()

  const { data: detail } = useAdminCollectiveDetail(collectiveId)
  const updateCollective = useAdminUpdateCollective()
  const archiveCollective = useArchiveCollective()
  const deleteCollective = useDeleteCollective()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [state, setState] = useState('')
  const [slug, setSlug] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form when detail loads
  if (detail && !initialized) {
    setName(detail.name)
    setDescription(detail.description ?? '')
    setRegion(detail.region ?? '')
    setState(detail.state ?? '')
    setSlug(detail.slug)
    setInitialized(true)
  }

  const handleSave = async () => {
    try {
      await updateCollective.mutateAsync({
        collectiveId,
        updates: {
          name,
          description: description || null,
          region: region || null,
          state: state || null,
          slug: slug || undefined,
        },
      })
      toast.success('Collective updated')
    } catch {
      toast.error('Failed to update collective')
    }
  }

  const handleArchiveToggle = async () => {
    if (!detail) return
    try {
      await archiveCollective.mutateAsync({
        collectiveId,
        archive: detail.is_active,
      })
      toast.success(detail.is_active ? 'Collective archived' : 'Collective restored')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCollective.mutateAsync(collectiveId)
      toast.success('Collective permanently deleted')
      navigate('/admin/collectives')
    } catch {
      toast.error('Failed to delete collective')
    }
    setShowDeleteConfirm(false)
  }

  if (!detail) return <Skeleton variant="card" count={2} />

  return (
    <div className="space-y-6 max-w-xl">
      {/* Edit form */}
      <div className="rounded-2xl bg-white shadow-sm p-4 space-y-4">
        <h3 className="font-heading text-sm font-semibold text-primary-500 uppercase tracking-wider">
          Collective Details
        </h3>

        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="url-safe-name"
        />

        <div>
          <label className="block text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people what this collective is about..."
            rows={4}
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
            {AUSTRALIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          loading={updateCollective.isPending}
          disabled={!name.trim()}
        >
          Save Changes
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl shadow-sm bg-error-50/30 p-4 space-y-4">
        <h3 className="font-heading text-sm font-semibold text-error-600 uppercase tracking-wider">
          Danger Zone
        </h3>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary-800">
              {detail.is_active ? 'Archive Collective' : 'Restore Collective'}
            </p>
            <p className="text-xs text-primary-400 mt-0.5">
              {detail.is_active
                ? 'Hide this collective from members. Data is preserved.'
                : 'Make this collective active and visible again.'}
            </p>
          </div>
          <Button
            variant={detail.is_active ? 'danger' : 'primary'}
            size="sm"
            icon={detail.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}
            onClick={handleArchiveToggle}
            loading={archiveCollective.isPending}
          >
            {detail.is_active ? 'Archive' : 'Restore'}
          </Button>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center justify-between gap-4 pt-3">
            <div>
              <p className="text-sm font-medium text-error-700">
                Permanently Delete
              </p>
              <p className="text-xs text-error-500 mt-0.5">
                This will permanently delete the collective, all members, events, and impact data. This cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              icon={<AlertTriangle size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmationSheet
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Permanently delete collective?"
        description={`This will permanently delete "${detail.name}" and ALL associated data including members, events, and impact records. This action CANNOT be undone.`}
        confirmLabel="Delete Forever"
        variant="danger"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AdminCollectiveDetailPage() {
  const { collectiveId } = useParams<{ collectiveId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const { data: detail, isLoading } = useAdminCollectiveDetail(collectiveId)

  const actions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<ExternalLink size={14} />}
          onClick={() => navigate(`/collectives/${detail?.slug ?? collectiveId}`)}
        >
          View Public
        </Button>
      </div>
    ),
    [detail?.slug, collectiveId, navigate],
  )

  useAdminHeader(detail?.name ?? 'Collective', actions)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="card" />
        <Skeleton variant="list-item" count={5} />
      </div>
    )
  }

  if (!detail) {
    return (
      <EmptyState
        illustration="error"
        title="Collective not found"
        description="This collective may have been deleted"
        action={{ label: 'Back to Collectives', onClick: () => navigate('/admin/collectives') }}
      />
    )
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members' },
    { key: 'events', label: 'Events' },
    { key: 'settings', label: 'Settings' },
  ]

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div className="space-y-6" variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      {/* Back link */}
      <motion.div variants={fadeUp}>
      <button
        type="button"
        onClick={() => navigate('/admin/collectives')}
        className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-600 transition-colors cursor-pointer select-none"
      >
        <ArrowLeft size={16} />
        All Collectives
      </button>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-semibold',
              'transition-colors duration-150 cursor-pointer select-none',
              activeTab === tab.key
                ? 'text-primary-800'
                : 'text-primary-400 hover:text-primary-600',
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId={shouldReduceMotion ? undefined : 'admin-collective-tab'}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div variants={fadeUp}>
        {activeTab === 'overview' && <OverviewTab collectiveId={collectiveId!} />}
        {activeTab === 'members' && <MembersTab collectiveId={collectiveId!} />}
        {activeTab === 'events' && <EventsTab collectiveId={collectiveId!} />}
        {activeTab === 'settings' && <SettingsTab collectiveId={collectiveId!} />}
      </motion.div>
    </motion.div>
  )
}

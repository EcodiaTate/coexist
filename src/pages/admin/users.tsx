import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Users,
  Shield,
  Ban,
  Trash2,
  KeyRound,
  UserCog,
  Crown,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Toggle2 as ToggleIcon,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { SearchBar } from '@/components/search-bar'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { Modal } from '@/components/modal'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Avatar } from '@/components/avatar'
import { Toggle } from '@/components/toggle'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import {
  useUserCollectiveRoles,
  useAdminAssignCollectiveRole,
  useAdminRemoveFromCollective,
  useAdminUpdateCapabilities,
  useUserResolvedCapabilities,
} from '@/hooks/use-admin-user-roles'
import {
  CAPABILITIES,
  CATEGORY_LABELS,
  ROLE_DEFAULT_CAPS,
  type CapabilityDef,
} from '@/lib/capabilities'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']
type UserRole = Database['public']['Enums']['user_role']

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

function useAdminUsers(search: string, roleFilter: string) {
  return useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_users' as any, {
        search_term: search,
        role_filter: roleFilter || 'all',
        result_limit: 50,
      })
      if (error) throw error
      return (data ?? []) as any[]
    },
    staleTime: 30 * 1000,
  })
}

function useAllCollectives() {
  return useQuery({
    queryKey: ['admin-all-collectives-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('id, name, slug, state, region')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'participant', label: 'Participant' },
  { value: 'national_staff', label: 'National Staff' },
  { value: 'national_admin', label: 'National Admin' },
  { value: 'super_admin', label: 'Super Admin' },
]

const roleBadgeColors: Record<string, string> = {
  participant: 'bg-white text-primary-400',
  national_staff: 'bg-info-100 text-info-700',
  national_admin: 'bg-plum-100 text-plum-700',
  super_admin: 'bg-error-100 text-error-700',
}

const collectiveRoleOptions: { value: CollectiveRole; label: string }[] = [
  { value: 'leader', label: 'Leader' },
  { value: 'co_leader', label: 'Co-Leader' },
  { value: 'assist_leader', label: 'Assist Leader' },
  { value: 'member', label: 'Member' },
]

const COLLECTIVE_ROLE_ICONS: Record<CollectiveRole, typeof Crown> = {
  leader: Crown,
  co_leader: ShieldCheck,
  assist_leader: ShieldAlert,
  member: Users,
}

const COLLECTIVE_ROLE_COLORS: Record<CollectiveRole, string> = {
  leader: 'bg-warning-100 text-warning-700',
  co_leader: 'bg-primary-100 text-primary-700',
  assist_leader: 'bg-info-100 text-info-700',
  member: 'bg-neutral-100 text-neutral-600',
}

/* ------------------------------------------------------------------ */
/*  User Detail Sheet — collective roles + capabilities                */
/* ------------------------------------------------------------------ */

function UserDetailSheet({
  user,
  open,
  onClose,
}: {
  user: any
  open: boolean
  onClose: () => void
}) {
  const { isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: collectiveRoles, isLoading: rolesLoading } = useUserCollectiveRoles(user?.id)
  const { data: capsData, isLoading: capsLoading } = useUserResolvedCapabilities(user?.id)
  const { data: allCollectives } = useAllCollectives()

  const assignRole = useAdminAssignCollectiveRole()
  const removeFromCollective = useAdminRemoveFromCollective()
  const updateCaps = useAdminUpdateCapabilities()

  const [showAddCollective, setShowAddCollective] = useState(false)
  const [addCollectiveId, setAddCollectiveId] = useState('')
  const [addCollectiveRole, setAddCollectiveRole] = useState<CollectiveRole>('member')
  const [capsExpanded, setCapsExpanded] = useState(false)

  // Collectives the user is NOT already in (for adding)
  const availableCollectives = useMemo(() => {
    if (!allCollectives || !collectiveRoles) return []
    const existing = new Set(collectiveRoles.filter((r) => r.status === 'active').map((r) => r.collective_id))
    return allCollectives.filter((c) => !existing.has(c.id))
  }, [allCollectives, collectiveRoles])

  const isStaffRole = user?.role === 'national_staff' || user?.role === 'national_admin' || user?.role === 'super_admin'
  const userRole = (user?.role ?? 'participant') as UserRole

  // Group capabilities by category
  const capsByCategory = useMemo(() => {
    const grouped: Record<string, CapabilityDef[]> = {}
    for (const cap of CAPABILITIES) {
      if (!grouped[cap.category]) grouped[cap.category] = []
      grouped[cap.category].push(cap)
    }
    return grouped
  }, [])

  const handleToggleCap = useCallback(
    (capKey: string) => {
      if (!capsData || !user) return
      const currentOverrides = { ...capsData.overrides }
      const isDefault = ROLE_DEFAULT_CAPS[userRole].includes(capKey)
      const currentValue = capsData.capabilities.has(capKey)

      if (currentValue) {
        // Currently enabled → disable via override
        if (isDefault) {
          currentOverrides[capKey] = false
        } else {
          delete currentOverrides[capKey]
        }
      } else {
        // Currently disabled → enable via override
        if (!isDefault) {
          currentOverrides[capKey] = true
        } else {
          delete currentOverrides[capKey]
        }
      }

      updateCaps.mutate(
        { userId: user.id, permissions: currentOverrides },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-resolved-caps', user.id] })
            toast.success('Permissions updated')
          },
          onError: () => toast.error('Failed to update permissions'),
        },
      )
    },
    [capsData, user, userRole, updateCaps, queryClient, toast],
  )

  if (!user) return null

  return (
    <BottomSheet open={open} onClose={onClose} title={user.display_name ?? 'User Details'}>
      <div className="space-y-6 pb-6">
        {/* User header */}
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar_url} name={user.display_name ?? ''} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-primary-800 truncate">{user.display_name}</p>
            <p className="text-sm text-primary-400 truncate">{user.email}</p>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block', roleBadgeColors[user.role])}>
              {user.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Collective Roles Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-primary-800">Collective Roles</h3>
            <button
              type="button"
              onClick={() => setShowAddCollective(!showAddCollective)}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-600 cursor-pointer"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Add to collective form */}
          {showAddCollective && (
            <div className="mb-3 p-3 bg-primary-50/50 rounded-xl space-y-2">
              <Dropdown
                options={availableCollectives.map((c) => ({ value: c.id, label: `${c.name}${c.state ? ` (${c.state})` : ''}` }))}
                value={addCollectiveId}
                onChange={setAddCollectiveId}
                placeholder="Select collective..."
              />
              <Dropdown
                options={collectiveRoleOptions}
                value={addCollectiveRole}
                onChange={(v) => setAddCollectiveRole(v as CollectiveRole)}
                label="Role"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!addCollectiveId}
                  loading={assignRole.isPending}
                  onClick={() => {
                    if (!addCollectiveId) return
                    assignRole.mutate(
                      { userId: user.id, collectiveId: addCollectiveId, role: addCollectiveRole },
                      {
                        onSuccess: () => {
                          toast.success('Added to collective')
                          setShowAddCollective(false)
                          setAddCollectiveId('')
                          setAddCollectiveRole('member')
                        },
                        onError: () => toast.error('Failed to add to collective'),
                      },
                    )
                  }}
                >
                  Add
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddCollective(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {rolesLoading ? (
            <Skeleton variant="list-item" count={2} />
          ) : !collectiveRoles?.filter((r) => r.status === 'active').length ? (
            <p className="text-xs text-primary-400 py-2">Not a member of any collective</p>
          ) : (
            <div className="space-y-1.5">
              {collectiveRoles
                .filter((r) => r.status === 'active')
                .map((membership) => {
                  const Icon = COLLECTIVE_ROLE_ICONS[membership.role]
                  return (
                    <div
                      key={membership.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white shadow-sm"
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', COLLECTIVE_ROLE_COLORS[membership.role])}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-800 truncate">{membership.collective.name}</p>
                        <p className="text-[11px] text-primary-400">
                          {membership.role.replace('_', ' ')}
                          {membership.collective.state && ` · ${membership.collective.state}`}
                        </p>
                      </div>
                      {/* Role change dropdown */}
                      <Dropdown
                        options={collectiveRoleOptions}
                        value={membership.role}
                        onChange={(newRole) => {
                          assignRole.mutate(
                            { userId: user.id, collectiveId: membership.collective_id, role: newRole as CollectiveRole },
                            {
                              onSuccess: () => toast.success('Role updated'),
                              onError: () => toast.error('Failed to update role'),
                            },
                          )
                        }}
                        className="w-32 shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeFromCollective.mutate(
                            { userId: user.id, collectiveId: membership.collective_id },
                            {
                              onSuccess: () => toast.success('Removed from collective'),
                              onError: () => toast.error('Failed to remove'),
                            },
                          )
                        }
                        className="p-1 rounded text-primary-400 hover:text-error-500 cursor-pointer shrink-0"
                        title="Remove from collective"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Capabilities / Permissions Section — super_admin only */}
        {isSuperAdmin && isStaffRole && (
          <div>
            <button
              type="button"
              onClick={() => setCapsExpanded(!capsExpanded)}
              className="flex items-center justify-between w-full mb-2 cursor-pointer"
            >
              <h3 className="text-sm font-semibold text-primary-800">Permissions</h3>
              {capsExpanded ? <ChevronUp size={16} className="text-primary-400" /> : <ChevronDown size={16} className="text-primary-400" />}
            </button>

            {capsExpanded && (
              capsLoading ? (
                <Skeleton variant="list-item" count={4} />
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] text-primary-400">
                    Grey toggles are role defaults for <strong>{userRole.replace('_', ' ')}</strong>.
                    Override any capability below.
                  </p>
                  {Object.entries(capsByCategory).map(([category, caps]) => (
                    <div key={category}>
                      <p className="text-[10px] uppercase tracking-wider text-primary-400 mb-1.5">
                        {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                      </p>
                      <div className="space-y-1">
                        {caps.map((cap) => {
                          const isEnabled = capsData?.capabilities.has(cap.key) ?? false
                          const isDefault = ROLE_DEFAULT_CAPS[userRole].includes(cap.key)
                          const isOverridden = capsData?.overrides?.[cap.key] !== undefined
                          return (
                            <div
                              key={cap.key}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg',
                                isOverridden ? 'bg-primary-50/50' : 'bg-white',
                              )}
                            >
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm text-primary-800">{cap.label}</p>
                                  {isOverridden && (
                                    <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-primary-100 text-primary-600">
                                      override
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-primary-400">{cap.description}</p>
                              </div>
                              <Toggle
                                checked={isEnabled}
                                onChange={() => handleToggleCap(cap.key)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [detailUser, setDetailUser] = useState<any>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuth()
  const { toast } = useToast()

  const { data: users, isLoading } = useAdminUsers(search, roleFilter)

  useAdminHeader('User Management')

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if ((role === 'super_admin' || role === 'national_admin') && !isSuperAdmin) {
        throw new Error('Only super admins can assign admin roles')
      }
      const { error } = await supabase
        .from('profiles')
        .update({ role } as any)
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowRoleModal(false)
      setSelectedUser(null)
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: true, suspension_reason: reason })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowSuspendModal(false)
      setSelectedUser(null)
      setSuspendReason('')
      toast.success('User suspended')
    },
    onError: () => toast.error('Failed to suspend user'),
  })

  const unsuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: false, suspension_reason: null })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User unsuspended')
    },
    onError: () => toast.error('Failed to unsuspend user'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowDeleteConfirm(false)
      setSelectedUser(null)
      toast.success('User deleted')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    },
    onSuccess: () => toast.success('Password reset email sent'),
    onError: () => toast.error('Failed to send reset email'),
  })

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }, [])

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
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
          compact
          className="flex-1"
        />
        <Dropdown
          options={roleOptions}
          value={roleFilter}
          onChange={setRoleFilter}
          placeholder="All Roles"
          className="sm:w-52"
        />
      </motion.div>

      {/* Bulk actions */}
      {selectedUsers.size > 0 && (
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg">
          <span className="text-sm text-primary-400 font-medium">
            {selectedUsers.size} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<Ban size={14} />}
            onClick={async () => {
              for (const uid of selectedUsers) {
                await supabase.from('profiles').update({ is_suspended: true, suspension_reason: 'Bulk suspension by admin' }).eq('id', uid)
              }
              queryClient.invalidateQueries({ queryKey: ['admin-users'] })
              toast.success(`${selectedUsers.size} users suspended`)
              setSelectedUsers(new Set())
            }}
          >
            Suspend All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedUsers(new Set())}
          >
            Clear
          </Button>
        </motion.div>
      )}

      {/* User list */}
      <motion.div variants={fadeUp}>
      {isLoading ? (
        <Skeleton variant="list-item" count={8} />
      ) : !users?.length ? (
        <EmptyState
          illustration="search"
          title="No users found"
          description={search ? 'Try a different search term' : 'No users match the filter'}
        />
      ) : (
        <StaggeredList className="space-y-1">
          {users.map((user) => (
            <StaggeredItem
              key={user.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl',
                'bg-white shadow-sm',
                'hover:bg-primary-50 transition-colors duration-150',
                user.is_suspended && 'opacity-60 bg-error-50/50',
                selectedUsers.has(user.id) && 'ring-2 ring-primary-400',
              )}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedUsers.has(user.id)}
                onChange={() => toggleUserSelection(user.id)}
                className="w-4 h-4 rounded border-primary-200 text-primary-400 focus:ring-primary-500 cursor-pointer"
                aria-label={`Select ${user.display_name}`}
              />

              {/* Avatar + info — click to open detail sheet */}
              <button
                type="button"
                onClick={() => setDetailUser(user)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.display_name ?? ''}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {user.display_name ?? 'Unknown'}
                    </p>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                        roleBadgeColors[user.role] ?? roleBadgeColors.participant,
                      )}
                    >
                      {user.role?.replace('_', ' ')}
                    </span>
                    {user.is_suspended && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-error-100 text-error-700 shrink-0">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-400 truncate">{user.email}</p>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(user)
                    setNewRole(user.role)
                    setShowRoleModal(true)
                  }}
                  className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 hover:text-primary-400 cursor-pointer"
                  title="Change global role"
                  aria-label={`Change role for ${user.display_name}`}
                >
                  <UserCog size={16} />
                </button>

                {user.is_suspended ? (
                  <button
                    type="button"
                    onClick={() => unsuspendMutation.mutate(user.id)}
                    className="p-1.5 rounded-lg text-success-500 hover:bg-success-50 cursor-pointer"
                    title="Unsuspend"
                    aria-label={`Unsuspend ${user.display_name}`}
                  >
                    <Shield size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(user)
                      setShowSuspendModal(true)
                    }}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-warning-50 hover:text-warning-600 cursor-pointer"
                    title="Suspend"
                    aria-label={`Suspend ${user.display_name}`}
                  >
                    <Ban size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => user.email && resetPasswordMutation.mutate(user.email)}
                  className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 hover:text-primary-400 cursor-pointer"
                  title="Reset password"
                  aria-label={`Reset password for ${user.display_name}`}
                >
                  <KeyRound size={16} />
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(user)
                      setShowDeleteConfirm(true)
                    }}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                    title="Delete user"
                    aria-label={`Delete ${user.display_name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}
      </motion.div>

      {/* User detail sheet with collective roles + permissions */}
      <UserDetailSheet
        user={detailUser}
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
      />

      {/* Change global role modal */}
      <Modal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Change User Role"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-400">
            Changing global role for <strong>{selectedUser?.display_name}</strong>
          </p>
          <Dropdown
            options={roleOptions.filter((o) => o.value !== 'all')}
            value={newRole}
            onChange={setNewRole}
            label="New Role"
          />
          <Button
            variant="primary"
            fullWidth
            onClick={() =>
              selectedUser &&
              changeRoleMutation.mutate({ userId: selectedUser.id, role: newRole })
            }
            loading={changeRoleMutation.isPending}
          >
            Update Role
          </Button>
        </div>
      </Modal>

      {/* Suspend modal */}
      <Modal
        open={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend User"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-400">
            Suspending <strong>{selectedUser?.display_name}</strong>. They will see the
            suspension reason and can submit an appeal.
          </p>
          <Input
            type="textarea"
            label="Reason for suspension"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
            placeholder="Explain why this account is being suspended..."
          />
          <Button
            variant="danger"
            fullWidth
            onClick={() =>
              selectedUser &&
              suspendMutation.mutate({
                userId: selectedUser.id,
                reason: suspendReason,
              })
            }
            loading={suspendMutation.isPending}
            disabled={!suspendReason.trim()}
          >
            Suspend Account
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmationSheet
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
        title="Delete User Permanently"
        description="This will permanently delete this user's account and all associated data. This action cannot be undone (GDPR data removal)."
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </motion.div>
  )
}

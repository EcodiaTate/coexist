import { useState, useCallback, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { adminVariants, expandCollapse as expandCollapseVariants } from '@/lib/admin-motion'
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
    Plus,
    X,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    Sparkles,
    Settings,
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
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Avatar } from '@/components/avatar'
import { Toggle } from '@/components/toggle'
import { ProfileModal } from '@/components/profile-modal'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
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
      const { data, error } = await supabase.rpc('admin_list_users' as string & keyof never, {
        search_term: search,
        role_filter: roleFilter || 'all',
        result_limit: 50,
      })
      if (error) throw error
      return (data ?? []) as Record<string, unknown>[]
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
  participant: 'bg-primary-100 text-primary-500',
  national_staff: 'bg-info-200 text-info-800',
  national_admin: 'bg-plum-200 text-plum-800',
  super_admin: 'bg-error-200 text-error-800',
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
  leader: 'bg-warning-200 text-warning-800',
  co_leader: 'bg-primary-200 text-primary-800',
  assist_leader: 'bg-info-200 text-info-800',
  member: 'bg-neutral-200 text-neutral-700',
}

const COLLECTIVE_ROLE_SURFACE: Record<CollectiveRole, string> = {
  leader: 'bg-warning-50 ring-1 ring-warning-200/60',
  co_leader: 'bg-primary-50 ring-1 ring-primary-200/60',
  assist_leader: 'bg-info-50 ring-1 ring-info-200/60',
  member: 'bg-white ring-1 ring-primary-100/50',
}

/* ------------------------------------------------------------------ */
/*  Unified User Settings Sheet                                        */
/* ------------------------------------------------------------------ */

function UserSettingsSheet({
  user,
  open,
  onClose,
}: {
  user: Record<string, unknown>
  open: boolean
  onClose: () => void
}) {
  const { user: currentUser, isSuperAdmin } = useAuth()
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
  const [showSuspendForm, setShowSuspendForm] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [newRole, setNewRole] = useState('')
  const [showRoleChange, setShowRoleChange] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const availableCollectives = useMemo(() => {
    if (!allCollectives || !collectiveRoles) return []
    const existing = new Set(collectiveRoles.filter((r) => r.status === 'active').map((r) => r.collective_id))
    return allCollectives.filter((c) => !existing.has(c.id))
  }, [allCollectives, collectiveRoles])

  const isStaffRole = user?.role === 'national_staff' || user?.role === 'national_admin' || user?.role === 'super_admin'
  const userRole = (user?.role ?? 'participant') as UserRole

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
        if (isDefault) {
          currentOverrides[capKey] = false
        } else {
          delete currentOverrides[capKey]
        }
      } else {
        if (!isDefault) {
          currentOverrides[capKey] = true
        } else {
          delete currentOverrides[capKey]
        }
      }

      updateCaps.mutate(
        { userId: user.id, permissions: currentOverrides },
        {
          onSuccess: () => toast.success('Permissions updated'),
          onError: () => toast.error('Failed to update permissions'),
        },
      )
    },
    [capsData, user, userRole, updateCaps, toast],
  )

  /* ---- Optimistic cache helpers ---- */
  const patchUserInCache = useCallback(
    (userId: string, patch: Record<string, unknown>) => {
      queryClient.setQueriesData<Record<string, unknown>[]>({ queryKey: ['admin-users'] }, (old) =>
        old?.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
      )
    },
    [queryClient],
  )

  const removeUserFromCache = useCallback(
    (userId: string) => {
      queryClient.setQueriesData<Record<string, unknown>[]>({ queryKey: ['admin-users'] }, (old) =>
        old?.filter((u) => u.id !== userId),
      )
    },
    [queryClient],
  )

  /* ---- Mutations ---- */
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (userId === currentUser?.id) {
        throw new Error('You cannot change your own role')
      }
      if ((role === 'super_admin' || role === 'national_admin') && !isSuperAdmin) {
        throw new Error('Only super admins can assign admin roles')
      }
      const { error } = await supabase
        .from('profiles')
        .update({ role } as Record<string, unknown>)
        .eq('id', userId)
      if (error) throw error
      await logAudit({ action: 'role_changed', target_type: 'user', target_id: userId, details: { new_role: role } })
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] })
      const previous = queryClient.getQueriesData<Record<string, unknown>[]>({ queryKey: ['admin-users'] })
      patchUserInCache(userId, { role })
      setShowRoleChange(false)
      return { previous }
    },
    onSuccess: () => toast.success('Role updated'),
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key as unknown as string[], data))
      toast.error('Failed to update role')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      if (userId === currentUser?.id) {
        throw new Error('You cannot suspend your own account')
      }
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: true, suspended_reason: reason })
        .eq('id', userId)
      if (error) throw error
      await logAudit({ action: 'user_suspended', target_type: 'user', target_id: userId, details: { reason } })
    },
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] })
      const previous = queryClient.getQueriesData<Record<string, unknown>[]>({ queryKey: ['admin-users'] })
      patchUserInCache(userId, { is_suspended: true })
      setShowSuspendForm(false)
      setSuspendReason('')
      return { previous }
    },
    onSuccess: () => toast.success('User suspended'),
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key as unknown as string[], data))
      toast.error('Failed to suspend user')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const unsuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: false, suspended_reason: null })
        .eq('id', userId)
      if (error) throw error
      await logAudit({ action: 'user_unsuspended', target_type: 'user', target_id: userId })
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] })
      const previous = queryClient.getQueriesData<Record<string, unknown>[]>({ queryKey: ['admin-users'] })
      patchUserInCache(userId, { is_suspended: false })
      return { previous }
    },
    onSuccess: () => toast.success('User unsuspended'),
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key as unknown as string[], data))
      toast.error('Failed to unsuspend user')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === currentUser?.id) {
        throw new Error('You cannot delete your own account')
      }
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId } })
      if (error) throw error
      await logAudit({ action: 'user_deleted', target_type: 'user', target_id: userId })
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] })
      const previous = queryClient.getQueriesData<Record<string, unknown>[]>({ queryKey: ['admin-users'] })
      removeUserFromCache(userId)
      setShowDeleteConfirm(false)
      onClose()
      return { previous }
    },
    onSuccess: () => toast.success('User deleted'),
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key as unknown as string[], data))
      toast.error('Failed to delete user')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    },
    onMutate: () => {
      toast.success('Password reset email sent')
    },
    onError: () => toast.error('Failed to send reset email — check Supabase SMTP config'),
  })

  if (!user) return null

  const activeRoles = collectiveRoles?.filter((r) => r.status === 'active') ?? []
  const enabledCapsCount = capsData ? capsData.capabilities.size : 0

  return (
    <>
      <BottomSheet open={open} onClose={onClose} snapPoints={[0.92]}>
        <div className="space-y-5 pb-6">
          {/* User header */}
          <div className="flex items-center gap-4 p-4 -mx-1 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/60 ring-1 ring-primary-200/40">
            <Avatar src={user.avatar_url} name={user.display_name ?? ''} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-primary-900 truncate">{user.display_name}</p>
              <p className="text-sm text-primary-500 truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', roleBadgeColors[user.role])}>
                  {user.role?.replace(/_/g, ' ')}
                </span>
                {user.is_suspended && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-error-200 text-error-800">
                    Suspended
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions - touch-optimised row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => { setNewRole(user.role); setShowRoleChange(!showRoleChange) }}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl transition-colors active:scale-[0.97]',
                showRoleChange
                  ? 'bg-primary-200 ring-1 ring-primary-300/60'
                  : 'bg-primary-50 ring-1 ring-primary-200/40',
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-primary-200 text-primary-700 flex items-center justify-center shrink-0">
                <UserCog size={17} />
              </div>
              <span className="text-sm font-semibold text-primary-800">Change Role</span>
            </button>

            <button
              type="button"
              onClick={() => user.email && resetPasswordMutation.mutate(user.email)}
              disabled={resetPasswordMutation.isPending}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-primary-50 ring-1 ring-primary-200/40 transition-colors active:scale-[0.97]"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-200 text-primary-700 flex items-center justify-center shrink-0">
                <KeyRound size={17} />
              </div>
              <span className="text-sm font-semibold text-primary-800">Reset Password</span>
            </button>

            {user.is_suspended ? (
              <button
                type="button"
                onClick={() => unsuspendMutation.mutate(user.id)}
                disabled={unsuspendMutation.isPending}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-success-50 ring-1 ring-success-200/40 transition-colors active:scale-[0.97]"
              >
                <div className="w-9 h-9 rounded-lg bg-success-200 text-success-700 flex items-center justify-center shrink-0">
                  <Shield size={17} />
                </div>
                <span className="text-sm font-semibold text-success-800">Unsuspend</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSuspendForm(!showSuspendForm)}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl transition-colors active:scale-[0.97]',
                  showSuspendForm
                    ? 'bg-warning-200 ring-1 ring-warning-300/60'
                    : 'bg-warning-50 ring-1 ring-warning-200/40',
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-warning-200 text-warning-700 flex items-center justify-center shrink-0">
                  <Ban size={17} />
                </div>
                <span className="text-sm font-semibold text-warning-800">Suspend</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-error-50 ring-1 ring-error-200/40 transition-colors active:scale-[0.97]"
              >
                <div className="w-9 h-9 rounded-lg bg-error-200 text-error-700 flex items-center justify-center shrink-0">
                  <Trash2 size={17} />
                </div>
                <span className="text-sm font-semibold text-error-800">Delete User</span>
              </button>
            )}
          </div>

          {/* Inline role change form */}
          <AnimatePresence>
            {showRoleChange && (
              <motion.div
                variants={expandCollapseVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden"
              >
                <div className="p-3.5 bg-primary-50 rounded-xl ring-1 ring-primary-200/50 space-y-3">
                  <Dropdown
                    options={roleOptions.filter((o) => o.value !== 'all')}
                    value={newRole}
                    onChange={setNewRole}
                    label="New Role"
                  />
                  <Button
                    variant="primary"
                    fullWidth
                    className="h-12 text-base"
                    onClick={() => changeRoleMutation.mutate({ userId: user.id, role: newRole })}
                    loading={changeRoleMutation.isPending}
                  >
                    Update Role
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline suspend form */}
          <AnimatePresence>
            {showSuspendForm && !user.is_suspended && (
              <motion.div
                variants={expandCollapseVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden"
              >
                <div className="p-3.5 bg-error-50 rounded-xl ring-1 ring-error-200/40 space-y-3">
                  <p className="text-xs text-error-600">User will see the reason and can submit an appeal</p>
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
                    className="h-12 text-base"
                    onClick={() => suspendMutation.mutate({ userId: user.id, reason: suspendReason })}
                    loading={suspendMutation.isPending}
                    disabled={!suspendReason.trim()}
                  >
                    Suspend Account
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collective Roles Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-primary-900">Collective Roles</h3>
                {activeRoles.length > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-primary-200 text-primary-700">
                    {activeRoles.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAddCollective(!showAddCollective)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors active:scale-[0.97]',
                  showAddCollective
                    ? 'bg-primary-200 text-primary-800'
                    : 'bg-primary-100 text-primary-600',
                )}
              >
                {showAddCollective ? <X size={13} /> : <Plus size={13} />}
                {showAddCollective ? 'Cancel' : 'Add'}
              </button>
            </div>

            {/* Add to collective form */}
            <AnimatePresence>
              {showAddCollective && (
                <motion.div
                  variants={expandCollapseVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <div className="mb-3 p-3.5 bg-primary-50 rounded-xl ring-1 ring-primary-200/50 space-y-2.5">
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
                    <Button
                      variant="primary"
                      fullWidth
                      className="h-12 text-base"
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
                      Add to Collective
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {rolesLoading ? (
              <Skeleton variant="list-item" count={2} />
            ) : !activeRoles.length ? (
              <div className="py-4 px-3 rounded-xl bg-neutral-50 ring-1 ring-neutral-200/40 text-center">
                <Users size={20} className="text-neutral-400 mx-auto mb-1" />
                <p className="text-xs text-neutral-500">Not a member of any collective</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeRoles.map((membership) => {
                  const Icon = COLLECTIVE_ROLE_ICONS[membership.role]
                  return (
                    <motion.div
                      key={membership.id}
                      layout
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-colors duration-200',
                        COLLECTIVE_ROLE_SURFACE[membership.role],
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        COLLECTIVE_ROLE_COLORS[membership.role],
                      )}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-900 truncate">{membership.collective.name}</p>
                        <p className="text-[11px] text-primary-500">
                          {membership.role.replace(/_/g, ' ')}
                          {membership.collective.state && ` · ${membership.collective.state}`}
                        </p>
                      </div>
                      <Dropdown
                        options={collectiveRoleOptions}
                        value={membership.role}
                        onChange={(newCollectiveRole) => {
                          assignRole.mutate(
                            { userId: user.id, collectiveId: membership.collective_id, role: newCollectiveRole as CollectiveRole },
                            {
                              onSuccess: () => toast.success('Role updated'),
                              onError: () => toast.error('Failed to update role'),
                            },
                          )
                        }}
                        className="w-[7.5rem] shrink-0"
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
                        className="p-2.5 rounded-lg text-primary-400 active:bg-error-100 active:text-error-600 shrink-0 transition-colors"
                        title="Remove from collective"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Capabilities / Permissions Section - super_admin only */}
          {isSuperAdmin && isStaffRole && (
            <div>
              <button
                type="button"
                onClick={() => setCapsExpanded(!capsExpanded)}
                className={cn(
                  'flex items-center justify-between w-full p-3.5 rounded-xl transition-colors active:scale-[0.98]',
                  capsExpanded
                    ? 'bg-plum-100 ring-1 ring-plum-200/60'
                    : 'bg-plum-50 ring-1 ring-plum-200/40',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-plum-200 text-plum-700 flex items-center justify-center">
                    <Sparkles size={15} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-plum-900">Permissions</h3>
                    <p className="text-[11px] text-plum-600">
                      {enabledCapsCount} capabilities active
                    </p>
                  </div>
                </div>
                {capsExpanded
                  ? <ChevronUp size={16} className="text-plum-500" />
                  : <ChevronDown size={16} className="text-plum-500" />
                }
              </button>

              <AnimatePresence>
                {capsExpanded && (
                  <motion.div
                    variants={expandCollapseVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    {capsLoading ? (
                      <div className="mt-3">
                        <Skeleton variant="list-item" count={4} />
                      </div>
                    ) : (
                      <div className="mt-3 space-y-4">
                        <p className="text-[11px] text-primary-500 px-1">
                          Defaults from <strong className="text-primary-700">{userRole.replace(/_/g, ' ')}</strong> role.
                          Toggle to override.
                        </p>
                        {Object.entries(capsByCategory).map(([category, caps]) => (
                          <div key={category}>
                            <p className="text-[11px] uppercase tracking-wider font-bold text-primary-400 mb-2 px-1">
                              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                            </p>
                            <div className="rounded-xl overflow-hidden ring-1 ring-primary-100/60">
                              {caps.map((cap, i) => {
                                const isEnabled = capsData?.capabilities.has(cap.key) ?? false
                                const isDefault = ROLE_DEFAULT_CAPS[userRole].includes(cap.key)
                                const isOverridden = capsData?.overrides?.[cap.key] !== undefined
                                return (
                                  <div
                                    key={cap.key}
                                    className={cn(
                                      'flex items-center justify-between px-3.5 py-3',
                                      i > 0 && 'border-t border-primary-100/40',
                                      isOverridden
                                        ? isEnabled ? 'bg-success-50/60' : 'bg-error-50/40'
                                        : 'bg-white',
                                    )}
                                  >
                                    <div className="flex-1 min-w-0 mr-3">
                                      <div className="flex items-center gap-1.5">
                                        {isEnabled ? (
                                          <CheckCircle size={13} className="text-success-500 shrink-0" />
                                        ) : (
                                          <XCircle size={13} className="text-neutral-300 shrink-0" />
                                        )}
                                        <p className={cn('text-sm', isEnabled ? 'text-primary-800 font-medium' : 'text-primary-500')}>
                                          {cap.label}
                                        </p>
                                        {isOverridden && (
                                          <span className={cn(
                                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                                            isEnabled ? 'bg-success-200 text-success-800' : 'bg-error-200 text-error-700',
                                          )}>
                                            {isEnabled ? 'granted' : 'revoked'}
                                          </span>
                                        )}
                                        {!isOverridden && isDefault && (
                                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-500">
                                            default
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-primary-400 ml-[21px]">{cap.description}</p>
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
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Delete confirmation */}
      <ConfirmationSheet
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate(user.id)}
        title="Delete User Permanently"
        description="This will permanently delete this user's account and all associated data. This action cannot be undone (GDPR data removal)."
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [settingsUser, setSettingsUser] = useState<Record<string, unknown> | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: users, isLoading } = useAdminUsers(search, roleFilter)
  const showLoading = useDelayedLoading(isLoading)
  useAdminHeader('User Management')

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }, [])

  const shouldReduceMotion = useReducedMotion()

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible">
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
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-4 p-3 bg-primary-100 rounded-xl ring-1 ring-primary-200/60">
          <span className="text-sm text-primary-700 font-semibold">
            {selectedUsers.size} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<Ban size={14} />}
            onClick={async () => {
              for (const uid of selectedUsers) {
                await supabase.from('profiles').update({ is_suspended: true, suspended_reason: 'Bulk suspension by admin' }).eq('id', uid)
                await logAudit({ action: 'user_suspended', target_type: 'user', target_id: uid, details: { reason: 'Bulk suspension by admin' } })
              }
              queryClient.invalidateQueries({ queryKey: ['admin-users'] })
              toast.success(`${selectedUsers.size} users suspended`)
              setSelectedUsers(new Set())
            }}
          >
            Suspend All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedUsers(new Set())}>Clear</Button>
        </motion.div>
      )}

      {/* User list */}
      <motion.div variants={fadeUp}>
      {showLoading ? (
        <Skeleton variant="list-item" count={8} />
      ) : !users?.length ? (
        <EmptyState
          illustration="search"
          title="No users found"
          description={search ? 'Try a different search term' : 'No users match the filter'}
        />
      ) : (
        <StaggeredList className="space-y-1.5">
          {users.map((user) => (
            <StaggeredItem
              key={user.id}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl',
                'transition-colors duration-200',
                user.is_suspended
                  ? 'bg-error-50 ring-1 ring-error-200/60 opacity-70'
                  : 'bg-gradient-to-r from-primary-50 to-moss-50/60 ring-1 ring-primary-200/50 shadow-sm',
                selectedUsers.has(user.id) && 'ring-2 ring-primary-500 shadow-md',
              )}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedUsers.has(user.id)}
                onChange={() => toggleUserSelection(user.id)}
                className="w-5 h-5 rounded border-primary-200 text-primary-600 focus:ring-primary-500"
                aria-label={`Select ${user.display_name}`}
              />

              {/* Avatar + info — tappable to open profile */}
              <button
                type="button"
                onClick={() => setProfileUserId(user.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity cursor-pointer"
              >
                <Avatar src={user.avatar_url} name={user.display_name ?? ''} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-primary-900 truncate">
                      {user.display_name ?? 'Unknown'}
                    </p>
                    <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', roleBadgeColors[user.role] ?? roleBadgeColors.participant)}>
                      {user.role?.replace(/_/g, ' ')}
                    </span>
                    {user.is_suspended && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-error-200 text-error-800 shrink-0">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-500 truncate">{user.email}</p>
                </div>
              </button>

              {/* Single settings button */}
              <button
                type="button"
                onClick={() => setSettingsUser(user)}
                className="p-2.5 rounded-xl bg-primary-50 text-primary-500 active:bg-primary-200 active:text-primary-700 transition-colors shrink-0"
                title="User settings"
              >
                <Settings size={18} />
              </button>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}
      </motion.div>

      {/* Unified user settings sheet */}
      <UserSettingsSheet user={settingsUser} open={!!settingsUser} onClose={() => setSettingsUser(null)} />

      {/* Profile detail modal */}
      <ProfileModal userId={profileUserId} open={!!profileUserId} onClose={() => setProfileUserId(null)} />
    </motion.div>
  )
}

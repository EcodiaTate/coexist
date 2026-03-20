import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Shield,
  Ban,
  Trash2,
  KeyRound,
  ChevronRight,
  MoreVertical,
  UserCog,
  Eye,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { SearchBar } from '@/components/search-bar'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { Modal } from '@/components/modal'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Avatar } from '@/components/avatar'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

function useAdminUsers(search: string, roleFilter: string) {
  return useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url, role, is_suspended, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (search) {
        // Escape special PostgREST/SQL characters to prevent filter injection
        const escaped = search.replace(/[%_\\,().]/g, '\\$&')
        query = query.or(`display_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
      }

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
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
  national_staff: 'bg-blue-100 text-blue-700',
  national_admin: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-red-100 text-red-700',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
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

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Only super_admins can assign super_admin or national_admin roles
      if ((role === 'super_admin' || role === 'national_admin') && !isSuperAdmin) {
        throw new Error('Only super admins can assign admin roles')
      }
      const { error } = await supabase
        .from('profiles')
        .update({ role })
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
      // Call edge function for GDPR-compliant deletion
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

  return (
    <AdminLayout title="User Management">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email..."
            compact
          />
        </div>
        <Dropdown
          options={roleOptions}
          value={roleFilter}
          onChange={setRoleFilter}
          label="Role"
          className="w-48"
        />
      </div>

      {/* Bulk actions */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg">
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
        </div>
      )}

      {/* User list */}
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
                'bg-white border border-primary-100',
                'hover:bg-primary-50 transition-colors duration-150',
                user.is_suspended && 'opacity-60 bg-red-50/50',
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

              {/* Avatar + info */}
              <Link
                to={`/profile/${user.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
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
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-400 truncate">{user.email}</p>
                </div>
              </Link>

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
                  title="Change role"
                  aria-label={`Change role for ${user.display_name}`}
                >
                  <UserCog size={16} />
                </button>

                {user.is_suspended ? (
                  <button
                    type="button"
                    onClick={() => unsuspendMutation.mutate(user.id)}
                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 cursor-pointer"
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
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
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
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
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

      {/* Change role modal */}
      <Modal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Change User Role"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-400">
            Changing role for <strong>{selectedUser?.display_name}</strong>
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
    </AdminLayout>
  )
}

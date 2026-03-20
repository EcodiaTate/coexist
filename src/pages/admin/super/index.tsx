import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Shield,
  Plus,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  UserCog,
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
import { Avatar } from '@/components/avatar'
import { TabBar } from '@/components/tab-bar'
import { Toggle } from '@/components/toggle'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Permission types                                                   */
/* ------------------------------------------------------------------ */

const PERMISSIONS = [
  { key: 'manage_users', label: 'Manage Users', description: 'View/edit/deactivate user profiles and roles' },
  { key: 'manage_collectives', label: 'Manage Collectives', description: 'Create/archive/reassign collectives' },
  { key: 'manage_content', label: 'Manage Content', description: 'Moderate posts, photos, chat messages' },
  { key: 'manage_merch', label: 'Manage Merch', description: 'Product CRUD, inventory, orders' },
  { key: 'manage_finances', label: 'Manage Finances', description: 'View donations, refunds, financial reports' },
  { key: 'send_announcements', label: 'Send Announcements', description: 'Create/publish global announcements' },
] as const

type PermissionKey = typeof PERMISSIONS[number]['key']

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */

function useStaffDirectory() {
  return useQuery({
    queryKey: ['admin-staff-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role')
        .in('role', ['national_staff', 'national_admin', 'super_admin'])
        .order('role')

      if (error) throw error

      // Get permissions for each staff member
      const enriched = await Promise.all(
        ((data ?? []) as any[]).map(async (staff: any) => {
          const { data: perms } = await supabase
            .from('staff_roles' as any)
            .select('permissions')
            .eq('user_id', staff.id)
            .single()

          return {
            ...staff,
            permissions: ((perms as any)?.permissions as Record<string, boolean>) ?? {},
          }
        }),
      )

      return enriched
    },
    staleTime: 60 * 1000,
  })
}

const tabs = [
  { id: 'directory', label: 'Staff Directory', icon: <Users size={14} /> },
  { id: 'permissions', label: 'Permission Audit', icon: <Shield size={14} /> },
  { id: 'impersonate', label: 'View as User', icon: <Eye size={14} /> },
]

const roleBadgeColors: Record<string, string> = {
  national_staff: 'bg-info-100 text-info-700',
  national_admin: 'bg-plum-100 text-plum-700',
  super_admin: 'bg-error-100 text-error-700',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState('directory')
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showEditPerms, setShowEditPerms] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [addStaffEmail, setAddStaffEmail] = useState('')
  const [addStaffRole, setAddStaffRole] = useState('national_staff')
  const [impersonateEmail, setImpersonateEmail] = useState('')
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({})

  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuth()
  const { data: staff, isLoading } = useStaffDirectory()

  useAdminHeader('Super Admin')

  const addStaffMutation = useMutation({
    mutationFn: async () => {
      // Find user by email
      const { data: user, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', addStaffEmail)
        .single()
      if (findError || !user) throw new Error('User not found')

      // Update role
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: addStaffRole } as any)
        .eq('id', user.id)
      if (roleError) throw roleError

      // Create staff_roles entry
      const { error: permsError } = await supabase.from('staff_roles' as any).upsert({
        user_id: user.id,
        permissions: {},
      } as any, { onConflict: 'user_id' } as any)
      if (permsError) throw permsError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-directory'] })
      setShowAddStaff(false)
      setAddStaffEmail('')
      setAddStaffRole('national_staff')
    },
  })

  const removeStaffMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('profiles').update({ role: 'participant' }).eq('id', userId)
      await supabase.from('staff_roles' as any).delete().eq('user_id', userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-directory'] })
      setRemoveTarget(null)
    },
  })

  const updatePermsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: Record<string, boolean> }) => {
      const { error } = await supabase
        .from('staff_roles' as any)
        .upsert({ user_id: userId, permissions } as any, { onConflict: 'user_id' } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-directory'] })
      setShowEditPerms(false)
      setSelectedStaff(null)
    },
  })

  const impersonateMutation = useMutation({
    mutationFn: async (email: string) => {
      // Log the impersonation action
      const { data: user } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('email', email)
        .single()
      if (!user) throw new Error('User not found')

      await supabase.from('audit_log' as any).insert({
        action: 'impersonation_started',
        target_type: 'user',
        target_id: user.id,
        details: { message: `Viewing as ${user.display_name} (${email}) - read-only mode` },
      } as any)

      return user
    },
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
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
      </motion.div>

      {/* Staff Directory */}
      {activeTab === 'directory' && (
        <motion.div variants={fadeUp}>
          <div className="flex justify-end mb-4">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowAddStaff(true)}
            >
              Add Staff
            </Button>
          </div>

          {isLoading ? (
            <Skeleton variant="list-item" count={5} />
          ) : !staff?.length ? (
            <EmptyState
              illustration="empty"
              title="No staff members"
              description="Add staff to manage the platform"
              action={{ label: 'Add Staff', onClick: () => setShowAddStaff(true) }}
            />
          ) : (
            <StaggeredList className="space-y-2">
              {staff.map((member: any) => (
                <StaggeredItem
                  key={member.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm"
                >
                  <Avatar
                    src={member.avatar_url}
                    name={member.display_name ?? ''}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-800 truncate">
                        {member.display_name ?? 'Unknown'}
                      </p>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                          roleBadgeColors[member.role] ?? 'bg-white text-primary-400',
                        )}
                      >
                        {member.role?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {member.phone && <p className="text-xs text-primary-400 truncate">{member.phone}</p>}
                    {/* Permission badges */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {PERMISSIONS.filter((p) => member.permissions[p.key]).map((p) => (
                        <span
                          key={p.key}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white text-primary-400"
                        >
                          {p.label}
                        </span>
                      ))}
                      {Object.keys(member.permissions).length === 0 && (
                        <span className="text-[9px] text-primary-400">No specific permissions</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaff(member)
                        setEditPerms(member.permissions)
                        setShowEditPerms(true)
                      }}
                      className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 hover:text-primary-400 cursor-pointer"
                      title="Edit permissions"
                      aria-label={`Edit permissions for ${member.display_name}`}
                    >
                      <UserCog size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(member.id)}
                      className="p-1.5 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                      title="Remove staff access"
                      aria-label={`Remove ${member.display_name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </motion.div>
      )}

      {/* Permission Audit */}
      {activeTab === 'permissions' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-100/40">
                <th className="text-left py-3 px-3 text-primary-400 font-medium">Staff Member</th>
                {PERMISSIONS.map((p) => (
                  <th
                    key={p.key}
                    className="text-center py-3 px-2 text-primary-400 font-medium text-xs"
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(staff ?? []).map((member: any) => (
                <tr key={member.id} className="border-b border-primary-100/40 hover:bg-primary-50">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={member.avatar_url} name={member.display_name ?? ''} size="sm" />
                      <span className="text-primary-800 truncate">{member.display_name}</span>
                    </div>
                  </td>
                  {PERMISSIONS.map((p) => (
                    <td key={p.key} className="text-center py-2.5 px-2">
                      {member.permissions[p.key] ? (
                        <CheckCircle size={16} className="text-success-500 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-primary-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View as User (Impersonation) */}
      {activeTab === 'impersonate' && (
        <div className="max-w-md space-y-4">
          <div className="p-4 rounded-xl bg-warning-50 shadow-sm">
            <div className="flex items-start gap-3">
              <Eye size={18} className="text-warning-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-warning-900">
                  View as User - Read Only
                </h3>
                <p className="text-xs text-warning-700 mt-1">
                  This feature allows you to see the app as a specific user would see it.
                  All actions are read-only and the impersonation is logged in the audit trail.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="User Email"
            type="email"
            value={impersonateEmail}
            onChange={(e) => setImpersonateEmail(e.target.value)}
            placeholder="user@example.com"
          />

          <Button
            variant="secondary"
            icon={<Eye size={16} />}
            onClick={() => impersonateMutation.mutate(impersonateEmail)}
            loading={impersonateMutation.isPending}
            disabled={!impersonateEmail.trim()}
          >
            View as User
          </Button>

          {impersonateMutation.isSuccess && (
            <div className="p-3 rounded-lg bg-success-50 shadow-sm">
              <p className="text-sm text-success-700">
                Impersonation logged. In production, this would switch the view to show
                the app from the perspective of{' '}
                <strong>{(impersonateMutation.data as any)?.display_name}</strong>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add staff modal */}
      <Modal
        open={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        title="Add Staff Member"
      >
        <div className="space-y-4">
          <Input
            label="User Email"
            type="email"
            value={addStaffEmail}
            onChange={(e) => setAddStaffEmail(e.target.value)}
            required
            placeholder="Find existing user by email"
          />
          <Dropdown
            options={[
              { value: 'national_staff', label: 'National Staff' },
              { value: 'national_admin', label: 'National Admin' },
            ]}
            value={addStaffRole}
            onChange={setAddStaffRole}
            label="Role"
          />
          <Button
            variant="primary"
            fullWidth
            onClick={() => addStaffMutation.mutate()}
            loading={addStaffMutation.isPending}
            disabled={!addStaffEmail.trim()}
          >
            Add Staff Member
          </Button>
          {addStaffMutation.isError && (
            <p className="text-xs text-error">
              {(addStaffMutation.error as Error).message}
            </p>
          )}
        </div>
      </Modal>

      {/* Edit permissions modal */}
      <Modal
        open={showEditPerms}
        onClose={() => setShowEditPerms(false)}
        title="Edit Permissions"
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-primary-400 mb-4">
            Permissions for <strong>{selectedStaff?.display_name}</strong>
          </p>
          {PERMISSIONS.map((perm) => (
            <Toggle
              key={perm.key}
              checked={editPerms[perm.key] ?? false}
              onChange={(v) => setEditPerms((p) => ({ ...p, [perm.key]: v }))}
              label={perm.label}
              description={perm.description}
            />
          ))}
          <Button
            variant="primary"
            fullWidth
            className="mt-4"
            onClick={() =>
              selectedStaff &&
              updatePermsMutation.mutate({
                userId: selectedStaff.id,
                permissions: editPerms,
              })
            }
            loading={updatePermsMutation.isPending}
          >
            Save Permissions
          </Button>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <ConfirmationSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeStaffMutation.mutate(removeTarget)}
        title="Remove Staff Access"
        description="This will revoke their staff role and all permissions. They will become a regular participant."
        confirmLabel="Remove Access"
        variant="danger"
      />
    </motion.div>
  )
}

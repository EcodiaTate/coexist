import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveCapabilities } from '@/lib/capabilities'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']
type UserRole = Database['public']['Enums']['user_role']

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UserCollectiveRole {
  id: string
  collective_id: string
  role: CollectiveRole
  status: string
  joined_at: string
  collective: {
    id: string
    name: string
    slug: string
    state: string | null
    region: string | null
  }
}

/* ------------------------------------------------------------------ */
/*  useUserCollectiveRoles — all collective memberships for a user     */
/* ------------------------------------------------------------------ */

export function useUserCollectiveRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin-user-collective-roles', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('collective_members')
        .select('id, collective_id, role, status, joined_at, collectives(id, name, slug, state, region)')
        .eq('user_id', userId)
        .order('role', { ascending: false })

      if (error) throw error
      return (data ?? []).map((row: any) => ({
        id: row.id,
        collective_id: row.collective_id,
        role: row.role as CollectiveRole,
        status: row.status,
        joined_at: row.joined_at,
        collective: row.collectives,
      })) as UserCollectiveRole[]
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  useAdminAssignCollectiveRole — add/update user collective role     */
/* ------------------------------------------------------------------ */

export function useAdminAssignCollectiveRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      collectiveId,
      role,
    }: {
      userId: string
      collectiveId: string
      role: CollectiveRole
    }) => {
      const { error } = await supabase
        .from('collective_members')
        .upsert(
          {
            user_id: userId,
            collective_id: collectiveId,
            role,
            status: 'active',
          },
          { onConflict: 'collective_id,user_id' },
        )
      if (error) throw error

      // If promoting to leader, also update collectives.leader_id
      if (role === 'leader') {
        await supabase
          .from('collectives')
          .update({ leader_id: userId })
          .eq('id', collectiveId)
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-collective-roles', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-members'] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useAdminRemoveFromCollective — remove user from collective         */
/* ------------------------------------------------------------------ */

export function useAdminRemoveFromCollective() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      collectiveId,
    }: {
      userId: string
      collectiveId: string
    }) => {
      const { error } = await supabase
        .from('collective_members')
        .update({ status: 'removed' })
        .eq('user_id', userId)
        .eq('collective_id', collectiveId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-collective-roles', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-members'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useAdminUpdateCapabilities — update staff_roles.permissions        */
/* ------------------------------------------------------------------ */

export function useAdminUpdateCapabilities() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string
      permissions: Record<string, boolean>
    }) => {
      // Upsert into staff_roles
      const { error } = await supabase
        .from('staff_roles' as any)
        .upsert(
          {
            user_id: userId,
            permissions,
          },
          { onConflict: 'user_id' },
        )
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-capabilities', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['staff-permissions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-staff-directory'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useUserResolvedCapabilities — fetch and resolve caps for any user  */
/* ------------------------------------------------------------------ */

export function useUserResolvedCapabilities(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin-user-resolved-caps', userId],
    queryFn: async () => {
      if (!userId) return { role: 'participant' as UserRole, overrides: {} as Record<string, boolean>, capabilities: new Set<string>() }

      const [profileRes, staffRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', userId).single(),
        supabase.from('staff_roles' as any).select('permissions').eq('user_id', userId).maybeSingle(),
      ])

      const role = (profileRes.data?.role ?? 'participant') as UserRole
      const overrides = ((staffRes.data as any)?.permissions as Record<string, boolean>) ?? {}
      const capabilities = resolveCapabilities(role, overrides)

      return { role, overrides, capabilities }
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

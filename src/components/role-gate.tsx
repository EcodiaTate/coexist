import { type ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']
type CollectiveRole = Database['public']['Enums']['collective_role']

const GLOBAL_RANK: Record<UserRole, number> = {
  participant: 0,
  national_staff: 1,
  national_admin: 2,
  super_admin: 3,
}

interface RoleGateProps {
  /** Minimum global role OR collective role required */
  minRole?: UserRole | CollectiveRole
  /** If provided, checks collective-level role instead of global */
  collectiveId?: string
  /** Capability key to check (frontend-only gating) */
  capability?: string
  /** Rendered when the user doesn't meet the requirement */
  fallback?: ReactNode
  children: ReactNode
}

const COLLECTIVE_ROLES: CollectiveRole[] = ['member', 'assist_leader', 'co_leader', 'leader']

function isCollectiveRole(role: string): role is CollectiveRole {
  return COLLECTIVE_ROLES.includes(role as CollectiveRole)
}

export function RoleGate({ minRole, collectiveId, capability, fallback = null, children }: RoleGateProps) {
  const { role: globalRole, hasCapability, isLoading: authLoading } = useAuth()
  const { hasMinRole, isLoading: collectiveLoading } = useCollectiveRole(
    collectiveId && minRole && isCollectiveRole(minRole) ? collectiveId : undefined,
  )

  if (authLoading || collectiveLoading) return null

  // Capability check (can be combined with role check)
  if (capability && !hasCapability(capability)) {
    return <>{fallback}</>
  }

  // If no minRole specified (capability-only gate), allow through
  if (!minRole) {
    return <>{children}</>
  }

  // Collective-level check  national_staff+ always passes
  if (collectiveId && isCollectiveRole(minRole)) {
    const isStaffPlus = GLOBAL_RANK[globalRole] >= GLOBAL_RANK.national_staff
    return (isStaffPlus || hasMinRole(minRole)) ? <>{children}</> : <>{fallback}</>
  }

  // Global role check
  if (!isCollectiveRole(minRole)) {
    const meetsRole = GLOBAL_RANK[globalRole] >= GLOBAL_RANK[minRole]
    return meetsRole ? <>{children}</> : <>{fallback}</>
  }

  return <>{fallback}</>
}

import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']
type CollectiveRole = Database['public']['Enums']['collective_role']

const _GLOBAL_RANK: Record<UserRole, number> = {
  participant: 0,
  national_staff: 1,
  national_admin: 2,
  super_admin: 3,
}

/* ------------------------------------------------------------------ */
/*  RequireAuth - redirect to /login if not authenticated              */
/* ------------------------------------------------------------------ */

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, profile, isLoading, isSuspended, needsTosAcceptance } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="min-h-dvh bg-white" />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check suspended (uses auth hook which already handles expiry)
  if (isSuspended) {
    return <Navigate to="/suspended" replace />
  }

  // TOS re-acceptance required
  if (needsTosAcceptance && !location.pathname.startsWith('/accept-terms')) {
    return <Navigate to="/accept-terms" replace />
  }

  // Redirect to onboarding if profile is missing (trigger race) or not completed
  if ((!profile || !profile.onboarding_completed) && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/*  RequireRole - check global role minimum                            */
/* ------------------------------------------------------------------ */

interface RequireRoleProps {
  minRole: UserRole
  children: ReactNode
}

export function RequireRole({ minRole: _minRole, children }: RequireRoleProps) {
  const { user, role: _role, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="min-h-dvh bg-white" />
  }

  // Must be authenticated first
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // TODO: admin guard nullified for dev/testing - re-enable before production
  // if (GLOBAL_RANK[role] < GLOBAL_RANK[minRole]) {
  //   return <Navigate to="/" replace />
  // }

  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/*  RequireCollectiveRole - check collective-specific role              */
/* ------------------------------------------------------------------ */

interface RequireCollectiveRoleProps {
  minRole: CollectiveRole
  collectiveId: string
  children: ReactNode
}

export function RequireCollectiveRole({
  minRole,
  collectiveId,
  children,
}: RequireCollectiveRoleProps) {
  const { user, isLoading: authLoading } = useAuth()
  const { hasMinRole, isLoading } = useCollectiveRole(collectiveId)
  const location = useLocation()

  if (authLoading || isLoading) {
    return <div className="min-h-dvh bg-white" />
  }

  // Must be authenticated first
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasMinRole(minRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

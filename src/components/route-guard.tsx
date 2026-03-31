import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import type { Database } from '@/types/database.types'
import { GLOBAL_ROLE_RANK as _GLOBAL_RANK } from '@/lib/constants'

type UserRole = Database['public']['Enums']['user_role']
type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Shared loading spinner for all guard components                    */
/* ------------------------------------------------------------------ */

function GuardSpinner() {
  return (
    <div className="min-h-dvh bg-white flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  RequireAuth - redirect to /login if not authenticated              */
/* ------------------------------------------------------------------ */

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, profile, isLoading, isSuspended, needsTosAcceptance, onboardingDone } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <GuardSpinner />
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

  // Profile not loaded yet - wait rather than flashing onboarding.
  // The auth hook's loadUserData handles retry + profile creation,
  // so the profile will always arrive. If we already know onboarding
  // is done (local flag), skip the wait and render children immediately.
  if (!profile && !onboardingDone) {
    return <GuardSpinner />
  }

  // Redirect to onboarding ONLY if:
  // 1. Profile explicitly says not completed, AND
  // 2. The persistent local flag is not set (prevents re-onboarding on fetch failures)
  const onboardingPaths = ['/onboarding', '/leader-welcome', '/welcome-back']
  const isOnboardingPath = onboardingPaths.some((p) => location.pathname.startsWith(p))
  if (!onboardingDone && (!profile || !profile.onboarding_completed) && !isOnboardingPath) {
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

export function RequireRole({ minRole, children }: RequireRoleProps) {
  const { user, role, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <GuardSpinner />
  }

  // Must be authenticated first
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (_GLOBAL_RANK[role] < _GLOBAL_RANK[minRole]) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/*  RequireLeaderAccess - collective leader roles OR national staff+    */
/* ------------------------------------------------------------------ */

const _LEADER_ROLES: CollectiveRole[] = ['assist_leader', 'co_leader', 'leader']

interface RequireLeaderAccessProps {
  children: ReactNode
}

/**
 * Grants access if the user holds assist_leader / co_leader / leader
 * in any collective, OR has a global role of national_leader or above,
 * OR is a manager with managed_collectives assigned.
 */
export function RequireLeaderAccess({ children }: RequireLeaderAccessProps) {
  const { user, role, collectiveRoles, managedCollectiveIds, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <GuardSpinner />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // National staff and above always have access
  const isStaffPlus = _GLOBAL_RANK[role] >= _GLOBAL_RANK.national_leader

  // Managers with assigned collectives can access the leader suite
  const isManagerWithCollectives = _GLOBAL_RANK[role] >= _GLOBAL_RANK.manager && managedCollectiveIds.length > 0

  // Check if user holds a qualifying collective role
  const hasLeaderRole = collectiveRoles.some((m) => _LEADER_ROLES.includes(m.role as CollectiveRole))

  if (!isStaffPlus && !isManagerWithCollectives && !hasLeaderRole) {
    return <Navigate to="/" replace />
  }

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

/* ------------------------------------------------------------------ */
/*  RequireCapability - check frontend capability                      */
/* ------------------------------------------------------------------ */

interface RequireCapabilityProps {
  cap: string
  children: ReactNode
}

export function RequireCapability({ cap, children }: RequireCapabilityProps) {
  const { user, hasCapability, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <GuardSpinner />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasCapability(cap)) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/*  RequireCollectiveRole - check collective-specific role              */
/* ------------------------------------------------------------------ */

export function RequireCollectiveRole({
  minRole,
  collectiveId,
  children,
}: RequireCollectiveRoleProps) {
  const { user, role, isLoading: authLoading } = useAuth()
  const { hasMinRole, isLoading } = useCollectiveRole(collectiveId)
  const location = useLocation()

  if (authLoading || isLoading) {
    return <GuardSpinner />
  }

  // Must be authenticated first
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // National staff+ always have access to collective-scoped routes
  const isStaffPlus = _GLOBAL_RANK[role] >= _GLOBAL_RANK.national_leader

  if (!isStaffPlus && !hasMinRole(minRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

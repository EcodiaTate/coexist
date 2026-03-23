import { type ReactNode, useState, useEffect, startTransition } from 'react'
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
  const { user, profile, isLoading, isSuspended, needsTosAcceptance, onboardingDone } = useAuth()
  const location = useLocation()

  // Safety timeout: if we have a user but profile never arrives,
  // don't hang on a blank screen forever - show the app anyway
  // (onboardingDone flag will prevent false onboarding redirect).
  const [profileTimeout, setProfileTimeout] = useState(false)
  useEffect(() => {
    if (profile || !user) {
      startTransition(() => setProfileTimeout(false))
      return
    }
    const timer = setTimeout(() => startTransition(() => setProfileTimeout(true)), 8000)
    return () => clearTimeout(timer)
  }, [profile, user])

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

  // Profile not loaded yet - wait rather than flashing onboarding.
  // If we already know onboarding is done (local flag), skip the wait
  // and render children immediately.
  if (!profile && !profileTimeout && !onboardingDone) {
    return <div className="min-h-dvh bg-white" />
  }

  // Redirect to onboarding ONLY if:
  // 1. Profile explicitly says not completed, AND
  // 2. The persistent local flag is not set (prevents re-onboarding on fetch failures)
  if (!onboardingDone && (!profile || !profile.onboarding_completed) && !location.pathname.startsWith('/onboarding')) {
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
    return <div className="min-h-dvh bg-white" />
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

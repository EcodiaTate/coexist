import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type UserRole = Database['public']['Enums']['user_role']
type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Role hierarchy helpers                                             */
/* ------------------------------------------------------------------ */

const GLOBAL_ROLE_RANK: Record<UserRole, number> = {
  participant: 0,
  national_staff: 1,
  national_admin: 2,
  super_admin: 3,
}

const COLLECTIVE_ROLE_RANK: Record<CollectiveRole, number> = {
  member: 0,
  assist_leader: 1,
  co_leader: 2,
  leader: 3,
}

/* ------------------------------------------------------------------ */
/*  Capacitor persistence helpers                                      */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'coexist-auth-session'
const PROFILE_STORAGE_KEY = 'coexist-auth-profile'

async function persistSession(session: Session | null) {
  if (!Capacitor.isNativePlatform()) return
  if (session) {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(session) })
  } else {
    await Preferences.remove({ key: STORAGE_KEY })
  }
}

async function restoreSession(): Promise<Session | null> {
  if (!Capacitor.isNativePlatform()) return null
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  if (!value) return null
  try {
    return JSON.parse(value) as Session
  } catch {
    return null
  }
}

async function persistProfile(profile: Profile | null) {
  try {
    if (profile) {
      await Preferences.set({ key: PROFILE_STORAGE_KEY, value: JSON.stringify(profile) })
    } else {
      await Preferences.remove({ key: PROFILE_STORAGE_KEY })
    }
  } catch {
    // Non-critical — worst case user sees a brief loading state
  }
}

async function restoreProfile(): Promise<Profile | null> {
  try {
    const { value } = await Preferences.get({ key: PROFILE_STORAGE_KEY })
    if (!value) return null
    return JSON.parse(value) as Profile
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Auth context types                                                 */
/* ------------------------------------------------------------------ */

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  role: UserRole
  collectiveRoles: CollectiveMembership[]
  isLoading: boolean
  isSuspended: boolean
  suspendedReason: string | null
  suspendedUntil: string | null
  needsTosAcceptance: boolean
  isLeader: (collectiveId: string) => boolean
  isAssistLeader: (collectiveId: string) => boolean
  isCoLeader: (collectiveId: string) => boolean
  isStaff: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  signUp: (email: string, password: string, displayName: string, dateOfBirth?: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signInWithApple: () => Promise<{ error: AuthError | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  acceptTos: (version: string) => Promise<void>
}

const CURRENT_TOS_VERSION = '1.0'

const AuthContext = createContext<AuthContextValue | null>(null)

/* ------------------------------------------------------------------ */
/*  Provider hook (internal)                                           */
/* ------------------------------------------------------------------ */

interface CollectiveMembership {
  collective_id: string
  role: CollectiveRole
}

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [collectiveRoles, setCollectiveRoles] = useState<CollectiveMembership[]>([])
  const [isLoading, setIsLoading] = useState(true)

  /* ---- fetch profile ---- */
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('[auth] fetchProfile error:', error.message, error.code)
        return null
      }
      return data
    } catch (err) {
      console.error('[auth] fetchProfile exception:', err)
      return null
    }
  }, [])

  /* ---- fetch collective memberships ---- */
  const fetchCollectiveRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('collective_members')
        .select('collective_id, role')
        .eq('user_id', userId)
        .eq('status', 'active')
      if (error) {
        console.error('[auth] fetchCollectiveRoles error:', error.message, error.code)
        return []
      }
      return data ?? []
    } catch (err) {
      console.error('[auth] fetchCollectiveRoles exception:', err)
      return []
    }
  }, [])

  /* ---- load user data (profile + collective roles) ---- */
  const loadUserData = useCallback(async (userId: string) => {
    console.log('[auth] loadUserData start', userId)
    const timeout = new Promise<[null, CollectiveMembership[]]>((resolve) =>
      setTimeout(() => {
        console.warn('[auth] loadUserData timed out after 8s')
        resolve([null, []])
      }, 8000),
    )
    const [profileData, roles] = await Promise.race([
      Promise.all([
        fetchProfile(userId),
        fetchCollectiveRoles(userId),
      ]),
      timeout,
    ])
    console.log('[auth] loadUserData done', { hasProfile: !!profileData, rolesCount: roles.length })

    // If no profile row exists, it likely means the fetch timed out or
    // the auth trigger hasn't fired yet. Retry once before creating.
    if (!profileData) {
      console.warn('[auth] No profile found - retrying fetch once')
      const retried = await fetchProfile(userId)
      if (retried) {
        console.log('[auth] Profile found on retry')
        setProfile(retried)
        setCollectiveRoles(roles)
        persistProfile(retried)
        return retried
      }

      console.warn('[auth] Still no profile - creating one')
      try {
        const { data: authUser } = await supabase.auth.getUser()
        const meta = authUser?.user?.user_metadata
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            display_name: meta?.display_name ?? meta?.full_name ?? meta?.email?.split('@')[0] ?? 'New User',
            avatar_url: meta?.avatar_url ?? null,
          }, { onConflict: 'id' })
          .select('*')
          .single()
        if (createErr) {
          console.error('[auth] Profile create/upsert error:', createErr.message, createErr.code)
        }
        if (created) {
          console.log('[auth] Profile created successfully')
          setProfile(created)
          setCollectiveRoles(roles)
          persistProfile(created)
          return created
        }
      } catch (err) {
        console.error('[auth] Failed to create profile:', err)
      }
    }

    // Check suspension server-side (the RPC handles expiry clearance securely)
    if (profileData?.is_suspended) {
      try {
        const { data: suspCheck } = await supabase.rpc('check_user_suspended' as any, { uid: userId })
        if (suspCheck && !(suspCheck as any).suspended) {
          // Server cleared the expired suspension - refresh profile data
          profileData.is_suspended = false
          profileData.suspended_reason = null
          profileData.suspended_until = null
        }
      } catch {
        // If RPC fails, keep the client-side suspended state as-is
      }
    }

    // Check if account is pending deletion and user logged back in (recovery)
    // Use server-side RPC to handle this securely instead of direct client update
    if ((profileData as any)?.deletion_status === 'pending_deletion') {
      try {
        await supabase.rpc('recover_pending_deletion' as any, { uid: userId })
        ;(profileData as any).deletion_status = 'active'
        ;(profileData as any).deleted_at = null
        ;(profileData as any).deletion_requested_at = null
      } catch {
        // If RPC doesn't exist yet, the account stays pending - server wins
      }
    }

    setProfile(profileData)
    setCollectiveRoles(roles)
    persistProfile(profileData)
    return profileData
  }, [fetchProfile, fetchCollectiveRoles])

  /* ---- refresh profile (public) ---- */
  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadUserData(user.id)
  }, [user, loadUserData])

  /* ---- init: restore session + subscribe ---- */
  useEffect(() => {
    let mounted = true
    // Track whether init() has resolved so the onAuthStateChange handler
    // knows whether to treat INITIAL_SESSION as redundant.
    let initDone = false
    // When getSession times out, an onAuthStateChange SIGNED_IN event
    // may already be in-flight. Don't set isLoading=false in init's
    // finally block — let the auth handler do it after loadUserData.
    let deferLoadingToAuthHandler = false

    async function init() {
      console.log('[auth] init start')
      try {
        // Try to restore native session first
        const restored = await restoreSession()
        if (restored) {
          const { data } = await supabase.auth.setSession(restored)
          if (data.session && mounted) {
            setUser(data.session.user)
            setSession(data.session)
            // Seed with cached profile so route guard doesn't flash onboarding
            const cachedProfile = await restoreProfile()
            if (cachedProfile && mounted) {
              setProfile(cachedProfile)
            }
            // Then fetch fresh profile from server (updates cache)
            await loadUserData(data.session.user.id)
          }
        } else {
          // Web: Supabase handles cookies/localStorage automatically.
          // Immediately seed cached profile so the route guard doesn't
          // flash onboarding while we wait for getSession().
          const cachedProfile = await restoreProfile()
          if (cachedProfile && mounted) {
            setProfile(cachedProfile)
          }

          // getSession() can be slow if it needs to refresh tokens, so we
          // use a timeout - but only to unblock the UI, NOT to nuke the session.
          let resolved = false
          const sessionPromise = supabase.auth.getSession().then((result) => {
            resolved = true
            return result
          })

          const sessionResult = await Promise.race([
            sessionPromise,
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 3000)
            ),
          ])

          if (sessionResult && sessionResult.data.session && mounted) {
            // getSession returned in time
            setUser(sessionResult.data.session.user)
            setSession(sessionResult.data.session)
            await loadUserData(sessionResult.data.session.user.id)
          } else if (!resolved && mounted) {
            // Timed out - let the onAuthStateChange handler pick it up
            // when getSession eventually resolves. Do NOT sign out or
            // clear tokens - the session may still be valid.
            // Keep isLoading=true so the route guard shows the loading
            // screen instead of flashing login/onboarding.
            console.warn('[auth] getSession timed out, waiting for auth event')
            deferLoadingToAuthHandler = true
            // Safety: if auth handler never fires (user genuinely not signed
            // in, or getSession hangs), unblock after 10s total.
            setTimeout(() => {
              if (mounted) setIsLoading(false)
            }, 7000) // 3s already elapsed from getSession timeout
          }
          // If sessionResult was returned but session is null, the user
          // genuinely has no session - no need to sign out or clear anything,
          // just let them land on the login page naturally.
        }
      } catch (err) {
        console.error('[auth] init failed:', err)
        // Don't nuke the session on init errors - the tokens in localStorage
        // may still be valid and the onAuthStateChange handler can recover.
      } finally {
        initDone = true
        if (deferLoadingToAuthHandler) {
          console.log('[auth] init done, deferring isLoading to auth handler')
        } else {
          console.log('[auth] init done, setting isLoading=false')
          if (mounted) setIsLoading(false)
        }
      }
    }

    // Subscribe BEFORE init so we don't miss events, but skip
    // the INITIAL_SESSION event since init() handles it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[auth] onAuthStateChange:', event, !!newSession)
        if (!mounted) return
        // INITIAL_SESSION is handled by init() - skip to avoid double work
        // and to avoid hanging on the same stale getSession() call.
        if (event === 'INITIAL_SESSION') return

        setSession(newSession)
        setUser(newSession?.user ?? null)
        persistSession(newSession)

        if (newSession?.user) {
          // Defer loadUserData to next microtask — calling it synchronously
          // inside onAuthStateChange can deadlock because the Supabase JS
          // client holds an internal auth lock during _recoverAndRefresh,
          // and any fetch that needs the token will wait on the same lock.
          const userId = newSession.user.id
          setTimeout(async () => {
            if (!mounted) return
            try {
              await loadUserData(userId)
            } catch (profileErr) {
              console.error('[auth] loadUserData failed (session still valid):', profileErr)
            } finally {
              if (mounted) setIsLoading(false)
            }
          }, 0)
        } else {
          setProfile(null)
          setCollectiveRoles([])
          persistProfile(null)
          if (mounted && initDone) setIsLoading(false)
        }
      },
    )

    init()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- collective role checkers ---- */
  const getCollectiveRole = useCallback(
    (collectiveId: string): CollectiveRole | null => {
      const membership = collectiveRoles.find((m) => m.collective_id === collectiveId)
      return membership?.role ?? null
    },
    [collectiveRoles],
  )

  const isLeader = useCallback(
    (collectiveId: string) => getCollectiveRole(collectiveId) === 'leader',
    [getCollectiveRole],
  )

  const isAssistLeader = useCallback(
    (collectiveId: string) => {
      const role = getCollectiveRole(collectiveId)
      return role !== null && COLLECTIVE_ROLE_RANK[role] >= COLLECTIVE_ROLE_RANK.assist_leader
    },
    [getCollectiveRole],
  )

  const isCoLeader = useCallback(
    (collectiveId: string) => {
      const role = getCollectiveRole(collectiveId)
      return role !== null && COLLECTIVE_ROLE_RANK[role] >= COLLECTIVE_ROLE_RANK.co_leader
    },
    [getCollectiveRole],
  )

  /* ---- global role checks ---- */
  const role = profile?.role ?? 'participant'
  const isStaff = GLOBAL_ROLE_RANK[role] >= GLOBAL_ROLE_RANK.national_staff
  const isAdmin = GLOBAL_ROLE_RANK[role] >= GLOBAL_ROLE_RANK.national_admin
  const isSuperAdmin = role === 'super_admin'

  /* ---- suspended / TOS checks ---- */
  const isSuspended = profile?.is_suspended ?? false
  const suspendedReason = profile?.suspended_reason ?? null
  const suspendedUntil = profile?.suspended_until ?? null
  const needsTosAcceptance = !!profile && profile.tos_accepted_version !== CURRENT_TOS_VERSION

  const acceptTos = useCallback(async (version: string) => {
    if (!user) return
    // Only allow accepting the current TOS version to prevent future-version bypass
    if (version !== CURRENT_TOS_VERSION) return
    await supabase
      .from('profiles')
      .update({ tos_accepted_version: version, tos_accepted_at: new Date().toISOString() })
      .eq('id', user.id)
    await loadUserData(user.id)
  }, [user, loadUserData])

  /* ---- auth actions ---- */
  const signUp = useCallback(async (email: string, password: string, displayName: string, dateOfBirth?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, date_of_birth: dateOfBirth } },
    })

    // Send welcome email on successful signup
    if (!error && data.user) {
      supabase.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: email,
          data: {
            name: displayName,
            app_url: 'https://app.coexistaus.org',
          },
        },
      }).catch(console.error)
    }

    return { error }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return { error }
  }, [])

  const signInWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
    return { error }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    await persistSession(null)
    await persistProfile(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }, [])

  return useMemo(
    () => ({
      user,
      profile,
      session,
      role,
      collectiveRoles,
      isLoading,
      isSuspended,
      suspendedReason,
      suspendedUntil,
      needsTosAcceptance,
      isLeader,
      isAssistLeader,
      isCoLeader,
      isStaff,
      isAdmin,
      isSuperAdmin,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signInWithMagicLink,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
      acceptTos,
    }),
    [
      user, profile, session, role, collectiveRoles, isLoading,
      isSuspended, suspendedReason, suspendedUntil, needsTosAcceptance,
      isLeader, isAssistLeader, isCoLeader,
      isStaff, isAdmin, isSuperAdmin,
      signUp, signIn, signInWithGoogle, signInWithApple, signInWithMagicLink,
      signOut, resetPassword, updatePassword, refreshProfile, acceptTos,
    ],
  )
}

/* ------------------------------------------------------------------ */
/*  Public exports                                                     */
/* ------------------------------------------------------------------ */

export { AuthContext }
export type { AuthContextValue, Profile, UserRole, CollectiveRole }

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

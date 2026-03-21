import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { resolveCapabilities, type CapabilityKey } from '@/lib/capabilities'

/* ------------------------------------------------------------------ */
/*  useCapabilities — current user's resolved capability set           */
/* ------------------------------------------------------------------ */

interface UseCapabilitiesReturn {
  capabilities: Set<string>
  hasCapability: (key: string) => boolean
  isLoading: boolean
}

/**
 * Returns the current user's resolved capabilities based on their global role
 * + any per-user overrides from the staff_roles table.
 *
 * For participants, no DB fetch is needed (they have zero capabilities).
 * For staff+ roles, we fetch staff_roles.permissions once and cache.
 */
export function useCapabilities(): UseCapabilitiesReturn {
  const { user, role, isStaff } = useAuth()

  const { data: overrides, isLoading } = useQuery({
    queryKey: ['staff-permissions', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('staff_roles' as any)
        .select('permissions')
        .eq('user_id', user.id)
        .maybeSingle()
      return (data as any)?.permissions as Record<string, boolean> | null
    },
    enabled: !!user && isStaff,
    staleTime: 5 * 60 * 1000,
  })

  const capabilities = useMemo(
    () => resolveCapabilities(role, overrides),
    [role, overrides],
  )

  const hasCapabilityFn = useMemo(
    () => (key: string) => capabilities.has(key),
    [capabilities],
  )

  return {
    capabilities,
    hasCapability: hasCapabilityFn,
    isLoading: isStaff ? isLoading : false,
  }
}

/* ------------------------------------------------------------------ */
/*  useUserCapabilities — resolve caps for any user (admin use)        */
/* ------------------------------------------------------------------ */

export function useUserCapabilities(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-capabilities', userId],
    queryFn: async () => {
      if (!userId) return { role: 'participant' as const, overrides: null, capabilities: new Set<string>() }

      // Fetch profile role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const role = (profile?.role ?? 'participant') as 'participant' | 'national_staff' | 'national_admin' | 'super_admin'

      // Fetch staff overrides
      const { data: staffRole } = await supabase
        .from('staff_roles' as any)
        .select('permissions')
        .eq('user_id', userId)
        .maybeSingle()

      const overrides = (staffRole as any)?.permissions as Record<string, boolean> | null
      const capabilities = resolveCapabilities(role, overrides)

      return { role, overrides, capabilities }
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}

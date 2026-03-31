import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CollectiveOption {
  id: string
  name: string
  slug: string
  state: string | null
  region: string | null
}

interface LeaderCollectiveScopeValue {
  /** Currently selected collective ID */
  selectedCollectiveId: string | undefined
  /** Set the selected collective */
  setSelectedCollectiveId: (id: string) => void
  /** Collectives available for selection */
  availableCollectives: CollectiveOption[]
  /** Whether the current user should see the collective selector (more than 1 option) */
  showCollectiveSelector: boolean
  /** Loading state */
  isLoading: boolean
}

const LeaderCollectiveScopeContext = createContext<LeaderCollectiveScopeValue | null>(null)

export { LeaderCollectiveScopeContext }
export type { LeaderCollectiveScopeValue, CollectiveOption }

/* ------------------------------------------------------------------ */
/*  Leader roles that grant leader-suite access                        */
/* ------------------------------------------------------------------ */

const LEADER_ROLES: CollectiveRole[] = ['assist_leader', 'co_leader', 'leader']

/* ------------------------------------------------------------------ */
/*  Provider hook                                                      */
/* ------------------------------------------------------------------ */

export function useLeaderCollectiveScopeProvider(): LeaderCollectiveScopeValue {
  const { isAdmin, isManager, managedCollectiveIds, collectiveRoles } = useAuth()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  // IDs from the user's own leader-tier collective memberships
  const ownLeaderCollectiveIds = useMemo(
    () =>
      collectiveRoles
        .filter((m) => LEADER_ROLES.includes(m.role))
        .map((m) => m.collective_id),
    [collectiveRoles],
  )

  // Combine managed + own leader IDs (managers may manage collectives
  // they don't personally lead)
  const allRelevantIds = useMemo(() => {
    const set = new Set([...ownLeaderCollectiveIds, ...managedCollectiveIds])
    return [...set]
  }, [ownLeaderCollectiveIds, managedCollectiveIds])

  // Admins: fetch all collectives. Managers: fetch managed + own. Leaders: fetch own.
  const { data: collectives, isLoading } = useQuery({
    queryKey: ['leader-scope-collectives', isAdmin, allRelevantIds],
    queryFn: async () => {
      let query = supabase
        .from('collectives')
        .select('id, name, slug, state, region')
        .eq('is_active', true)
        .order('name')

      // Non-admin users only see their relevant collectives
      if (!isAdmin && allRelevantIds.length > 0) {
        query = query.in('id', allRelevantIds)
      } else if (!isAdmin && allRelevantIds.length === 0) {
        return []
      }

      const { data, error } = await query
      if (error) return []
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const availableCollectives = collectives ?? []

  // Resolve the effective selected ID
  const effectiveSelectedId = useMemo(() => {
    // If user picked one and it's still in the list, use it
    if (selectedId && availableCollectives.some((c) => c.id === selectedId)) {
      return selectedId
    }
    // Default to first available
    return availableCollectives[0]?.id
  }, [selectedId, availableCollectives])

  const showCollectiveSelector = availableCollectives.length > 1

  const handleSetSelected = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  return useMemo(() => ({
    selectedCollectiveId: effectiveSelectedId,
    setSelectedCollectiveId: handleSetSelected,
    availableCollectives,
    showCollectiveSelector,
    isLoading,
  }), [effectiveSelectedId, handleSetSelected, availableCollectives, showCollectiveSelector, isLoading])
}

/* ------------------------------------------------------------------ */
/*  Consumer hook                                                      */
/* ------------------------------------------------------------------ */

export function useLeaderCollectiveScope(): LeaderCollectiveScopeValue {
  const ctx = useContext(LeaderCollectiveScopeContext)
  if (!ctx) {
    return {
      selectedCollectiveId: undefined,
      setSelectedCollectiveId: () => {},
      availableCollectives: [],
      showCollectiveSelector: false,
      isLoading: false,
    }
  }
  return ctx
}

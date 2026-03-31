import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

interface AdminCollectiveScopeValue {
  /** Currently selected collective ID, or 'all' for all collectives */
  selectedCollectiveId: string
  /** Set the selected collective */
  setSelectedCollectiveId: (id: string) => void
  /** Collectives available for selection (filtered for managers, all for admins) */
  availableCollectives: CollectiveOption[]
  /** Whether the current user should see the collective selector */
  showCollectiveSelector: boolean
  /** Whether viewing all collectives (admins only) */
  isViewingAll: boolean
  /** Loading state */
  isLoading: boolean
}

const AdminCollectiveScopeContext = createContext<AdminCollectiveScopeValue | null>(null)

export { AdminCollectiveScopeContext }
export type { AdminCollectiveScopeValue, CollectiveOption }

/* ------------------------------------------------------------------ */
/*  Provider hook                                                      */
/* ------------------------------------------------------------------ */

export function useAdminCollectiveScopeProvider(): AdminCollectiveScopeValue {
  const { role, isAdmin, isManager, managedCollectiveIds } = useAuth()
  const [selectedCollectiveId, setSelectedCollectiveId] = useState<string>('all')

  // Fetch all collectives for admin, or only managed ones for managers
  const { data: collectives, isLoading } = useQuery({
    queryKey: ['admin-scope-collectives', role, managedCollectiveIds],
    queryFn: async () => {
      let query = supabase
        .from('collectives')
        .select('id, name, slug, state, region')
        .eq('is_active', true)
        .order('name')

      // Managers only see their assigned collectives
      if (role === 'manager' && managedCollectiveIds.length > 0) {
        query = query.in('id', managedCollectiveIds)
      }

      const { data, error } = await query
      if (error) return []
      return data ?? []
    },
    enabled: isAdmin || isManager,
    staleTime: 5 * 60 * 1000,
  })

  const availableCollectives = collectives ?? []

  // Managers must select a collective (no "all" option unless admin)
  const showCollectiveSelector = isAdmin || (isManager && availableCollectives.length > 0)

  // Auto-select first managed collective for managers if none selected
  const effectiveSelectedId = useMemo(() => {
    if (isAdmin) return selectedCollectiveId
    if (role === 'manager') {
      if (selectedCollectiveId === 'all' && availableCollectives.length > 0) {
        return availableCollectives[0].id
      }
      // Ensure selected is in the managed list
      if (availableCollectives.some((c) => c.id === selectedCollectiveId)) {
        return selectedCollectiveId
      }
      return availableCollectives[0]?.id ?? 'all'
    }
    return 'all'
  }, [isAdmin, role, selectedCollectiveId, availableCollectives])

  const handleSetSelected = useCallback((id: string) => {
    // Managers cannot select 'all'
    if (id === 'all' && role === 'manager') return
    setSelectedCollectiveId(id)
  }, [role])

  return useMemo(() => ({
    selectedCollectiveId: effectiveSelectedId,
    setSelectedCollectiveId: handleSetSelected,
    availableCollectives,
    showCollectiveSelector,
    isViewingAll: effectiveSelectedId === 'all',
    isLoading,
  }), [effectiveSelectedId, handleSetSelected, availableCollectives, showCollectiveSelector, isLoading])
}

/* ------------------------------------------------------------------ */
/*  Consumer hook                                                      */
/* ------------------------------------------------------------------ */

export function useAdminCollectiveScope(): AdminCollectiveScopeValue {
  const ctx = useContext(AdminCollectiveScopeContext)
  if (!ctx) {
    // Return a default no-op value for pages outside admin layout
    return {
      selectedCollectiveId: 'all',
      setSelectedCollectiveId: () => {},
      availableCollectives: [],
      showCollectiveSelector: false,
      isViewingAll: true,
      isLoading: false,
    }
  }
  return ctx
}

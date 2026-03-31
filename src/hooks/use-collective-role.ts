import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './use-auth'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']

const ROLE_RANK: Record<CollectiveRole, number> = {
  member: 0,
  assist_leader: 1,
  co_leader: 2,
  leader: 3,
}

interface UseCollectiveRoleReturn {
  role: CollectiveRole | null
  isLoading: boolean
  isMember: boolean
  isAssistLeader: boolean
  isCoLeader: boolean
  isLeader: boolean
  hasMinRole: (minRole: CollectiveRole) => boolean
}

export function useCollectiveRole(collectiveId: string | undefined): UseCollectiveRoleReturn {
  const { user } = useAuth()

  const { data: role = null, isLoading } = useQuery({
    queryKey: ['collective-role', collectiveId, user?.id],
    queryFn: async () => {
      if (!user || !collectiveId) return null
      const { data } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', collectiveId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      return (data?.role as CollectiveRole) ?? null
    },
    enabled: !!user && !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })

  const rank = role !== null ? ROLE_RANK[role] : -1

  return {
    role,
    isLoading,
    isMember: rank >= ROLE_RANK.member,
    isAssistLeader: rank >= ROLE_RANK.assist_leader,
    isCoLeader: rank >= ROLE_RANK.co_leader,
    isLeader: rank >= ROLE_RANK.leader,
    hasMinRole: (minRole: CollectiveRole) => rank >= ROLE_RANK[minRole],
  }
}

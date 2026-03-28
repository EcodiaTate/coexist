import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

// user_blocks table is not yet in generated types (migration 070).
// Use untyped access until `supabase gen types` is re-run post-migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blocks = () => (supabase as any).from('user_blocks')

interface UserBlock {
  blocked_id: string
  created_at: string
}

export function useBlockedUsers() {
  const { user } = useAuth()

  return useQuery<UserBlock[]>({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await blocks()
        .select('blocked_id, created_at')
        .eq('blocker_id', user.id)

      if (error) throw error
      return (data ?? []) as UserBlock[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

export function useIsBlocked(userId: string | undefined) {
  const { data: blockedUsers } = useBlockedUsers()
  if (!userId || !blockedUsers) return false
  return blockedUsers.some((b) => b.blocked_id === userId)
}

export function useBlockUser() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ blockedId, reason }: { blockedId: string; reason?: string }) => {
      if (!user) throw new Error('Not authenticated')

      // Block the user
      const { error: blockError } = await blocks()
        .insert({
          blocker_id: user.id,
          blocked_id: blockedId,
          reason: reason ?? null,
        })

      if (blockError) throw blockError

      // Also create a content report to notify admins about the blocked user
      const { error: reportError } = await supabase
        .from('content_reports')
        .insert({
          content_id: blockedId,
          content_type: 'profile',
          reason: reason
            ? `User blocked: ${reason}`
            : 'User blocked by another member',
          reporter_id: user.id,
          status: 'pending',
        })

      // Don't fail the block if the report fails
      if (reportError) console.error('Failed to create report for block:', reportError)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
      queryClient.invalidateQueries({ queryKey: ['chat'] })
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
    },
  })
}

export function useUnblockUser() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await blocks()
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
      queryClient.invalidateQueries({ queryKey: ['chat'] })
    },
  })
}

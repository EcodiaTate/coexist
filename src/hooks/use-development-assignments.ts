import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DevAssignment {
  id: string
  module_id: string | null
  section_id: string | null
  scope: 'collective' | 'individual'
  collective_id: string | null
  user_id: string | null
  assigned_by: string
  due_date: string | null
  notes: string | null
  created_at: string
  module?: { id: string; title: string; category: string; estimated_minutes: number; thumbnail_url: string | null } | null
  section?: { id: string; title: string; category: string; thumbnail_url: string | null } | null
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const keys = {
  myAssignments: (userId: string) => ['dev-my-assignments', userId] as const,
  collectiveAssignments: (collectiveId: string) => ['dev-collective-assignments', collectiveId] as const,
  collectiveProgress: (collectiveId: string) => ['dev-collective-progress', collectiveId] as const,
}

/* ------------------------------------------------------------------ */
/*  My assignments (learner view)                                      */
/* ------------------------------------------------------------------ */

export function useMyAssignments() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.myAssignments(user?.id ?? ''),
    queryFn: async () => {
      // Get direct individual assignments + collective assignments for user's collectives
      const { data, error } = await supabase
        .from('dev_assignments')
        .select('*, module:dev_modules(id, title, category, estimated_minutes, thumbnail_url), section:dev_sections(id, title, category, thumbnail_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DevAssignment[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective assignments (leader view)                               */
/* ------------------------------------------------------------------ */

export function useCollectiveAssignments(collectiveId: string | undefined) {
  return useQuery({
    queryKey: keys.collectiveAssignments(collectiveId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_assignments')
        .select('*, module:dev_modules(id, title, category, estimated_minutes, thumbnail_url), section:dev_sections(id, title, category, thumbnail_url)')
        .eq('collective_id', collectiveId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DevAssignment[]
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective member progress (leader dashboard)                      */
/* ------------------------------------------------------------------ */

export interface MemberProgress {
  user_id: string
  display_name: string
  avatar_url: string | null
  modules_completed: number
  modules_total: number
  avg_quiz_score: number | null
  last_activity: string | null
}

export function useCollectiveProgress(collectiveId: string | undefined) {
  return useQuery({
    queryKey: keys.collectiveProgress(collectiveId!),
    queryFn: async () => {
      // Get collective members
      const { data: members, error: membersError } = await supabase
        .from('collective_members')
        .select('user_id, profile:profiles(display_name, avatar_url)')
        .eq('collective_id', collectiveId!)
        .eq('status', 'active')
      if (membersError) throw membersError

      // Get all module progress for these members
      const memberIds = members.map((m) => m.user_id)
      const [progressRes, attemptsRes] = await Promise.all([
        supabase
          .from('dev_user_module_progress')
          .select('*')
          .in('user_id', memberIds),
        supabase
          .from('dev_quiz_attempts')
          .select('*')
          .in('user_id', memberIds),
      ])

      const progress = progressRes.data ?? []
      const attempts = attemptsRes.data ?? []

      // Aggregate per member
      return members.map((m): MemberProgress => {
        const memberProgress = progress.filter((p) => p.user_id === m.user_id)
        const memberAttempts = attempts.filter((a) => a.user_id === m.user_id)
        const profile = m.profile as { display_name: string; avatar_url: string | null } | null

        return {
          user_id: m.user_id,
          display_name: profile?.display_name ?? 'Unknown',
          avatar_url: profile?.avatar_url ?? null,
          modules_completed: memberProgress.filter((p) => p.status === 'completed').length,
          modules_total: memberProgress.length,
          avg_quiz_score:
            memberAttempts.length > 0
              ? Math.round(memberAttempts.reduce((sum, a) => sum + a.score_pct, 0) / memberAttempts.length)
              : null,
          last_activity:
            memberProgress.length > 0
              ? memberProgress.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0].updated_at
              : null,
        }
      })
    },
    enabled: !!collectiveId,
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Create assignment                                                  */
/* ------------------------------------------------------------------ */

export function useCreateAssignment() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      module_id?: string | null
      section_id?: string | null
      scope: 'collective' | 'individual'
      collective_id?: string | null
      user_ids?: string[]
      due_date?: string | null
      notes?: string | null
    }) => {
      if (!user) throw new Error('Not authenticated')

      if (input.scope === 'individual' && input.user_ids && input.user_ids.length > 0) {
        // Create one assignment per user
        const rows = input.user_ids.map((uid) => ({
          module_id: input.module_id ?? null,
          section_id: input.section_id ?? null,
          scope: 'individual' as const,
          collective_id: null,
          user_id: uid,
          assigned_by: user.id,
          due_date: input.due_date ?? null,
          notes: input.notes ?? null,
        }))
        const { data, error } = await supabase
          .from('dev_assignments')
          .insert(rows)
          .select()
        if (error) throw error
        return data
      } else {
        // Collective assignment
        const { data, error } = await supabase
          .from('dev_assignments')
          .insert({
            module_id: input.module_id ?? null,
            section_id: input.section_id ?? null,
            scope: 'collective',
            collective_id: input.collective_id ?? null,
            user_id: null,
            assigned_by: user.id,
            due_date: input.due_date ?? null,
            notes: input.notes ?? null,
          })
          .select()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      if (!user) return
      qc.invalidateQueries({ queryKey: ['dev-my-assignments'] })
      qc.invalidateQueries({ queryKey: ['dev-collective-assignments'] })
    },
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dev_assignments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev-my-assignments'] })
      qc.invalidateQueries({ queryKey: ['dev-collective-assignments'] })
    },
  })
}

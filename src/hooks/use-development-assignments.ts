import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase as _supabase } from '@/lib/supabase'

// dev_* tables are not yet in the generated Database type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any
import { useAuth } from '@/hooks/use-auth'
import type { DevModule, DevSection } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const keys = {
  myContent: (userId: string) => ['dev-my-content', userId] as const,
  collectiveProgress: (collectiveId: string) => ['dev-collective-progress', collectiveId] as const,
}

/* ------------------------------------------------------------------ */
/*  My content — modules/sections targeted at my roles                 */
/* ------------------------------------------------------------------ */

export function useMyTargetedContent() {
  const { user, role, collectiveRoles } = useAuth()

  // Compute user's effective roles for targeting
  // Collective roles: leader, co_leader, assist_leader, member
  // Global roles mapped: national_staff, national_admin, super_admin → 'national_staff'
  const effectiveRoles = useMemo(() => {
    const roles = new Set<string>()
    for (const cm of collectiveRoles) {
      roles.add(cm.role)
    }
    // Any staff-level global role counts as 'national_staff' for targeting
    if (role === 'national_staff' || role === 'national_admin' || role === 'super_admin') {
      roles.add('national_staff')
    }
    return Array.from(roles)
  }, [collectiveRoles, role])

  return useQuery({
    // Include roles in the key so the query re-runs when roles load
    queryKey: ['dev-my-content', user?.id ?? '', effectiveRoles],
    queryFn: async () => {
      const uid = user?.id ?? ''
      const roleSet = new Set(effectiveRoles)

      // Get all published modules
      const { data: modules, error: modErr } = await supabase
        .from('dev_modules')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (modErr) throw modErr

      // Get all published sections
      const { data: sections, error: secErr } = await supabase
        .from('dev_sections')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (secErr) throw secErr

      // Show content where:
      //  - target_roles overlaps with user's effective roles, OR
      //  - target_user_ids includes user's ID, OR
      //  - no targeting set (empty arrays = visible to all)
      const filteredModules = (modules as DevModule[]).filter((m) => {
        if (m.target_roles.length === 0 && m.target_user_ids.length === 0) return true
        if (m.target_user_ids.includes(uid)) return true
        return m.target_roles.some((r) => roleSet.has(r))
      })

      const filteredSections = (sections as DevSection[]).filter((s) => {
        if (s.target_roles.length === 0 && s.target_user_ids.length === 0) return true
        if (s.target_user_ids.includes(uid)) return true
        return s.target_roles.some((r) => roleSet.has(r))
      })

      return { modules: filteredModules, sections: filteredSections }
    },
    enabled: !!user && effectiveRoles.length > 0,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective member progress (admin/leader dashboard)                */
/* ------------------------------------------------------------------ */

export function useCollectiveProgress(collectiveId: string | undefined) {
  return useQuery({
    queryKey: keys.collectiveProgress(collectiveId!),
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from('collective_members')
        .select('user_id, profile:profiles(display_name, avatar_url)')
        .eq('collective_id', collectiveId!)
        .eq('status', 'active')
      if (membersError) throw membersError

      const memberIds = members.map((m: any) => m.user_id)
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

      const progress: any[] = progressRes.data ?? []
      const attempts: any[] = attemptsRes.data ?? []

      return members.map((m: any): MemberProgress => {
        const memberProgress = progress.filter((p: any) => p.user_id === m.user_id)
        const memberAttempts = attempts.filter((a: any) => a.user_id === m.user_id)
        const profile = m.profile as { display_name: string; avatar_url: string | null } | null

        return {
          user_id: m.user_id,
          display_name: profile?.display_name ?? 'Unknown',
          avatar_url: profile?.avatar_url ?? null,
          modules_completed: memberProgress.filter((p: any) => p.status === 'completed').length,
          modules_total: memberProgress.length,
          avg_quiz_score:
            memberAttempts.length > 0
              ? Math.round(memberAttempts.reduce((sum: number, a: any) => sum + a.score_pct, 0) / memberAttempts.length)
              : null,
          last_activity:
            memberProgress.length > 0
              ? memberProgress.sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at))[0].updated_at
              : null,
        }
      })
    },
    enabled: !!collectiveId,
    staleTime: 60 * 1000,
  })
}

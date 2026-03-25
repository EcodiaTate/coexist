import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ModuleProgress {
  id: string
  user_id: string
  module_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  last_content_id: string | null
  last_sort_order: number | null
  progress_pct: number
  time_spent_sec: number
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface SectionProgress {
  id: string
  user_id: string
  section_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  modules_completed: number
  modules_total: number
  progress_pct: number
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  module_id: string | null
  score_pct: number
  points_earned: number
  points_total: number
  passed: boolean
  time_spent_sec: number
  started_at: string
  completed_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const keys = {
  myModuleProgress: (userId: string) => ['dev-my-module-progress', userId] as const,
  mySectionProgress: (userId: string) => ['dev-my-section-progress', userId] as const,
  moduleProgress: (userId: string, moduleId: string) => ['dev-module-progress', userId, moduleId] as const,
  quizAttempts: (userId: string, quizId: string) => ['dev-quiz-attempts', userId, quizId] as const,
}

/* ------------------------------------------------------------------ */
/*  All my progress                                                    */
/* ------------------------------------------------------------------ */

export function useMyModuleProgress() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.myModuleProgress(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_user_module_progress')
        .select('*')
        .eq('user_id', user!.id)
      if (error) throw error
      return data as ModuleProgress[]
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

export function useMySectionProgress() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.mySectionProgress(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_user_section_progress')
        .select('*')
        .eq('user_id', user!.id)
      if (error) throw error
      return data as SectionProgress[]
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Single module progress                                             */
/* ------------------------------------------------------------------ */

export function useModuleProgress(moduleId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.moduleProgress(user?.id ?? '', moduleId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_user_module_progress')
        .select('*')
        .eq('user_id', user!.id)
        .eq('module_id', moduleId!)
        .maybeSingle()
      if (error) throw error
      return data as ModuleProgress | null
    },
    enabled: !!user && !!moduleId,
  })
}

/* ------------------------------------------------------------------ */
/*  Upsert module progress (debounced save from viewer)                */
/* ------------------------------------------------------------------ */

export function useUpsertModuleProgress() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      module_id: string
      status?: 'not_started' | 'in_progress' | 'completed'
      last_content_id?: string | null
      last_sort_order?: number | null
      progress_pct?: number
      time_spent_sec?: number
    }) => {
      if (!user) throw new Error('Not authenticated')

      const now = new Date().toISOString()
      const row: Record<string, unknown> = {
        user_id: user.id,
        module_id: input.module_id,
        status: input.status ?? 'in_progress',
      }

      // Only set fields that were explicitly provided — avoid clobbering with defaults
      if (input.last_content_id !== undefined) row.last_content_id = input.last_content_id
      if (input.last_sort_order !== undefined) row.last_sort_order = input.last_sort_order
      if (input.progress_pct !== undefined) row.progress_pct = input.progress_pct
      if (input.time_spent_sec !== undefined) row.time_spent_sec = input.time_spent_sec

      // Only set started_at on the very first upsert (insert path) — never overwrite
      // Supabase upsert with onConflict will use this on insert but the DB trigger
      // won't overwrite if we omit it on the update path. We set it unconditionally
      // and rely on a COALESCE in the DB or only set on initial insert.
      // Safest: always include started_at but use the existing row's value on update.
      // Since Supabase .upsert replaces the full row, we must include it.
      // We'll set it only when status transitions to in_progress for the first time.
      row.started_at = now // Will be ignored on conflict — see below

      if (input.status === 'completed') {
        row.completed_at = now
      }

      // Use two-step: try update first, then insert if no row exists.
      // This avoids the upsert overwriting started_at on every save.
      const { data: existing } = await supabase
        .from('dev_user_module_progress')
        .select('id, started_at')
        .eq('user_id', user.id)
        .eq('module_id', input.module_id)
        .maybeSingle()

      if (existing) {
        // Update — preserve started_at, only set completed_at on completion
        const updateRow: Record<string, unknown> = { ...row }
        delete updateRow.user_id
        delete updateRow.module_id
        delete updateRow.started_at // never overwrite
        if (input.status !== 'completed') delete updateRow.completed_at

        const { data, error } = await supabase
          .from('dev_user_module_progress')
          .update(updateRow)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        return data as ModuleProgress
      } else {
        // Insert — set started_at
        row.started_at = now
        const { data, error } = await supabase
          .from('dev_user_module_progress')
          .insert(row)
          .select()
          .single()
        if (error) throw error
        return data as ModuleProgress
      }
    },
    onSuccess: (_data, vars) => {
      if (!user) return
      qc.invalidateQueries({ queryKey: keys.moduleProgress(user.id, vars.module_id) })
      qc.invalidateQueries({ queryKey: keys.myModuleProgress(user.id) })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Upsert section progress                                            */
/* ------------------------------------------------------------------ */

export function useUpsertSectionProgress() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      section_id: string
      status: 'not_started' | 'in_progress' | 'completed'
      modules_completed: number
      modules_total: number
      progress_pct: number
    }) => {
      if (!user) throw new Error('Not authenticated')

      const now = new Date().toISOString()
      const row: Record<string, unknown> = {
        user_id: user.id,
        section_id: input.section_id,
        status: input.status,
        modules_completed: input.modules_completed,
        modules_total: input.modules_total,
        progress_pct: input.progress_pct,
      }

      if (input.status === 'in_progress') row.started_at = now
      if (input.status === 'completed') row.completed_at = now

      const { data, error } = await supabase
        .from('dev_user_section_progress')
        .upsert(row, { onConflict: 'user_id,section_id' })
        .select()
        .single()
      if (error) throw error
      return data as SectionProgress
    },
    onSuccess: () => {
      if (!user) return
      qc.invalidateQueries({ queryKey: keys.mySectionProgress(user.id) })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Quiz attempts                                                      */
/* ------------------------------------------------------------------ */

export function useQuizAttempts(quizId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.quizAttempts(user?.id ?? '', quizId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_quiz_attempts')
        .select('*')
        .eq('user_id', user!.id)
        .eq('quiz_id', quizId!)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as QuizAttempt[]
    },
    enabled: !!user && !!quizId,
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      quiz_id: string
      module_id?: string | null
      score_pct: number
      points_earned: number
      points_total: number
      passed: boolean
      time_spent_sec: number
      responses: {
        question_id: string
        selected_option_ids: string[]
        text_response?: string
        is_correct: boolean
        points_earned: number
      }[]
    }) => {
      if (!user) throw new Error('Not authenticated')

      // Create attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('dev_quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: input.quiz_id,
          module_id: input.module_id ?? null,
          score_pct: input.score_pct,
          points_earned: input.points_earned,
          points_total: input.points_total,
          passed: input.passed,
          time_spent_sec: input.time_spent_sec,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (attemptError) throw attemptError

      // Insert responses
      if (input.responses.length > 0) {
        const responseRows = input.responses.map((r) => ({
          attempt_id: attempt.id,
          question_id: r.question_id,
          selected_option_ids: r.selected_option_ids,
          text_response: r.text_response ?? null,
          is_correct: r.is_correct,
          points_earned: r.points_earned,
        }))
        const { error: respError } = await supabase
          .from('dev_quiz_responses')
          .insert(responseRows)
        if (respError) throw respError
      }

      return attempt as QuizAttempt
    },
    onSuccess: (_data, vars) => {
      if (!user) return
      qc.invalidateQueries({ queryKey: keys.quizAttempts(user.id, vars.quiz_id) })
    },
  })
}

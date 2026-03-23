import { useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { getCurrentPeriodKey, getDueDate, type TaskTemplate, type TaskInstance } from '@/hooks/use-admin-tasks'
import { resolveAndGenerateDynamicInstances } from '@/hooks/use-timeline-rules'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MyTask extends TaskInstance {
  template: TaskTemplate
  collective: { id: string; name: string }
  event?: { id: string; title: string } | null
}

export interface CollectiveTaskGroup {
  collective_id: string
  collective_name: string
  tasks: MyTask[]
  pendingCount: number
  overdueCount: number
}

/* ------------------------------------------------------------------ */
/*  useMyTasks — all pending tasks for current user across collectives */
/* ------------------------------------------------------------------ */

export function useMyTasks() {
  const { user, collectiveRoles } = useAuth()

  // Find collectives where user is assist_leader+
  const staffCollectiveIds = useMemo(
    () =>
      collectiveRoles
        .filter((m) => m.role === 'assist_leader' || m.role === 'co_leader' || m.role === 'leader')
        .map((m) => m.collective_id),
    [collectiveRoles],
  )

  return useQuery({
    queryKey: ['my-tasks', user?.id, staffCollectiveIds],
    queryFn: async () => {
      if (!user || staffCollectiveIds.length === 0) return []

      const { data, error } = await supabase
        .from('task_instances' as any)
        .select(`
          *,
          task_templates(*),
          collectives(id, name),
          events(id, title),
          profiles!task_instances_completed_by_fkey(display_name, avatar_url)
        `)
        .in('collective_id', staffCollectiveIds)
        .order('due_date', { ascending: true })

      if (error) throw error

      // Filter: for individual tasks (assigned_user_id set), only show the current user's instances
      return (data ?? [])
        .filter((row: any) => !row.assigned_user_id || row.assigned_user_id === user!.id)
        .map((row: any) => ({
          ...row,
          template: row.task_templates,
          collective: row.collectives,
          event: row.events,
          completer: row.profiles ?? null,
        })) as MyTask[]
    },
    enabled: !!user && staffCollectiveIds.length > 0,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  useCollectiveTasks — tasks for a specific collective               */
/* ------------------------------------------------------------------ */

export function useCollectiveTasks(collectiveId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['collective-tasks', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return []

      const { data, error } = await supabase
        .from('task_instances' as any)
        .select(`
          *,
          task_templates(*),
          collectives(id, name),
          events(id, title),
          profiles!task_instances_completed_by_fkey(display_name, avatar_url)
        `)
        .eq('collective_id', collectiveId)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row: any) => ({
        ...row,
        template: row.task_templates,
        collective: row.collectives,
        event: row.events,
        completer: row.profiles ?? null,
      })) as MyTask[]
    },
    enabled: !!user && !!collectiveId,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  useCompleteTask — mark a task instance as completed                */
/* ------------------------------------------------------------------ */

export function useCompleteTask() {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  return useMutation({
    mutationFn: async ({
      instanceId,
      notes,
    }: {
      instanceId: string
      notes?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('task_instances' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          completion_notes: notes || null,
        })
        .eq('id', instanceId)

      if (error) throw error
    },
    onMutate: async ({ instanceId, notes }) => {
      await queryClient.cancelQueries({ queryKey: ['my-tasks'] })
      await queryClient.cancelQueries({ queryKey: ['collective-tasks'] })
      const previousMyTasks = queryClient.getQueryData(['my-tasks', user?.id])
      const now = new Date().toISOString()
      const updater = (old: MyTask[] | undefined) =>
        old?.map((t) =>
          t.id === instanceId
            ? {
                ...t,
                status: 'completed' as const,
                completed_at: now,
                completed_by: user!.id,
                completion_notes: notes || null,
                completer: { display_name: profile?.display_name ?? '', avatar_url: profile?.avatar_url ?? null },
              }
            : t,
        )
      queryClient.setQueriesData<MyTask[]>({ queryKey: ['my-tasks'] }, updater)
      queryClient.setQueriesData<MyTask[]>({ queryKey: ['collective-tasks'] }, updater)
      return { previousMyTasks }
    },
    onError: (_err, _, context) => {
      if (context?.previousMyTasks) queryClient.setQueryData(['my-tasks', user?.id], context.previousMyTasks)
      queryClient.invalidateQueries({ queryKey: ['collective-tasks'] })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['collective-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpi-dashboard'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useSkipTask — mark a task instance as skipped                      */
/* ------------------------------------------------------------------ */

export function useSkipTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await supabase
        .from('task_instances' as any)
        .update({ status: 'skipped' })
        .eq('id', instanceId)

      if (error) throw error
    },
    onMutate: async (instanceId) => {
      await queryClient.cancelQueries({ queryKey: ['my-tasks'] })
      await queryClient.cancelQueries({ queryKey: ['collective-tasks'] })
      const updater = (old: MyTask[] | undefined) =>
        old?.map((t) => (t.id === instanceId ? { ...t, status: 'skipped' as const } : t))
      queryClient.setQueriesData<MyTask[]>({ queryKey: ['my-tasks'] }, updater)
      queryClient.setQueriesData<MyTask[]>({ queryKey: ['collective-tasks'] }, updater)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['collective-tasks'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useGenerateTaskInstances — lazy generation for current period      */
/* ------------------------------------------------------------------ */

export function useGenerateTaskInstances() {
  const queryClient = useQueryClient()
  const { user, collectiveRoles } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!user) return

      const staffCollectiveIds = collectiveRoles
        .filter((m) => m.role === 'assist_leader' || m.role === 'co_leader' || m.role === 'leader')
        .map((m) => m.collective_id)

      if (staffCollectiveIds.length === 0) return

      // Fetch active templates that apply to user's collectives
      const { data: templates } = await supabase
        .from('task_templates' as any)
        .select('*')
        .eq('is_active', true)
        .neq('schedule_type', 'event_relative') // Event-relative handled separately

      if (!templates?.length) return

      // Separate once vs recurring templates, and split recurring by assignment mode
      const onceTemplates = (templates as any[]).filter((t) => t.schedule_type === 'once')
      const collectiveRecurring = (templates as any[]).filter(
        (t) => t.schedule_type !== 'once' && (t.assignment_mode ?? 'collective') === 'collective',
      )
      const individualRecurring = (templates as any[]).filter(
        (t) => t.schedule_type !== 'once' && t.assignment_mode === 'individual',
      )

      // --- Handle collective recurring templates (weekly/monthly) ---
      // One instance per collective per period — any staff can complete
      for (const template of collectiveRecurring) {
        const periodKey = getCurrentPeriodKey(template.schedule_type)
        if (!periodKey) continue

        const targetCollectives = template.collective_id
          ? [template.collective_id].filter((id: string) => staffCollectiveIds.includes(id))
          : staffCollectiveIds

        for (const collectiveId of targetCollectives) {
          const dueDate = getDueDate(template as TaskTemplate, periodKey)
          await supabase
            .from('task_instances' as any)
            .upsert(
              {
                template_id: template.id,
                collective_id: collectiveId,
                due_date: dueDate,
                period_key: periodKey,
                status: 'pending',
              },
              { onConflict: 'template_id,collective_id,period_key' },
            )
        }
      }

      // --- Handle individual recurring templates (weekly/monthly) ---
      // One instance per USER per collective per period
      if (individualRecurring.length > 0) {
        const indivTemplateIds = individualRecurring.map((t: any) => t.id)

        // Check which individual-recurring tasks this user already has for the current periods
        const periodsToCheck: string[] = []
        for (const template of individualRecurring) {
          const pk = getCurrentPeriodKey(template.schedule_type)
          if (pk) periodsToCheck.push(`${pk}:${user.id}`)
        }

        const { data: existingIndiv } = await supabase
          .from('task_instances' as any)
          .select('template_id, collective_id, period_key')
          .in('template_id', indivTemplateIds)
          .eq('assigned_user_id', user.id)

        const existingIndivKeys = new Set(
          (existingIndiv ?? []).map((r: any) => `${r.template_id}:${r.collective_id}:${r.period_key}`),
        )

        for (const template of individualRecurring) {
          const basePeriodKey = getCurrentPeriodKey(template.schedule_type)
          if (!basePeriodKey) continue

          const periodKey = `${basePeriodKey}:${user.id}`
          const targetCollectives = template.collective_id
            ? [template.collective_id].filter((id: string) => staffCollectiveIds.includes(id))
            : staffCollectiveIds

          for (const collectiveId of targetCollectives) {
            const key = `${template.id}:${collectiveId}:${periodKey}`
            if (existingIndivKeys.has(key)) continue

            const dueDate = getDueDate(template as TaskTemplate, basePeriodKey)
            await supabase
              .from('task_instances' as any)
              .insert({
                template_id: template.id,
                collective_id: collectiveId,
                due_date: dueDate,
                period_key: periodKey,
                assigned_user_id: user.id,
                status: 'pending',
              })
          }
        }
      }

      // --- Handle once templates (per-user, never regenerate after any status) ---
      if (onceTemplates.length > 0) {
        const onceTemplateIds = onceTemplates.map((t: any) => t.id)

        const { data: existingOnce } = await supabase
          .from('task_instances' as any)
          .select('template_id, collective_id')
          .in('template_id', onceTemplateIds)
          .eq('assigned_user_id', user.id)

        const existingKeys = new Set(
          (existingOnce ?? []).map((r: any) => `${r.template_id}:${r.collective_id}`),
        )

        for (const template of onceTemplates) {
          const targetCollectives = template.collective_id
            ? [template.collective_id].filter((id: string) => staffCollectiveIds.includes(id))
            : staffCollectiveIds

          for (const collectiveId of targetCollectives) {
            const key = `${template.id}:${collectiveId}`
            if (existingKeys.has(key)) continue

            const periodKey = `once:${user.id}`
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 7)
            dueDate.setHours(23, 59, 59, 999)

            await supabase
              .from('task_instances' as any)
              .insert({
                template_id: template.id,
                collective_id: collectiveId,
                due_date: dueDate.toISOString(),
                period_key: periodKey,
                assigned_user_id: user.id,
                status: 'pending',
              })
          }
        }
      }

      // --- Handle dynamic timeline templates (event_relative with smart resolution) ---
      await resolveAndGenerateDynamicInstances(staffCollectiveIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['collective-tasks'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useGroupedTasks — group tasks by collective for display            */
/* ------------------------------------------------------------------ */

export function useGroupedTasks(tasks: MyTask[] | undefined): CollectiveTaskGroup[] {
  return useMemo(() => {
    if (!tasks?.length) return []

    const groups = new Map<string, CollectiveTaskGroup>()
    const now = new Date()

    for (const task of tasks) {
      const cId = task.collective_id
      if (!groups.has(cId)) {
        groups.set(cId, {
          collective_id: cId,
          collective_name: task.collective?.name ?? 'Unknown',
          tasks: [],
          pendingCount: 0,
          overdueCount: 0,
        })
      }
      const group = groups.get(cId)!
      group.tasks.push(task)
      if (task.status === 'pending') {
        group.pendingCount++
        if (new Date(task.due_date) < now) group.overdueCount++
      }
    }

    // Sort groups: ones with overdue tasks first, then by name
    return Array.from(groups.values()).sort((a, b) => {
      if (a.overdueCount > 0 && b.overdueCount === 0) return -1
      if (a.overdueCount === 0 && b.overdueCount > 0) return 1
      return a.collective_name.localeCompare(b.collective_name)
    })
  }, [tasks])
}

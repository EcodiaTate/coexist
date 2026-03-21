import { useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { getCurrentPeriodKey, getDueDate, type TaskTemplate, type TaskInstance } from '@/hooks/use-admin-tasks'

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
          events(id, title)
        `)
        .in('collective_id', staffCollectiveIds)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row: any) => ({
        ...row,
        template: row.task_templates,
        collective: row.collectives,
        event: row.events,
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
          events(id, title)
        `)
        .eq('collective_id', collectiveId)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row: any) => ({
        ...row,
        template: row.task_templates,
        collective: row.collectives,
        event: row.events,
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
  const { user } = useAuth()

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
    onSuccess: () => {
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
    onSuccess: () => {
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

      for (const template of templates as any[]) {
        const periodKey = getCurrentPeriodKey(template.schedule_type)
        if (!periodKey) continue

        const targetCollectives = template.collective_id
          ? [template.collective_id].filter((id: string) => staffCollectiveIds.includes(id))
          : staffCollectiveIds

        for (const collectiveId of targetCollectives) {
          const dueDate = getDueDate(template as TaskTemplate, periodKey)
          // Upsert — unique constraint on (template_id, collective_id, period_key) handles dedup
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

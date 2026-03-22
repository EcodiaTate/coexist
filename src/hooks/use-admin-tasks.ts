import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskTemplate {
  id: string
  title: string
  description: string | null
  collective_id: string | null
  category: string
  schedule_type: 'weekly' | 'monthly' | 'event_relative' | 'once'
  day_of_week: number | null
  day_of_month: number | null
  event_offset_days: number | null
  assignee_role: string
  sort_order: number
  is_active: boolean
  attachment_url: string | null
  attachment_label: string | null
  use_dynamic_timeline: boolean
  created_by: string
  created_at: string
  updated_at: string
  collective?: { id: string; name: string } | null
}

export interface TaskInstance {
  id: string
  template_id: string
  collective_id: string
  event_id: string | null
  assigned_user_id: string | null
  due_date: string
  period_key: string
  status: 'pending' | 'completed' | 'skipped'
  completed_at: string | null
  completed_by: string | null
  completion_notes: string | null
  created_at: string
  template?: TaskTemplate
  collective?: { id: string; name: string } | null
  event?: { id: string; title: string } | null
  completer?: { id: string; display_name: string; avatar_url: string | null } | null
}

export interface KpiStat {
  collective_id: string
  collective_name: string
  total: number
  completed: number
  overdue: number
  rate: number
}

/* ------------------------------------------------------------------ */
/*  Schedule helpers                                                   */
/* ------------------------------------------------------------------ */

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatSchedule(template: TaskTemplate): string {
  switch (template.schedule_type) {
    case 'weekly':
      return `Weekly (${DAYS_OF_WEEK[template.day_of_week ?? 0]})`
    case 'monthly':
      return `Monthly (${template.day_of_month ?? 1}${ordinalSuffix(template.day_of_month ?? 1)})`
    case 'event_relative': {
      const days = Math.abs(template.event_offset_days ?? 0)
      const direction = (template.event_offset_days ?? 0) < 0 ? 'before' : 'after'
      const label = `${days} day${days !== 1 ? 's' : ''} ${direction} event`
      return template.use_dynamic_timeline ? `${label} (auto)` : label
    }
    case 'once':
      return 'One-time'
    default:
      return template.schedule_type
  }
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export function getCurrentPeriodKey(scheduleType: string): string {
  const now = new Date()
  if (scheduleType === 'weekly') {
    const year = now.getFullYear()
    const jan1 = new Date(year, 0, 1)
    const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000)
    const week = Math.ceil((days + jan1.getDay() + 1) / 7)
    return `${year}-W${String(week).padStart(2, '0')}`
  }
  if (scheduleType === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  return ''
}

export function getDueDate(template: TaskTemplate, periodKey: string): string {
  const now = new Date()
  if (template.schedule_type === 'weekly') {
    const dow = template.day_of_week ?? 0
    const diff = (dow - now.getDay() + 7) % 7
    const due = new Date(now)
    due.setDate(due.getDate() + diff)
    due.setHours(23, 59, 59, 999)
    return due.toISOString()
  }
  if (template.schedule_type === 'monthly') {
    const dom = template.day_of_month ?? 1
    const due = new Date(now.getFullYear(), now.getMonth(), dom, 23, 59, 59, 999)
    if (due < now) due.setMonth(due.getMonth() + 1)
    return due.toISOString()
  }
  return now.toISOString()
}

/* ------------------------------------------------------------------ */
/*  Category helpers                                                   */
/* ------------------------------------------------------------------ */

export const TASK_CATEGORIES = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'admin', label: 'Admin' },
  { value: 'content', label: 'Content' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'general', label: 'General' },
]

export const CATEGORY_COLORS: Record<string, string> = {
  social_media: 'bg-plum-100 text-plum-700',
  outreach: 'bg-info-100 text-info-700',
  admin: 'bg-neutral-100 text-neutral-600',
  content: 'bg-primary-100 text-primary-700',
  follow_up: 'bg-warning-100 text-warning-700',
  general: 'bg-white text-primary-400',
}

/* ------------------------------------------------------------------ */
/*  Admin hooks                                                        */
/* ------------------------------------------------------------------ */

export function useAdminTaskTemplates(filters?: {
  scope?: 'all' | 'global' | string
  scheduleType?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['admin-task-templates', filters],
    queryFn: async () => {
      let query = supabase
        .from('task_templates' as any)
        .select('*, collectives(id, name)')
        .order('sort_order')
        .order('created_at', { ascending: false })

      if (filters?.scope === 'global') {
        query = query.is('collective_id', null)
      } else if (filters?.scope && filters.scope !== 'all') {
        query = query.eq('collective_id', filters.scope)
      }

      if (filters?.scheduleType) {
        query = query.eq('schedule_type', filters.scheduleType)
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map((row: any) => ({
        ...row,
        collective: row.collectives,
      })) as TaskTemplate[]
    },
    staleTime: 30 * 1000,
  })
}

export function useAdminCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      description?: string
      collective_id?: string | null
      category: string
      schedule_type: string
      day_of_week?: number | null
      day_of_month?: number | null
      event_offset_days?: number | null
      assignee_role: string
      sort_order?: number
      attachment_url?: string | null
      attachment_label?: string | null
      use_dynamic_timeline?: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('task_templates' as any)
        .insert({
          ...input,
          collective_id: input.collective_id || null,
          created_by: user.id,
        })
        .select('*, collectives(id, name)')
        .single()
      if (error) throw error
      const row = data as any
      return { ...row, collective: row.collectives } as TaskTemplate
    },
    onSuccess: (created) => {
      // Immediately prepend the new template into all matching query caches
      // so it shows up instantly without waiting for the refetch
      queryClient.setQueriesData<TaskTemplate[]>(
        { queryKey: ['admin-task-templates'] },
        (old) => old ? [created, ...old] : [created],
      )
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] })
    },
  })
}

export function useAdminUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TaskTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('task_templates' as any)
        .update(updates)
        .eq('id', id)
        .select('*, collectives(id, name)')
        .single()
      if (error) throw error
      const row = data as any
      return { ...row, collective: row.collectives } as TaskTemplate
    },
    onSuccess: (updated) => {
      // Instantly replace the updated template in cache
      queryClient.setQueriesData<TaskTemplate[]>(
        { queryKey: ['admin-task-templates'] },
        (old) => old?.map((t) => (t.id === updated.id ? updated : t)) ?? [],
      )
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] })
    },
  })
}

export function useAdminToggleTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('task_templates' as any)
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] })
    },
  })
}

export function useAdminDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_templates' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  KPI Dashboard                                                      */
/* ------------------------------------------------------------------ */

export function useAdminKpiDashboard(filters?: {
  collectiveId?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: ['admin-kpi-dashboard', filters],
    queryFn: async () => {
      let query = supabase
        .from('task_instances' as any)
        .select('id, collective_id, status, due_date, completed_at, completed_by, template_id, collectives(id, name)')

      if (filters?.collectiveId) {
        query = query.eq('collective_id', filters.collectiveId)
      }
      if (filters?.dateFrom) {
        query = query.gte('due_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('due_date', filters.dateTo)
      }

      const { data, error } = await query
      if (error) throw error
      const instances = (data ?? []) as any[]

      // Aggregate per collective
      const byCollective = new Map<string, { name: string; total: number; completed: number; overdue: number }>()
      const now = new Date()

      for (const inst of instances) {
        const cId = inst.collective_id
        const cName = inst.collectives?.name ?? 'Unknown'
        if (!byCollective.has(cId)) {
          byCollective.set(cId, { name: cName, total: 0, completed: 0, overdue: 0 })
        }
        const agg = byCollective.get(cId)!
        agg.total++
        if (inst.status === 'completed') agg.completed++
        if (inst.status === 'pending' && new Date(inst.due_date) < now) agg.overdue++
      }

      const stats: KpiStat[] = Array.from(byCollective.entries()).map(([id, agg]) => ({
        collective_id: id,
        collective_name: agg.name,
        total: agg.total,
        completed: agg.completed,
        overdue: agg.overdue,
        rate: agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) : 0,
      }))

      // Sort by rate ascending (worst first)
      stats.sort((a, b) => a.rate - b.rate)

      // Overall stats
      const totals = {
        total: instances.length,
        completed: instances.filter((i: any) => i.status === 'completed').length,
        overdue: instances.filter((i: any) => i.status === 'pending' && new Date(i.due_date) < now).length,
        rate: instances.length > 0
          ? Math.round((instances.filter((i: any) => i.status === 'completed').length / instances.length) * 100)
          : 0,
      }

      return { stats, totals }
    },
    staleTime: 30 * 1000,
  })
}

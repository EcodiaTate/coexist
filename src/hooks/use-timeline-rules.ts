import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TimelineAnchor = 'next_event' | 'next_event_of_type' | 'event_series'

export interface TimelineRule {
  id: string
  template_id: string
  anchor: TimelineAnchor
  activity_type_filter: string | null
  series_id_filter: string | null
  offset_days: number
  lookahead_days: number
  match_all_events: boolean
  display_label: string | null
  created_at: string
  updated_at: string
}

export interface TimelineRuleInput {
  template_id: string
  anchor: TimelineAnchor
  activity_type_filter?: string | null
  series_id_filter?: string | null
  offset_days: number
  lookahead_days?: number
  match_all_events?: boolean
}

/* ------------------------------------------------------------------ */
/*  Display label generator                                            */
/* ------------------------------------------------------------------ */

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  shore_cleanup: 'shore cleanup',
  tree_planting: 'tree planting',
  land_regeneration: 'land regeneration',
  nature_walk: 'nature walk',
  camp_out: 'camp out',
  retreat: 'retreat',
  film_screening: 'film screening',
  marine_restoration: 'marine restoration',
  workshop: 'workshop',
}

export function buildDisplayLabel(rule: {
  anchor: TimelineAnchor
  offset_days: number
  activity_type_filter?: string | null
  match_all_events?: boolean
}): string {
  const days = Math.abs(rule.offset_days)
  const direction = rule.offset_days < 0 ? 'before' : rule.offset_days > 0 ? 'after' : 'on the day of'
  const dayLabel = days === 0 ? '' : `${days} day${days !== 1 ? 's' : ''} ${direction}`

  const allOrNext = rule.match_all_events ? 'each' : "the next"

  let eventLabel = 'event'
  if (rule.anchor === 'next_event_of_type' && rule.activity_type_filter) {
    eventLabel = ACTIVITY_TYPE_LABELS[rule.activity_type_filter] ?? rule.activity_type_filter
  } else if (rule.anchor === 'event_series') {
    eventLabel = 'event in the series'
  }

  if (days === 0) return `On the day of ${allOrNext} ${eventLabel}`
  return `${dayLabel} ${allOrNext} ${eventLabel}`
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useTimelineRule(templateId: string | undefined) {
  return useQuery({
    queryKey: ['timeline-rule', templateId],
    queryFn: async () => {
      if (!templateId) return null
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('timeline_rules' as any)
        .select('*')
        .eq('template_id', templateId)
        .maybeSingle()
      if (error) throw error
      return data as TimelineRule | null
    },
    enabled: !!templateId,
    staleTime: 60 * 1000,
  })
}

export function useUpsertTimelineRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TimelineRuleInput) => {
      const label = buildDisplayLabel(input)
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('timeline_rules' as any)
        .upsert(
          {
            template_id: input.template_id,
            anchor: input.anchor,
            activity_type_filter: input.activity_type_filter || null,
            series_id_filter: input.series_id_filter || null,
            offset_days: input.offset_days,
            lookahead_days: input.lookahead_days ?? 60,
            match_all_events: input.match_all_events ?? false,
            display_label: label,
          },
          { onConflict: 'template_id' },
        )
        .select('*')
        .single()
      if (error) throw error
      return data as unknown as TimelineRule
    },
    onSuccess: (rule) => {
      queryClient.setQueryData(['timeline-rule', rule.template_id], rule)
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] })
    },
  })
}

export function useDeleteTimelineRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('timeline_rules' as any)
        .delete()
        .eq('template_id', templateId)
      if (error) throw error
    },
    onSuccess: (_d, templateId) => {
      queryClient.setQueryData(['timeline-rule', templateId], null)
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Dynamic instance resolution                                        */
/* ------------------------------------------------------------------ */

/**
 * Given a list of collectives the current user is staff in, fetch all
 * active event_relative templates with dynamic timelines, resolve their
 * matching events per collective, and generate task instances.
 *
 * This is the core engine. Called during lazy task generation.
 */
export async function resolveAndGenerateDynamicInstances(
  staffCollectiveIds: string[],
): Promise<void> {
  if (staffCollectiveIds.length === 0) return

  // 1. Fetch all active templates that use dynamic timeline
  const { data: templates } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('task_templates' as any)
    .select('*')
    .eq('is_active', true)
    .eq('schedule_type', 'event_relative')
    .eq('use_dynamic_timeline', true)

  if (!templates?.length) return

  // 2. Fetch timeline rules for these templates
  const templateIds = (templates as Record<string, unknown>[]).map((t) => t.id as string)
  const { data: rules } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('timeline_rules' as any)
    .select('*')
    .in('template_id', templateIds)

  if (!rules?.length) return

  const ruleMap = new Map((rules as Record<string, unknown>[]).map((r) => [r.template_id as string, r]))

  // 3. For each template + collective combo, find matching events
  const now = new Date()

  for (const template of templates as Record<string, unknown>[]) {
    const rule = ruleMap.get(template.id)
    if (!rule) continue

    const targetCollectives = template.collective_id
      ? [template.collective_id].filter((id: string) => staffCollectiveIds.includes(id))
      : staffCollectiveIds

    for (const collectiveId of targetCollectives) {
      // Build event query for this collective
      const lookaheadEnd = new Date(now)
      lookaheadEnd.setDate(lookaheadEnd.getDate() + rule.lookahead_days)

      let eventQuery = supabase
        .from('events')
        .select('id, title, date_start, activity_type, series_id')
        .eq('collective_id', collectiveId)
        .eq('status', 'published')
        .gte('date_start', now.toISOString())
        .lte('date_start', lookaheadEnd.toISOString())
        .order('date_start', { ascending: true })

      // Apply anchor-specific filters
      if (rule.anchor === 'next_event_of_type' && rule.activity_type_filter) {
        eventQuery = eventQuery.eq('activity_type', rule.activity_type_filter)
      }
      if (rule.anchor === 'event_series' && rule.series_id_filter) {
        eventQuery = eventQuery.eq('series_id', rule.series_id_filter)
      }

      // Limit to 1 if not matching all events
      if (!rule.match_all_events) {
        eventQuery = eventQuery.limit(1)
      }

      const { data: events } = await eventQuery
      if (!events?.length) continue

      // Generate an instance for each matched event
      for (const event of events) {
        const eventDate = new Date(event.date_start)
        const dueDate = new Date(eventDate)
        dueDate.setDate(dueDate.getDate() + rule.offset_days)
        dueDate.setHours(23, 59, 59, 999)

        // Skip if due date is already in the past — no point creating overdue tasks
        if (dueDate < now) continue

        const periodKey = `event:${event.id}`

        // Use ignoreDuplicates to avoid overwriting completed/skipped instances
        await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('task_instances' as any)
          .upsert(
            {
              template_id: template.id,
              collective_id: collectiveId,
              event_id: event.id,
              due_date: dueDate.toISOString(),
              period_key: periodKey,
              status: 'pending',
            },
            { onConflict: 'template_id,collective_id,period_key', ignoreDuplicates: true },
          )
      }
    }
  }
}

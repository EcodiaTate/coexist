import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { untypedFrom } from '@/lib/supabase'
import {
  FALLBACK_METRIC_DEFS,
  type ImpactMetricDef,
} from '@/lib/impact-metrics'

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const QUERY_KEY = ['impact-metric-defs'] as const

/* ------------------------------------------------------------------ */
/*  Hook: read metric definitions                                      */
/* ------------------------------------------------------------------ */

export function useImpactMetricDefs() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ImpactMetricDef[]> => {
      const { data, error } = await untypedFrom('impact_metric_defs')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as ImpactMetricDef[]
    },
    placeholderData: [...FALLBACK_METRIC_DEFS],
    staleTime: 10 * 60 * 1000,
  })

  const defs = query.data ?? [...FALLBACK_METRIC_DEFS]
  const activeDefs = defs.filter((d) => d.is_active)

  return {
    ...query,
    /** All defs (active + inactive) */
    defs,
    /** Only active defs */
    activeDefs,
    /** Set of active metric keys */
    validKeys: new Set(activeDefs.map((d) => d.key)),
    /** Active metrics linkable to survey questions (excludes hours_total etc.) */
    surveyLinkableMetrics: activeDefs
      .filter((d) => d.survey_linkable)
      .map((d) => ({ key: d.key, label: d.label })),
    /** key → label lookup for active metrics */
    metricLabels: Object.fromEntries(activeDefs.map((d) => [d.key, d.label])) as Record<string, string>,
    /** key → full def lookup for active metrics */
    metricByKey: Object.fromEntries(activeDefs.map((d) => [d.key, d])) as Record<string, ImpactMetricDef>,
  }
}

/* ------------------------------------------------------------------ */
/*  Hook: all defs including inactive (admin use)                      */
/* ------------------------------------------------------------------ */

export function useAllImpactMetricDefs() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'all'],
    queryFn: async (): Promise<ImpactMetricDef[]> => {
      const { data, error } = await untypedFrom('impact_metric_defs')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as ImpactMetricDef[]
    },
    placeholderData: [...FALLBACK_METRIC_DEFS],
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useUpsertMetricDef() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (def: Partial<ImpactMetricDef> & { key: string }) => {
      const { error } = await untypedFrom('impact_metric_defs')
        .upsert(
          {
            ...def,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useDeleteMetricDef() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await untypedFrom('impact_metric_defs')
        .delete()
        .eq('key', key)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useReorderMetricDefs() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (orderedKeys: string[]) => {
      // Batch update sort_order for all keys
      const updates = orderedKeys.map((key, i) =>
        untypedFrom('impact_metric_defs')
          .update({ sort_order: i })
          .eq('key', key),
      )
      const results = await Promise.all(updates)
      const failed = results.find((r: { error?: unknown }) => r.error)
      if (failed?.error) throw failed.error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

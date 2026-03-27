import { supabase } from '@/lib/supabase'
import { isBuiltinMetric } from '@/lib/impact-metrics'
import type { SurveyQuestion } from '@/components/survey-questions'
import type { Json } from '@/types/database.types'

/**
 * Sync impact-tagged survey answers into event_impact.
 * Built-in metrics → columns, custom metrics → custom_metrics jsonb.
 *
 * @param validKeys - Set of active metric keys from useImpactMetricDefs(). When
 *   provided, questions with an impact_metric not in this set are skipped. Pass
 *   undefined to skip the validation (e.g. in contexts without the hook).
 */
export async function syncSurveyImpact(
  eventId: string,
  questions: SurveyQuestion[],
  answers: Record<string, Json>,
  userId: string,
  validKeys?: Set<string>,
) {
  const builtinUpdates: Record<string, number> = {}
  const customUpdates: Record<string, number> = {}

  for (const q of questions) {
    if (!q.impact_metric) continue
    if (validKeys && !validKeys.has(q.impact_metric)) continue

    const raw = answers[q.id]
    const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
    if (!isNaN(value) && value >= 0) {
      if (isBuiltinMetric(q.impact_metric)) {
        builtinUpdates[q.impact_metric] = value
      } else {
        customUpdates[q.impact_metric] = value
      }
    }
  }

  if (Object.keys(builtinUpdates).length === 0 && Object.keys(customUpdates).length === 0) return

  const { data: existing } = await supabase
    .from('event_impact')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  const { id: _id, ...existingFields } = existing ?? ({} as Record<string, unknown>)
  const existingCustom = (existing?.custom_metrics as Record<string, unknown>) ?? {}

  const merged = {
    ...existingFields,
    event_id: eventId,
    logged_by: existing?.logged_by ?? userId,
    custom_metrics: {
      ...existingCustom,
      ...customUpdates,
      survey_synced: true,
    },
    ...builtinUpdates,
  }

  await supabase.from('event_impact').upsert(merged, { onConflict: 'event_id' })
}

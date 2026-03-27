import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseSurveyQuestions, type SurveyQuestion } from '@/components/survey-questions'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EventSurveyData {
  surveyId: string
  title: string
  questions: SurveyQuestion[]
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Load the admin-created survey for a given event.
 *
 * Priority:
 *  1. Survey directly linked to this event (surveys.event_id)
 *  2. Auto-send survey matching the event's activity type
 *
 * Used by both the leader log-impact page and the participant
 * post-event-survey page — single source of truth for survey lookup.
 */
export function useEventSurvey(
  eventId: string | undefined,
  activityType: string | undefined,
) {
  return useQuery({
    queryKey: ['event-survey', eventId, activityType],
    queryFn: async (): Promise<EventSurveyData | null> => {
      if (!eventId) return null

      // 1. Direct event-linked survey
      const { data: direct } = await supabase
        .from('surveys')
        .select('id, title, questions')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .maybeSingle()

      // 2. Fallback: auto-send survey for this activity type
      const survey =
        direct ??
        (activityType
          ? (
              await supabase
                .from('surveys')
                .select('id, title, questions')
                .eq('activity_type', activityType)
                .eq('auto_send_after_event', true)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            ).data
          : null)

      if (!survey) return null

      return {
        surveyId: survey.id,
        title: survey.title,
        questions: parseSurveyQuestions(survey.questions),
      }
    },
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000,
  })
}

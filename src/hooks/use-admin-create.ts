import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Admin create page summary hook                                     */
/*                                                                     */
/*  Extracted from pages/admin/create.tsx for reuse + prefetch.        */
/* ------------------------------------------------------------------ */

export interface CreateSummaryData {
  totalSurveys: number
  campaignsSent: number
  draftCampaigns: number
  subscribers: number
}

async function fetchCreateSummary(): Promise<CreateSummaryData> {
  const [surveysRes, campaignsRes, draftCampaignsRes, subscribersRes] = await Promise.all([
    supabase.from('surveys').select('id', { count: 'exact', head: true }),
    supabase
      .from('email_campaigns' as any)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent'),
    supabase
      .from('email_campaigns' as any)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft'),
    supabase.rpc('email_subscriber_count' as any),
  ])

  return {
    totalSurveys: surveysRes.count ?? 0,
    campaignsSent: campaignsRes.count ?? 0,
    draftCampaigns: draftCampaignsRes.count ?? 0,
    subscribers: (subscribersRes.data as number) ?? 0,
  }
}

export function useCreateSummary() {
  return useQuery({
    queryKey: ['admin-create-summary'],
    queryFn: fetchCreateSummary,
    staleTime: 2 * 60 * 1000,
  })
}

export function prefetchCreateSummary(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ['admin-create-summary'],
    queryFn: fetchCreateSummary,
    staleTime: 2 * 60 * 1000,
  })
}

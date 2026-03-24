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
  totalModules: number
  publishedModules: number
  totalSections: number
}

async function fetchCreateSummary(): Promise<CreateSummaryData> {
  const [surveysRes, campaignsRes, draftCampaignsRes, subscribersRes, modulesRes, sectionsRes] = await Promise.all([
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
    supabase.from('dev_modules').select('id, status', { count: 'exact' }),
    supabase.from('dev_sections').select('id', { count: 'exact', head: true }),
  ])

  const modules = modulesRes.data ?? []

  return {
    totalSurveys: surveysRes.count ?? 0,
    campaignsSent: campaignsRes.count ?? 0,
    draftCampaigns: draftCampaignsRes.count ?? 0,
    subscribers: (subscribersRes.data as number) ?? 0,
    totalModules: modulesRes.count ?? 0,
    publishedModules: modules.filter((m: any) => m.status === 'published').length,
    totalSections: sectionsRes.count ?? 0,
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

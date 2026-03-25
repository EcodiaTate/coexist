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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped tables: email_campaigns, dev_modules, dev_sections
  const sb = supabase as any
  const [surveysRes, campaignsRes, draftCampaignsRes, subscribersRes, modulesRes, sectionsRes] = await Promise.all([
    supabase.from('surveys').select('id', { count: 'exact', head: true }),
    sb
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent'),
    sb
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft'),
    sb.rpc('email_subscriber_count'),
    sb.from('dev_modules').select('id, status', { count: 'exact' }),
    sb.from('dev_sections').select('id', { count: 'exact', head: true }),
  ])

  const modules = (modulesRes.data ?? []) as Record<string, unknown>[]

  return {
    totalSurveys: surveysRes.count ?? 0,
    campaignsSent: campaignsRes.count ?? 0,
    draftCampaigns: draftCampaignsRes.count ?? 0,
    subscribers: (subscribersRes.data as number) ?? 0,
    totalModules: modulesRes.count ?? 0,
    publishedModules: modules.filter((m) => m.status === 'published').length,
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

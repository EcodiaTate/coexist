import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const QUERY_KEY = ['onboarding-document']

export interface OnboardingDocumentConfig {
  url: string | null
  title: string
}

/**
 * Fetch the onboarding document config (stored in app_images with key 'onboarding_document').
 * Returns { url, title } where title is stored in the label column.
 */
export function useOnboardingDocument() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('app_images')
        .select('url, label')
        .eq('key', 'onboarding_document')
        .maybeSingle()
      if (error) throw error
      return {
        url: (data?.url as string) || null,
        title: (data?.label as string) || 'Onboarding Guide',
      } satisfies OnboardingDocumentConfig
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Admin mutation: upsert the onboarding document URL + title.
 */
export function useUpdateOnboardingDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const { error } = await (supabase as any)
        .from('app_images')
        .upsert(
          { key: 'onboarding_document', url, label: title },
          { onConflict: 'key' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['app-images'] })
    },
  })
}

/**
 * Admin mutation: remove the onboarding document config.
 */
export function useRemoveOnboardingDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('app_images')
        .delete()
        .eq('key', 'onboarding_document')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['app-images'] })
    },
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** All configurable image slot keys */
export type AppImageKey =
  | 'home_hero'
  | 'shop_hero'
  | 'placeholder_event'
  | 'placeholder_merch'
  | 'hero_welcome'
  | 'hero_download'
  | 'placeholder_collective'
  | 'onboarding_bg'
  | 'email_header'

interface AppImageRow {
  key: AppImageKey
  url: string
  label: string
}

/** Static fallbacks used when no admin image is configured */
const FALLBACKS: Record<AppImageKey, string> = {
  home_hero: '',
  shop_hero: '',
  placeholder_event: '/img/placeholder-event.jpg',
  placeholder_merch: '/img/placeholder-merch.jpg',
  hero_welcome: '/img/hero-welcome.jpg',
  hero_download: '/img/hero-download.jpg',
  placeholder_collective: '',
  onboarding_bg: '',
  email_header: '',
}

/**
 * Fetch all app images and return a map of key → url.
 * Falls back to static assets when a slot has no configured URL.
 * Cached for 10 minutes — images change rarely.
 */
export function useAppImages() {
  const query = useQuery({
    queryKey: ['app-images'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('app_images')
        .select('key, url, label')
      if (error) throw error

      const map: Record<string, string> = { ...FALLBACKS }
      for (const row of (data ?? []) as unknown as AppImageRow[]) {
        if (row.url) map[row.key] = row.url
      }
      return map
    },
    staleTime: 10 * 60 * 1000,
  })

  return query
}

/**
 * Get a single app image URL with fallback.
 * Convenience wrapper — prefer useAppImages() when you need multiple.
 */
export function useAppImage(key: AppImageKey): string {
  const { data } = useAppImages()
  return data?.[key] || FALLBACKS[key]
}

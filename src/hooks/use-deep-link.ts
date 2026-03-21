import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

/**
 * Map of custom-scheme paths → in-app routes.
 * Handles both universal links (https://coexist.app/...) and
 * custom scheme links (coexist://...).
 *
 * Supported deep links:
 *   coexist://events/{id}      → /events/{id}
 *   coexist://collectives/{id} → /collectives/{id}
 *   coexist://member/{id}      → /profile/{id}
 *   coexist://share/impact     → /profile (impact tab)
 *   coexist://share/event/{id} → /events/{id}
 */
function resolveDeepLinkPath(rawPath: string): string {
  // Normalise: strip leading/trailing slashes, lowercase
  const segments = rawPath.replace(/^\/+|\/+$/g, '').split('/')

  const [first, second, third] = segments

  switch (first) {
    case 'events':
      return `/events/${second || ''}`
    case 'collectives':
      return `/collectives/${second || ''}`
    case 'member':
      return `/profile/${second || ''}`
    case 'share':
      if (second === 'impact') return '/profile'
      if (second === 'event' && third) return `/events/${third}`
      return '/home'
    default:
      return `/${rawPath}`
  }
}

export function useDeepLink() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cleanup: (() => void) | undefined

    async function setup() {
      try {
        const { App } = await import('@capacitor/app')

        const listener = await App.addListener('appUrlOpen', (event) => {
          try {
            // Universal link: https://coexist.app/events/abc → /events/abc
            const url = new URL(event.url)
            const resolved = resolveDeepLinkPath(url.pathname)
            if (resolved && resolved !== '/') {
              navigate(resolved)
            }
          } catch {
            // Custom scheme: coexist://events/abc → /events/abc
            const slug = event.url.replace(/^[^:]+:\/\//, '')
            const resolved = resolveDeepLinkPath(slug)
            if (resolved && resolved !== '/') {
              navigate(resolved)
            }
          }
        })

        cleanup = () => listener.remove()
      } catch {
        // @capacitor/app not available - skip deep link setup
      }
    }

    setup()
    return () => cleanup?.()
  }, [navigate])
}

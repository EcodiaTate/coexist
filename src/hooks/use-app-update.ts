import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const APP_VERSION = '1.0.0'

interface UpdateStatus {
  updateAvailable: boolean
  latestVersion: string | null
  forceUpdate: boolean
  maintenanceMode: boolean
  maintenanceMessage?: string
}

/**
 * Checks for app updates and maintenance mode via Supabase config.
 * §42 items 66-67.
 */
export function useAppUpdate(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({
    updateAvailable: false,
    latestVersion: null,
    forceUpdate: false,
    maintenanceMode: false,
  })

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const { data, error } = await supabase
          .from('feature_flags' as any)
          .select('key, value')
          .in('key', [
            'app_min_version',
            'app_latest_version',
            'maintenance_mode',
            'maintenance_message',
          ])

        if (error || !data || cancelled) return

        const flags: Record<string, string> = {}
        for (const row of data as any[]) {
          flags[row.key] = row.value
        }

        const latest = flags['app_latest_version'] ?? APP_VERSION
        const minVersion = flags['app_min_version'] ?? '0.0.0'
        const maintenance = flags['maintenance_mode'] === 'true'

        setStatus({
          updateAvailable: compareVersions(APP_VERSION, latest) < 0,
          latestVersion: latest,
          forceUpdate: compareVersions(APP_VERSION, minVersion) < 0,
          maintenanceMode: maintenance,
          maintenanceMessage: flags['maintenance_message'],
        })
      } catch (err) {
        // Log but don't block - missing table or network blip shouldn't lock users out
        console.warn('[app-update] check failed:', err)
      }
    }

    check()
    // Re-check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return status
}

/** Simple semver comparison: returns -1, 0, or 1 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va < vb) return -1
    if (va > vb) return 1
  }
  return 0
}

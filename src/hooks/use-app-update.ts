const APP_VERSION = '1.0.0'

interface UpdateStatus {
  updateAvailable: boolean
  latestVersion: string | null
  forceUpdate: boolean
  maintenanceMode: boolean
  maintenanceMessage?: string
}

/**
 * App update & maintenance mode check.
 * Returns safe defaults — maintenance mode can be driven by a
 * dedicated config table or env var in the future.
 */
export function useAppUpdate(): UpdateStatus {
  return {
    updateAvailable: false,
    latestVersion: APP_VERSION,
    forceUpdate: false,
    maintenanceMode: false,
  }
}

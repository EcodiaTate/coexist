import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { resolveNotificationRoute } from '@/hooks/use-notifications'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PushNotificationToken {
  value: string
}

interface PushNotificationActionPerformed {
  actionId: string
  notification: {
    data?: Record<string, string>
    title?: string
    body?: string
  }
}

/* ------------------------------------------------------------------ */
/*  Capacitor Push Notifications - dynamic import                      */
/* ------------------------------------------------------------------ */

let PushNotifications: {
  requestPermissions: () => Promise<{ receive: string }>
  register: () => Promise<void>
  getDeliveredNotifications: () => Promise<{ notifications: unknown[] }>
  removeAllDeliveredNotifications: () => Promise<void>
  addListener: (event: string, handler: (...args: unknown[]) => void) => Promise<{ remove: () => void }>
} | null = null

async function loadPushPlugin() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const mod = await import('@capacitor/push-notifications')
    PushNotifications = mod.PushNotifications as typeof PushNotifications
    return PushNotifications
  } catch {
    console.warn('[push] @capacitor/push-notifications not available')
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Token storage (module-level, shared by both hooks)                 */
/* ------------------------------------------------------------------ */

function getDeviceInfo(): Record<string, string> {
  return {
    platform: Capacitor.getPlatform(),
    os_version: (navigator as { userAgent?: string }).userAgent ?? 'unknown',
  }
}

async function storeToken(userId: string, token: string, platform: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        device_info: getDeviceInfo(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    )

  if (error) {
    console.error('[push] Failed to store token:', error)
  }
}

async function removeToken(userId: string, token: string) {
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token)
}

async function removeAllTokensForUser(userId: string) {
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
}

async function clearBadgeCount() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const plugin = await loadPushPlugin()
    await plugin?.removeAllDeliveredNotifications()
  } catch {
    // badge API may not be available
  }
}

/* ------------------------------------------------------------------ */
/*  usePushRegistration — mount ONCE at app root (AppShell)            */
/*                                                                     */
/*  Handles:                                                           */
/*    - Requesting permission + registering with FCM/APNs              */
/*    - Listening for token refresh and persisting to push_tokens      */
/*    - Deep-link routing when user taps a notification                */
/*    - Re-registering on app resume (handles token rotation)          */
/*    - Clearing badge count on foreground                             */
/* ------------------------------------------------------------------ */

export function usePushRegistration() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const tokenRef = useRef<string | null>(null)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])

  useEffect(() => {
    if (!user) return

    let mounted = true

    async function setup() {
      const plugin = await loadPushPlugin()
      if (!plugin || !mounted) return

      const platform = Capacitor.getPlatform() // 'ios' | 'android'

      // Token received (initial registration or refresh)
      const regListener = await plugin.addListener(
        'registration',
        (token: unknown) => {
          const t = token as PushNotificationToken
          tokenRef.current = t.value
          storeToken(user!.id, t.value, platform)
        },
      )

      // Registration error
      const errListener = await plugin.addListener(
        'registrationError',
        (err: unknown) => {
          console.error('[push] registration error:', err)
        },
      )

      // Notification received while app is open (foreground)
      const receivedListener = await plugin.addListener(
        'pushNotificationReceived',
        (_notification: unknown) => {
          // Foreground notifications - could show in-app toast
        },
      )

      // Notification tapped — deep link routing
      const actionListener = await plugin.addListener(
        'pushNotificationActionPerformed',
        (action: unknown) => {
          const a = action as PushNotificationActionPerformed
          const route = resolveNotificationRoute(
            a.notification.data?.type ?? '',
            a.notification.data,
          )
          navigate(route)
        },
      )

      listenersRef.current = [regListener, errListener, receivedListener, actionListener]

      // Try to register (will use existing permission or silently succeed)
      try {
        const perm = await plugin.requestPermissions()
        if (perm.receive === 'granted') {
          await plugin.register()
        }
      } catch {
        // Permission not yet granted — that's fine, we'll prompt later
      }
    }

    setup()

    // Clear badge count when app opens
    clearBadgeCount()

    // Re-register on app resume to ensure token is current
    let resumeListener: { remove: () => void } | null = null
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        if (!mounted) return
        App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && mounted) {
            clearBadgeCount()
            try {
              const plugin = await loadPushPlugin()
              if (plugin) {
                const perm = await plugin.requestPermissions()
                if (perm.receive === 'granted') {
                  await plugin.register()
                }
              }
            } catch {
              // ignore
            }
          }
        }).then((l) => {
          if (mounted) {
            resumeListener = l
          } else {
            l.remove()
          }
        })
      })
    }

    return () => {
      mounted = false
      listenersRef.current.forEach((l) => l.remove())
      listenersRef.current = []
      resumeListener?.remove()
    }
  }, [user, navigate])

  return { tokenRef }
}

/* ------------------------------------------------------------------ */
/*  usePush — imperative actions (settings page, logout, dev tools)    */
/*                                                                     */
/*  NOT responsible for registration side-effects — that's             */
/*  usePushRegistration above. This hook is for explicit user actions. */
/* ------------------------------------------------------------------ */

export function usePush() {
  const { user } = useAuth()

  /** Prompt for permission (call at a strategic moment, e.g. after onboarding) */
  const requestPermission = useCallback(async () => {
    const plugin = await loadPushPlugin()
    if (!plugin) return false

    const result = await plugin.requestPermissions()
    if (result.receive === 'granted') {
      await plugin.register()
      return true
    }
    return false
  }, [])

  /** Remove this device's token on logout */
  const unregister = useCallback(async () => {
    if (user) {
      // Best-effort: remove all tokens for this user (covers multi-device)
      await removeAllTokensForUser(user.id)
    }
  }, [user])

  /** Clear badge/notification tray */
  const clearBadge = useCallback(async () => {
    await clearBadgeCount()
  }, [])

  return {
    requestPermission,
    unregister,
    clearBadgeCount: clearBadge,
  }
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader2, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OGMeta } from '@/components/og-meta'
import { Button } from '@/components/button'

type CallbackState = 'processing' | 'success' | 'error'

/**
 * Handles auth callback redirects from Supabase email links
 * (email verification, magic links, password recovery).
 *
 * On web: Supabase auto-picks up the hash fragment tokens and fires
 * onAuthStateChange. We just wait for the session, then redirect.
 *
 * On mobile browser: After session is confirmed, offer to open the
 * native app via deep link (coexist://home).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const [state, setState] = useState<CallbackState>('processing')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Supabase JS client automatically detects the hash fragment
    // (#access_token=...&type=...) and exchanges it for a session.
    // We listen for the auth state change to know when it's done.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setState('success')

        // If the user is on web (not inside the native app), check
        // if this is a recovery flow  redirect to reset-password page.
        if (event === 'PASSWORD_RECOVERY') {
          setTimeout(() => navigate('/reset-password', { replace: true }), 1500)
          return
        }

        // On web, just redirect to home after a brief success message.
        if (!isMobileBrowser()) {
          setTimeout(() => navigate('/', { replace: true }), 1500)
        }
        // On mobile browser, we show the "Open in app" button instead.
      }
    })

    // Safety timeout  if nothing happens after 30s, something went wrong.
    const timeout = setTimeout(() => {
      setState((prev) => {
        if (prev === 'processing') {
          setErrorMsg('Verification timed out. The link may have expired.')
          return 'error'
        }
        return prev
      })
    }, 30_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white">
      <OGMeta title="Verifying..." description="Verifying your Co-Exist account." noindex />

      {state === 'processing' && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center text-center"
        >
          <Loader2 className="w-12 h-12 text-primary-400 animate-spin" />
          <p className="mt-4 text-primary-400 font-medium">Verifying your account...</p>
        </motion.div>
      )}

      {state === 'success' && (
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="mt-6 font-heading text-2xl font-bold text-primary-800">
            You're verified!
          </h1>
          <p className="mt-2 text-primary-400">
            Your account has been confirmed.
          </p>

          {isMobileBrowser() ? (
            <div className="mt-8 w-full space-y-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<Smartphone size={18} />}
                onClick={() => {
                  window.location.href = 'coexist://home'
                }}
              >
                Open Co-Exist App
              </Button>
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => navigate('/', { replace: true })}
              >
                Continue on web
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-primary-300">Redirecting...</p>
          )}
        </motion.div>
      )}

      {state === 'error' && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-error" />
          </div>
          <h1 className="mt-6 font-heading text-2xl font-bold text-primary-800">
            Something went wrong
          </h1>
          <p className="mt-2 text-primary-400">{errorMsg}</p>
          <div className="mt-8 w-full space-y-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to login
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/** Detect if the user is on a mobile browser (not inside the Capacitor app). */
function isMobileBrowser(): boolean {
  if (Capacitor.isNativePlatform()) return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

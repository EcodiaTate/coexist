import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Mail, Leaf } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { cn } from '@/lib/cn'

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading, signIn, signInWithGoogle, signInWithApple, signInWithMagicLink } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  useEffect(() => {
    if (user && !isLoading) {
      navigate(from, { replace: true })
    }
  }, [user, isLoading, navigate, from])

  const canSubmit = email.trim() && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    const { error: authError } = await signIn(email, password)

    if (authError) {
      setError(authError.message)
      setIsSubmitting(false)
    }
  }

  async function handleSocial(provider: 'google' | 'apple') {
    setError(null)
    const fn = provider === 'google' ? signInWithGoogle : signInWithApple
    const { error: authError } = await fn()
    if (authError) setError(authError.message)
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError('Enter your email first')
      return
    }
    setError(null)
    const { error: authError } = await signInWithMagicLink(email)
    if (authError) {
      setError(authError.message)
    } else {
      setMagicLinkSent(true)
    }
  }

  const motionProps = shouldReduceMotion ? {} : fadeUp

  return (
    <div className="min-h-dvh flex flex-col bg-primary-50 relative overflow-hidden">
      {/* Organic background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-primary-300/20 blur-3xl" />
        <div className="absolute top-32 right-8 text-primary-200/30">
          <Leaf size={64} strokeWidth={1} style={{ transform: 'rotate(35deg)' }} />
        </div>
        <div className="absolute top-48 left-6 text-primary-200/20">
          <Leaf size={40} strokeWidth={1} style={{ transform: 'rotate(-20deg)' }} />
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        variants={shouldReduceMotion ? undefined : stagger}
        initial="initial"
        animate="animate"
        className="relative flex-1 flex flex-col max-w-md w-full mx-auto"
      >
        {/* Top section - back button + branding */}
        <div
          className="px-5 pt-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <motion.button
            type="button"
            onClick={() => navigate('/welcome')}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm',
              'text-primary-800 shadow-sm',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </motion.button>
        </div>

        {/* Hero area */}
        <motion.div {...motionProps} className="px-8 pt-6 pb-2">
          <h1 className="text-h2 font-bold text-primary-900 tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-body text-primary-400">
            Sign in to continue your journey
          </p>
        </motion.div>

        {/* Main form area */}
        <div className="flex-1 px-5 pt-4">
          {/* Social buttons */}
          <motion.div {...motionProps} className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSocial('google')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2.5',
                'h-12 rounded-2xl bg-white',
                'text-sm text-primary-800 font-semibold',
                'shadow-sm active:shadow-none active:scale-[0.98]',
                'transition-all duration-150',
                'cursor-pointer',
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleSocial('apple')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2.5',
                'h-12 rounded-2xl bg-white',
                'text-sm text-primary-800 font-semibold',
                'shadow-sm active:shadow-none active:scale-[0.98]',
                'transition-all duration-150',
                'cursor-pointer',
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div {...motionProps} className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-primary-200/60" />
            <span className="text-xs text-primary-300 font-medium uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-primary-200/60" />
          </motion.div>

          {/* Form fields in a card */}
          <motion.div
            {...motionProps}
            className="bg-white rounded-2xl p-4 shadow-sm space-y-3"
          >
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleMagicLink}
                className="flex items-center gap-1.5 text-xs text-primary-400 font-semibold hover:text-primary-600 transition-colors cursor-pointer"
              >
                <Mail size={13} />
                {magicLinkSent ? 'Link sent!' : 'Magic link'}
              </button>
              <Link
                to="/forgot-password"
                className="text-xs text-primary-400 font-semibold hover:text-primary-600 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 text-center font-medium"
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Bottom CTA */}
        <motion.div
          {...motionProps}
          className="px-5 py-6"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={!canSubmit}
            className="!rounded-2xl !h-14 !text-base"
          >
            Log In
          </Button>

          <p className="mt-5 text-center text-sm text-primary-400">
            New to Co-Exist?{' '}
            <Link to="/signup" className="text-primary-600 font-bold hover:underline">
              Create account
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </div>
  )
}

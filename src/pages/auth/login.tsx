import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Header } from '@/components/header'
import { OGMeta } from '@/components/og-meta'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { cn } from '@/lib/cn'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading, signIn, signInWithGoogle, signInWithApple, signInWithMagicLink } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

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
    }
    // Always reset — on success, onAuthStateChange handles navigation;
    // if that's slow the user can retry rather than staring at a spinner.
    setIsSubmitting(false)
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

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      <OGMeta
        title="Log In"
        description="Sign in to your Co-Exist account. Access conservation events, connect with your collective, and track your environmental impact across Australia."
        canonicalPath="/login"
        noindex
      />

      {/* ── Full-page branded background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500 via-secondary-700 to-primary-950" />

      {/* ── Bold geometric shapes ── */}
      {/* Big filled circle - top-right */}
      <motion.div
        initial={rm ? {} : { scale: 0.6, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.5, ease: 'easeOut' } }}
        className="absolute -right-[15%] -top-[12%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] rounded-full bg-white/[0.06]"
      />
      {/* Large ring - bottom-left */}
      <motion.div
        initial={rm ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.8, delay: 0.3, ease: 'easeOut' } }}
        className="absolute -left-[20%] -bottom-[10%] w-[70vw] h-[70vw] max-w-[650px] max-h-[650px] rounded-full border border-white/[0.08]"
      />
      {/* Inner concentric ring */}
      <motion.div
        initial={rm ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.07, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.8, delay: 0.5, ease: 'easeOut' } }}
        className="absolute -left-[14%] -bottom-[4%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full border border-white/[0.06]"
      />
      {/* Small ring - top-left accent */}
      <motion.div
        initial={rm ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.06, 1], opacity: 1 }}
        transition={{ scale: { duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }, opacity: { duration: 2, delay: 0.8, ease: 'easeOut' } }}
        className="absolute left-[8%] top-[6%] w-[25vw] h-[25vw] max-w-[200px] max-h-[200px] rounded-full border border-white/[0.05]"
      />
      {/* Small filled accent - mid-left */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute left-[5%] top-[45%] w-[60px] h-[60px] rounded-full bg-white/[0.04]"
      />
      {/* Floating dots */}
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ y: [0, -7, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.8, delay: 1.2 } }}
        className="absolute right-[20%] top-[18%] w-2 h-2 rounded-full bg-white/30"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ y: [0, 5, 0], opacity: [0.2, 0.45, 0.2] }}
        transition={{ y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }, opacity: { duration: 0.8, delay: 1.6 } }}
        className="absolute left-[15%] bottom-[25%] w-1.5 h-1.5 rounded-full bg-white/25"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ y: [0, -5, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }, opacity: { duration: 0.8, delay: 2 } }}
        className="absolute right-[10%] bottom-[35%] w-2 h-2 rounded-full bg-white/20"
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-[440px] mx-auto">
        <motion.form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col"
        >
          {/* Back button */}
          <Header title="" back onBack={() => navigate('/welcome')} transparent />

          {/* Wordmark + heading */}
          <div className="px-6 pt-10 pb-2 flex flex-col items-center text-center">
            <motion.img
              src="/logos/white-wordmark.webp"
              alt="Co-Exist"
              initial={rm ? {} : { opacity: 0, y: 25, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-16 sm:h-20 w-auto object-contain mb-8"
            />
            <motion.h1
              initial={rm ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-[28px] font-bold text-white tracking-tight leading-tight"
            >
              Welcome back
            </motion.h1>
            <motion.p
              initial={rm ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
              className="mt-2 text-[15px] text-white/40"
            >
              Sign in to continue
            </motion.p>
          </div>

          {/* Form body */}
          <motion.div
            initial={rm ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 px-5 pt-8"
          >
            {/* Social sign-in */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSocial('google')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2.5',
                  'h-[52px] rounded-2xl',
                  'bg-white/[0.15]',
                  'text-sm text-white font-semibold',
                  'active:scale-[0.97] transition-transform duration-200',
                  'cursor-pointer hover:bg-white/[0.18]',
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
                  'h-[52px] rounded-2xl',
                  'bg-white/[0.15]',
                  'text-sm text-white font-semibold',
                  'active:scale-[0.97] transition-transform duration-200',
                  'cursor-pointer hover:bg-white/[0.18]',
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25z" />
                </svg>
                Apple
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-7">
              <div className="flex-1 h-px bg-white/[0.10]" />
              <span className="text-[11px] text-white/30 font-semibold uppercase tracking-[0.15em]">or</span>
              <div className="flex-1 h-px bg-white/[0.10]" />
            </div>

            {/* Form card - glassmorphic */}
            <div className="bg-white/[0.12] rounded-2xl p-5 space-y-4">
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

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={handleMagicLink}
                  className="flex items-center gap-1.5 text-xs text-white/50 font-semibold hover:text-white/70 active:scale-[0.97] transition-[colors,transform] duration-150 cursor-pointer"
                >
                  <Mail size={13} />
                  {magicLinkSent ? 'Link sent!' : 'Magic link'}
                </button>
                <Link
                  to="/forgot-password"
                  className="text-xs text-white/50 font-semibold hover:text-white/70 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={rm ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 px-4 py-3 bg-error-500/25 rounded-xl text-sm text-white text-center font-medium"
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={rm ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.3, ease: 'easeOut' }}
            className="px-5 pt-6 pb-6"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!canSubmit}
              className="!rounded-2xl !h-[54px] !text-[15px] !font-bold"
            >
              Log In
            </Button>

            <p className="mt-6 text-center text-sm text-white/40">
              New to Co-Exist?{' '}
              <Link to="/signup" className="text-white/80 font-bold hover:text-white transition-colors">
                Create account
              </Link>
            </p>
          </motion.div>
        </motion.form>
      </div>
    </div>
  )
}

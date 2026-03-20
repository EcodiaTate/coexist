import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Mail, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/button'

export default function EmailVerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const email = (location.state as { email?: string })?.email ?? ''

  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleResend() {
    if (!email || resending) return
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white">
      {/* Animated envelope */}
      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
          <Mail className="w-12 h-12 text-primary-400" />
        </div>
        {/* Animated ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary-300"
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 1, opacity: 0.6 }}
          animate={
            shouldReduceMotion
              ? { opacity: 0 }
              : { scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 2, repeat: Infinity, ease: 'easeOut' }
          }
        />
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-center max-w-sm"
      >
        <h1 className="font-heading text-2xl font-bold text-primary-800">
          Check your inbox
        </h1>
        <p className="mt-3 text-primary-400 leading-relaxed">
          We've sent a verification link to{' '}
          {email ? (
            <span className="font-medium text-primary-800">{email}</span>
          ) : (
            'your email'
          )}
          . Tap the link to verify your account.
        </p>
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 space-y-3 w-full max-w-sm"
      >
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<RefreshCw size={18} className={resending ? 'animate-spin' : ''} />}
          loading={resending}
          onClick={handleResend}
          disabled={resent}
        >
          {resent ? 'Email sent!' : 'Resend verification email'}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => navigate('/login')}
        >
          Back to login
        </Button>
      </motion.div>

      <p className="mt-8 text-xs text-primary-400 text-center max-w-xs">
        Didn't receive the email? Check your spam folder or try a different email address.
      </p>
    </div>
  )
}

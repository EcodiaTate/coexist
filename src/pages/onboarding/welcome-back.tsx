import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Hand, Calendar, Users, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export default function WelcomeBackPage() {
  const navigate = useNavigate()
  const { user, profile, markOnboardingComplete } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  // Mark onboarding done on mount — this page is for returning users
  // whose profile already has onboarding_completed but the local flag was lost
  useEffect(() => { markOnboardingComplete() }, [markOnboardingComplete])

  const { data: missedData, isLoading } = useQuery({
    queryKey: ['welcome-back', user?.id],
    queryFn: async () => {
      if (!user) return null

      // Fetch events that happened while away
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [eventsRes] = await Promise.all([
        supabase
          // eslint-disable-next-line @typescript-eslint/prefer-as-const
          .from('events' as 'events')
          .select('id, title', { count: 'exact' })
          .eq('status', 'completed')
          .gte('date_start', thirtyDaysAgo.toISOString())
          .limit(3),
      ])

      return {
        missedEventsCount: eventsRes.count ?? 0,
        recentEvents: eventsRes.data ?? [],
      }
    },
    enabled: !!user,
  })
  const showLoading = useDelayedLoading(isLoading)

  const displayName = profile?.display_name ?? 'there'

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <motion.div
        className="flex-1 flex flex-col px-6 pt-12"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Wave emoji */}
        <motion.div
          variants={{
            hidden: { scale: 0.5, opacity: 0, rotate: -20 },
            visible: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } },
          }}
          className="mx-auto mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center">
            <Hand className="w-10 h-10 text-primary-400" />
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-heading text-2xl font-bold text-primary-800 text-center"
        >
          Welcome back, {displayName}!
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-2 text-primary-400 text-center max-w-xs mx-auto"
        >
          We missed you. Here's what's been happening while you were away.
        </motion.p>

        {/* What you missed */}
        <div className="mt-8 space-y-3">
          {showLoading ? (
            <Skeleton variant="list-item" count={3} />
          ) : missedData ? (
            <>
              {missedData.missedEventsCount > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
                    <Calendar size={20} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary-800">
                      {missedData.missedEventsCount} events happened
                    </p>
                    <p className="text-xs text-primary-400">Your collective's been busy!</p>
                  </div>
                </motion.div>
              )}


              <motion.div
                variants={fadeUp}
                className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-200 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-primary-800">
                    Your collective is waiting
                  </p>
                  <p className="text-xs text-primary-400">Jump into the next event!</p>
                </div>
              </motion.div>
            </>
          ) : null}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-6 py-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} />}
          onClick={() => navigate('/', { replace: true })}
        >
          Let's get back to it
        </Button>
      </motion.div>
    </div>
  )
}

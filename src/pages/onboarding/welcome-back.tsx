import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Hand, Calendar, Award, Users, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'

export default function WelcomeBackPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const { data: missedData, isLoading } = useQuery({
    queryKey: ['welcome-back', user?.id],
    queryFn: async () => {
      if (!user) return null

      // Fetch events that happened while away
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [eventsRes, badgesRes] = await Promise.all([
        supabase
          .from('events' as any)
          .select('id, title', { count: 'exact' })
          .eq('status', 'completed')
          .gte('date_start', thirtyDaysAgo.toISOString())
          .limit(3),
        supabase
          .from('badge_awards' as any)
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('awarded_at', thirtyDaysAgo.toISOString()),
      ])

      return {
        missedEventsCount: eventsRes.count ?? 0,
        recentEvents: eventsRes.data ?? [],
        newBadgesCount: badgesRes.count ?? 0,
      }
    },
    enabled: !!user,
  })

  const displayName = profile?.display_name ?? 'there'

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="flex-1 flex flex-col px-6 pt-12">
        {/* Wave emoji */}
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0.5, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-white border border-primary-400 flex items-center justify-center">
            <Hand className="w-10 h-10 text-primary-400" />
          </div>
        </motion.div>

        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-heading text-2xl font-bold text-primary-800 text-center"
        >
          Welcome back, {displayName}!
        </motion.h1>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-2 text-primary-400 text-center max-w-xs mx-auto"
        >
          We missed you. Here's what's been happening while you were away.
        </motion.p>

        {/* What you missed */}
        <div className="mt-8 space-y-3">
          {isLoading ? (
            <Skeleton variant="list-item" count={3} />
          ) : missedData ? (
            <>
              {missedData.missedEventsCount > 0 && (
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-primary-100"
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

              {missedData.newBadgesCount > 0 && (
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.58 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-primary-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                    <Award size={20} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary-800">
                      {missedData.newBadgesCount} new badge{missedData.newBadgesCount === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-primary-400">Check your profile to see them.</p>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.66 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-primary-100"
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
      </div>

      {/* CTA */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, MapPin, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import type { Database } from '@/types/database.types'

type Event = Database['public']['Tables']['events']['Row']

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

interface StepFirstEventProps {
  collectiveId: string | null
  onNext: () => void
  onSkip: () => void
}

export function StepFirstEvent({ collectiveId, onNext, onSkip }: StepFirstEventProps) {
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const queryClient = useQueryClient()

  const { data: events, isLoading } = useQuery({
    queryKey: ['onboarding-events', collectiveId],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })
        .limit(5)

      if (collectiveId) {
        query = query.eq('collective_id', collectiveId)
      }

      const { data } = await query
      return data as Event[]
    },
  })
  const showLoading = useDelayedLoading(isLoading)

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('event_registrations')
        .insert({ event_id: eventId, user_id: user.id, status: 'registered' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-events'] })
    },
  })

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-8 min-h-0">
      <motion.div
        className="flex-1 overflow-y-auto"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold text-primary-800">
          Find your first event
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-primary-400 leading-relaxed">
          Jump in! One tap to RSVP.
        </motion.p>

        <div className="mt-6 space-y-3">
          {showLoading ? (
            <Skeleton variant="list-item" count={3} />
          ) : events && events.length > 0 ? (
            events.map((event) => (
              <motion.div
                key={event.id}
                variants={fadeUp}
                className="flex items-start gap-3 p-4 rounded-xl shadow-sm bg-white"
              >
                <div className="w-12 h-12 rounded-lg bg-accent-100 flex flex-col items-center justify-center shrink-0">
                  <Calendar size={16} className="text-primary-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-800 truncate">{event.title}</p>
                  <p className="text-xs text-primary-400 mt-0.5">{formatDate(event.date_start)}</p>
                  {event.address && (
                    <p className="flex items-center gap-1 text-xs text-primary-400 mt-0.5">
                      <MapPin size={10} />
                      <span className="truncate">{event.address}</span>
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={rsvpMutation.isPending ? 'ghost' : 'primary'}
                  onClick={() => rsvpMutation.mutate(event.id)}
                  disabled={rsvpMutation.isPending}
                  icon={rsvpMutation.isSuccess ? <Check size={14} /> : undefined}
                >
                  {rsvpMutation.isSuccess ? 'Going' : 'RSVP'}
                </Button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-primary-400">No upcoming events right now.</p>
              <p className="text-xs text-primary-400 mt-1">Don't worry - we'll notify you when one pops up!</p>
            </div>
          )}
        </div>
      </motion.div>

      <div
        className="py-6 space-y-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Continue
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

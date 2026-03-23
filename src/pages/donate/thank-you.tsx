import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, Share2, ArrowRight, PartyPopper, Calendar, Users, Trophy } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { WhatsNext } from '@/components/whats-next'
import { cn } from '@/lib/cn'
import { getImpactMessage } from '@/types/donations'

/* ------------------------------------------------------------------ */
/*  Confetti burst (simple particles)                                  */
/* ------------------------------------------------------------------ */

const PARTICLE_COUNT = 24
const COLORS = ['#5a835a', '#b07d46', '#e97c28', '#4ade80', '#60a5fa']

function Confetti() {
  const shouldReduceMotion = useReducedMotion()
  const [particles] = useState(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    size: 6 + Math.random() * 8,
    color: COLORS[i % COLORS.length],
    rotation: Math.random() * 360,
    duration: 2.5 + Math.random(),
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
  })))
  if (shouldReduceMotion) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: '110vh',
            rotate: p.rotation + 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Thank you page                                                     */
/* ------------------------------------------------------------------ */

export default function DonateThankYouPage() {
  const [searchParams] = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const [showConfetti, setShowConfetti] = useState(true)

  const amount = Number(searchParams.get('amount') ?? 25)
  const impactMessage = getImpactMessage(amount)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  const handleShare = async () => {
    const text = `I just donated $${amount} to Co-Exist Australia! Every dollar goes to conservation. Join me: coexistaus.org/donate`
    if (navigator.share) {
      try {
        await navigator.share({ text, url: 'https://coexistaus.org/donate' })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <Page header={<Header title="Thank You" back />}>
      {showConfetti && <Confetti />}

      <div className="max-w-lg mx-auto w-full">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center justify-center flex-1 py-12 text-center"
        >
          {/* Heart icon */}
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary-100">
              <PartyPopper size={36} className="text-primary-400" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-heading text-2xl font-bold text-primary-800"
          >
            Thank you!
          </motion.h1>

          {/* Amount */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 text-lg font-semibold text-primary-400"
          >
            ${amount} donated
          </motion.p>

          {/* Impact equivalency */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'mt-4 px-5 py-4 rounded-2xl w-full',
              'bg-gradient-to-br from-white to-white',
              'border border-primary-100',
            )}
          >
            <p className="text-sm text-primary-800 leading-relaxed">
              <Heart size={14} className="inline-block mr-1 text-primary-400 -mt-0.5" />
              {impactMessage}
            </p>
          </motion.div>

          {/* Points notification */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4 text-sm text-primary-400"
          >
            +{Math.floor(amount)} points earned
          </motion.p>

          {/* Share */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 w-full max-w-xs"
          >
            <Button
              variant="primary"
              fullWidth
              icon={<Share2 size={16} />}
              onClick={handleShare}
            >
              Share your impact
            </Button>
          </motion.div>

          {/* What's next? */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-6 w-full"
          >
            <WhatsNext
              suggestions={[
                {
                  label: 'Find an Event',
                  description: 'Put your donation into action',
                  icon: <Calendar size={18} />,
                  to: '/events',
                },
                {
                  label: 'View Donor Wall',
                  description: 'See the community of supporters',
                  icon: <Users size={18} />,
                  to: '/donate/donors',
                },
                {
                  label: 'View Your Impact',
                  description: 'See how your contributions add up',
                  icon: <Trophy size={18} />,
                  to: '/profile',
                },
              ]}
            />
          </motion.div>
        </motion.div>
      </div>
    </Page>
  )
}

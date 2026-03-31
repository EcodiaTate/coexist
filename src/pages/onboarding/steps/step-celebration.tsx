import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { PartyPopper, ArrowRight } from 'lucide-react'
import { Button } from '@/components/button'
import { APP_NAME } from '@/lib/constants'
import { adminStagger as stagger, fadeUp } from '@/lib/admin-motion'

interface StepCelebrationProps {
  onContinue: () => void
}

// Confetti particle component
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['text-neutral-400', 'text-neutral-300', 'text-neutral-500', 'text-success', 'text-neutral-200']
  const color = colors[index % colors.length]
  const [rand] = useState(() => ({
    left: `${10 + Math.random() * 80}%`,
    delay: Math.random() * 0.8,
    direction: Math.random() > 0.5 ? 1 : -1,
    xDrift: (Math.random() - 0.5) * 200,
    duration: 2 + Math.random() * 1.5,
  }))

  return (
    <motion.div
      className={`absolute w-2 h-2 rounded-full bg-current ${color}`}
      style={{ left: rand.left, top: '-5%' }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: '110vh',
        opacity: [1, 1, 0],
        rotate: 360 * rand.direction,
        x: rand.xDrift,
      }}
      transition={{
        duration: rand.duration,
        delay: rand.delay,
        ease: 'easeIn',
      }}
    />
  )
}

export function StepCelebration({ onContinue }: StepCelebrationProps) {
  const shouldReduceMotion = useReducedMotion()
  const [showConfetti, setShowConfetti] = useState(!shouldReduceMotion)

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  return (
    <motion.div
      className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white relative overflow-hidden"
      variants={shouldReduceMotion ? undefined : stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      <motion.div
        variants={{
          hidden: { scale: 0.5, opacity: 0 },
          visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 15 } },
        }}
      >
        <div className="w-24 h-24 rounded-full bg-neutral-50 flex items-center justify-center">
          <PartyPopper className="w-12 h-12 text-neutral-400" />
        </div>
      </motion.div>

      <motion.h1
        variants={fadeUp}
        className="mt-8 font-heading text-3xl font-bold text-neutral-900 text-center"
      >
        You're all set!
      </motion.h1>

      <motion.p
        variants={fadeUp}
        className="mt-3 text-neutral-500 text-center max-w-xs leading-relaxed"
      >
        Welcome to {APP_NAME}. You're now part of a movement protecting Australia's environment.
      </motion.p>

      <motion.p
        variants={fadeUp}
        className="mt-4 text-sm font-medium text-neutral-400"
      >
        Explore. Connect. Protect.
      </motion.p>

      <motion.div
        variants={fadeUp}
        className="mt-12 w-full max-w-sm"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} />}
          onClick={onContinue}
        >
          Let's go
        </Button>
      </motion.div>
    </motion.div>
  )
}

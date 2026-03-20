import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { PartyPopper, Leaf, ArrowRight } from 'lucide-react'
import { Button } from '@/components/button'
import { APP_NAME } from '@/lib/constants'

interface StepCelebrationProps {
  onContinue: () => void
}

// Confetti particle component
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['text-primary-400', 'text-primary-400', 'text-primary-400', 'text-success', 'text-primary-300']
  const color = colors[index % colors.length]
  const left = `${10 + Math.random() * 80}%`
  const delay = Math.random() * 0.8

  return (
    <motion.div
      className={`absolute w-2 h-2 rounded-full bg-current ${color}`}
      style={{ left, top: '-5%' }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: '110vh',
        opacity: [1, 1, 0],
        rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
        x: (Math.random() - 0.5) * 200,
      }}
      transition={{
        duration: 2 + Math.random() * 1.5,
        delay,
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
          <PartyPopper className="w-12 h-12 text-primary-400" />
        </div>
      </motion.div>

      <motion.h1
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 font-heading text-3xl font-bold text-primary-800 text-center"
      >
        You're all set!
      </motion.h1>

      <motion.p
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-3 text-primary-400 text-center max-w-xs leading-relaxed"
      >
        Welcome to {APP_NAME}. You're now part of a movement protecting Australia's environment.
      </motion.p>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-4 flex items-center gap-2 text-primary-400"
      >
        <Leaf size={16} />
        <span className="text-sm font-medium">Explore. Connect. Protect.</span>
        <Leaf size={16} />
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
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
    </div>
  )
}

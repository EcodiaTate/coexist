import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Leaf, ArrowRight } from 'lucide-react'
import { Button } from '@/components/button'
import { APP_NAME, TAGLINE } from '@/lib/constants'
import { cn } from '@/lib/cn'

const floatingLeaves = [
  { x: '10%', y: '15%', size: 24, rotate: -30, delay: 0 },
  { x: '80%', y: '20%', size: 18, rotate: 45, delay: 0.3 },
  { x: '25%', y: '70%', size: 20, rotate: 15, delay: 0.6 },
  { x: '70%', y: '75%', size: 16, rotate: -60, delay: 0.9 },
  { x: '50%', y: '40%', size: 14, rotate: 30, delay: 1.2 },
]

export default function WelcomePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden bg-white">
      {/* Nature background photo */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src="/img/hero-welcome.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/80" />
      </div>

      {/* Floating leaf decorations */}
      {floatingLeaves.map((leaf, i) => (
        <motion.div
          key={i}
          className="absolute text-primary-300/40 pointer-events-none"
          style={{ left: leaf.x, top: leaf.y }}
          initial={shouldReduceMotion ? { opacity: 0.4 } : { opacity: 0, y: 20 }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.4 }
              : {
                  opacity: 0.4,
                  y: [0, -8, 0],
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  opacity: { duration: 1, delay: leaf.delay },
                  y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: leaf.delay },
                }
          }
        >
          <Leaf size={leaf.size} style={{ transform: `rotate(${leaf.rotate}deg)` }} />
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Wordmark */}
        <motion.img
          src="/logos/black-wordmark.png"
          alt={APP_NAME}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-[70vw] max-w-md sm:w-[50vw] sm:max-w-lg h-auto"
        />

        {/* Tagline */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-sm sm:text-base text-primary-400 font-medium tracking-[0.2em] uppercase"
        >
          {TAGLINE}
        </motion.p>

        {/* Description */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 max-w-xs text-center text-primary-400 leading-relaxed"
        >
          Join thousands of young Australians protecting our environment, one event at a time.
        </motion.p>
      </div>

      {/* Bottom CTAs */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className={cn(
          'relative px-6 pb-10 space-y-3',
          'safe-bottom',
          'flex flex-col items-center',
        )}
        style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="primary"
          size="lg"
          icon={<ArrowRight size={20} />}
          onClick={() => navigate('/signup')}
          className="w-56"
        >
          Get Started
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={() => navigate('/login')}
        >
          I have an account
        </Button>
      </motion.div>
    </div>
  )
}

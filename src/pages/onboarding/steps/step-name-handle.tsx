import { motion, useReducedMotion } from 'framer-motion'
import { Input } from '@/components/input'
import { Button } from '@/components/button'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

interface StepNameHandleProps {
  displayName: string
  instagramHandle: string
  onChange: (name: string, handle: string) => void
  onNext: () => void
  onSkip: () => void
}

export function StepNameHandle({ displayName, instagramHandle, onChange, onNext, onSkip }: StepNameHandleProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="flex-1 flex flex-col px-6 pt-8">
      <motion.div
        className="flex-1"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold text-primary-800">
          What should we call you?
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-primary-400">
          This is how you'll appear in your collective.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 space-y-4">
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => onChange(e.target.value, instagramHandle)}
            autoComplete="name"
          />

          <Input
            label="Instagram handle (optional)"
            value={instagramHandle}
            onChange={(e) => onChange(displayName, e.target.value)}
            placeholder="@yourhandle"
          />
        </motion.div>
      </motion.div>

      <div
        className="py-6 space-y-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onNext} disabled={!displayName.trim()}>
          Continue
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

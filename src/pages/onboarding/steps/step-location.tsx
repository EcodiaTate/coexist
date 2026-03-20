import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MapPin } from 'lucide-react'
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

interface StepLocationProps {
  location: string
  onChange: (location: string, point: { lat: number; lng: number } | null) => void
  onNext: () => void
  onSkip: () => void
}

export function StepLocation({ location, onChange, onNext, onSkip }: StepLocationProps) {
  const [query, setQuery] = useState(location)
  const shouldReduceMotion = useReducedMotion()

  function handleChange(value: string) {
    setQuery(value)
    // Store as text for now - full geocoding/PostGIS integration happens
    // when the maps/location service is implemented
    onChange(value, null)
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-8">
      <motion.div
        className="flex-1"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-6">
          <MapPin className="w-7 h-7 text-primary-400" />
        </motion.div>

        <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold text-primary-800">
          Where are you based?
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-primary-400 leading-relaxed">
          We'll suggest nearby collectives and events in your area.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8">
          <Input
            label="Suburb or city"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g. Byron Bay, NSW"
            icon={<MapPin size={18} />}
          />
        </motion.div>
      </motion.div>

      <div
        className="py-6 space-y-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onNext} disabled={!query.trim()}>
          Continue
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

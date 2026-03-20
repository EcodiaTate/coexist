import { motion, useReducedMotion } from 'framer-motion'
import { Trees, Waves, Bird, Sprout, Bug, Flower2, Droplets, Fence, Leaf } from 'lucide-react'
import { Chip } from '@/components/chip'
import { Button } from '@/components/button'

const INTERESTS = [
  { id: 'tree_planting', label: 'Tree Planting', icon: <Trees size={16} /> },
  { id: 'beach_cleanup', label: 'Beach Cleanups', icon: <Waves size={16} /> },
  { id: 'wildlife_survey', label: 'Wildlife', icon: <Bird size={16} /> },
  { id: 'habitat_restoration', label: 'Habitat Restoration', icon: <Fence size={16} /> },
  { id: 'seed_collecting', label: 'Seed Collecting', icon: <Sprout size={16} /> },
  { id: 'weed_removal', label: 'Weed Removal', icon: <Bug size={16} /> },
  { id: 'community_garden', label: 'Community Garden', icon: <Flower2 size={16} /> },
  { id: 'waterway_cleanup', label: 'Waterway Cleanup', icon: <Droplets size={16} /> },
  { id: 'nature_walk', label: 'Nature Walks', icon: <Leaf size={16} /> },
]

interface StepInterestsProps {
  selected: string[]
  onChange: (interests: string[]) => void
  onNext: () => void
  onSkip: () => void
}

export function StepInterests({ selected, onChange, onNext, onSkip }: StepInterestsProps) {
  const shouldReduceMotion = useReducedMotion()

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    )
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-8 min-h-0">
      <motion.div
        className="flex-1"
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h2 className="font-heading text-2xl font-bold text-primary-800">
          What are you into?
        </h2>
        <p className="mt-2 text-primary-400">
          Pick the conservation activities that excite you. Choose as many as you like.
        </p>

        <div className="mt-8 flex flex-wrap gap-2.5" role="listbox" aria-multiselectable="true">
          {INTERESTS.map((interest) => (
            <Chip
              key={interest.id}
              label={interest.label}
              icon={interest.icon}
              selected={selected.includes(interest.id)}
              onSelect={() => toggle(interest.id)}
            />
          ))}
        </div>
      </motion.div>

      <div
        className="py-6 space-y-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onNext} disabled={selected.length === 0}>
          Continue
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

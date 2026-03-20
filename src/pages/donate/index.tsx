import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { Heart, Users, Repeat } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { ProgressBar } from '@/components/progress-bar'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { useDonationProjects, useCreateDonation } from '@/hooks/use-donations'
import { redirectToCheckout } from '@/lib/stripe'
import { PRESET_AMOUNTS, type DonationFrequency, type DonationProject } from '@/types/donations'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

/* ------------------------------------------------------------------ */
/*  Project thermometer card                                           */
/* ------------------------------------------------------------------ */

function ProjectThermometer({
  project,
  selected,
  onSelect,
}: {
  project: DonationProject
  selected: boolean
  onSelect: () => void
}) {
  const pct = project.goal_amount > 0
    ? Math.min(100, (project.raised_amount / project.goal_amount) * 100)
    : 0

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full rounded-2xl p-4 text-left transition-colors duration-150',
        'border-2',
        selected
          ? 'border-primary-500 bg-white'
          : 'border-primary-200 bg-white hover:border-primary-200',
      )}
    >
      {project.image_url && (
        <img
          src={project.image_url}
          alt={project.name}
          className="w-full h-28 object-cover rounded-xl mb-3"
          loading="lazy"
        />
      )}
      <h3 className="font-heading font-semibold text-primary-800 text-sm">{project.name}</h3>
      <p className="text-xs text-primary-400 mt-1 line-clamp-2">{project.description}</p>
      <div className="mt-3">
        <ProgressBar
          value={pct}
          size="sm"
          color="bg-primary-500"
          aria-label={`${Math.round(pct)}% funded`}
        />
        <div className="flex justify-between mt-1.5 text-xs text-primary-400">
          <span className="font-semibold text-primary-400">
            ${project.raised_amount.toLocaleString()}
          </span>
          <span>of ${project.goal_amount.toLocaleString()}</span>
        </div>
      </div>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Main donate page                                                   */
/* ------------------------------------------------------------------ */

export default function DonatePage() {
  const { toast } = useToast()
  const shouldReduceMotion = useReducedMotion()

  const { data: projects, isLoading: loadingProjects } = useDonationProjects()
  const createDonation = useCreateDonation()

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25)
  const [customAmount, setCustomAmount] = useState('')
  const [frequency, setFrequency] = useState<DonationFrequency>('one_time')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [onBehalfOf, setOnBehalfOf] = useState('')
  const [showOrg, setShowOrg] = useState(false)
  const [isPublic, setIsPublic] = useState(true)

  const effectiveAmount = selectedAmount ?? (customAmount ? Number(customAmount) : 0)
  const isValid = effectiveAmount >= 1

  const handlePresetSelect = useCallback((amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }, [])

  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomAmount(e.target.value)
    setSelectedAmount(null)
  }, [])

  const handleDonate = useCallback(async () => {
    if (!isValid) return
    try {
      const result = await createDonation.mutateAsync({
        amount: effectiveAmount,
        frequency,
        projectId: selectedProject ?? undefined,
        message: message.trim() || undefined,
        onBehalfOf: showOrg && onBehalfOf.trim() ? onBehalfOf.trim() : undefined,
        isPublic,
      })
      if (result.url) {
        window.location.href = result.url
      } else if (result.session_id) {
        await redirectToCheckout(result.session_id)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }, [
    isValid, effectiveAmount, frequency, selectedProject,
    message, onBehalfOf, showOrg, isPublic, createDonation, toast,
  ])

  return (
    <Page
      header={
        <Header
          title="Donate"
          back
          rightActions={
            <Link
              to="/donate/donors"
              className="text-sm font-medium text-primary-400"
              aria-label="View donor wall"
            >
              Donors
            </Link>
          }
        />
      }
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Heart size={18} />}
          loading={createDonation.isPending}
          disabled={!isValid}
          onClick={handleDonate}
        >
          {frequency === 'monthly'
            ? `Donate $${effectiveAmount}/mo`
            : `Donate $${effectiveAmount}`}
        </Button>
      }
    >
      {/* Hero image */}
      <div className="relative w-full h-44 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80&auto=format&fit=crop"
          alt="Volunteers planting native trees"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/60 via-primary-900/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="font-heading font-bold text-white text-xl leading-tight">
            Every dollar goes to conservation
          </h2>
          <p className="text-sm text-white/80 mt-1">
            100% funds events, native plantings & habitat restoration
          </p>
        </div>
      </div>

      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="px-4 pt-5 pb-8 space-y-6"
      >
        {/* Amount selection */}
        <motion.section variants={fadeUp}>
          <h3 className="font-heading font-semibold text-primary-800 mb-3">
            Choose an amount
          </h3>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESET_AMOUNTS.map((amount) => (
              <motion.button
                key={amount}
                type="button"
                onClick={() => handlePresetSelect(amount)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'h-12 rounded-xl font-heading font-semibold text-base',
                  'border-2 transition-colors duration-150 cursor-pointer',
                  selectedAmount === amount
                    ? 'border-primary-500 bg-white text-primary-400'
                    : 'border-primary-200 bg-white text-primary-800 hover:border-primary-200',
                )}
              >
                ${amount}
              </motion.button>
            ))}
          </div>
          <Input
            label="Custom amount"
            type="text"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="Enter amount"
            icon={<span className="text-primary-400 font-semibold">$</span>}
          />
        </motion.section>

        {/* Frequency toggle */}
        <motion.section variants={fadeUp}>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-primary-200">
            <Repeat size={18} className="text-primary-400 shrink-0" />
            <Toggle
              label="Monthly giving"
              description="Set up a recurring donation via Stripe"
              checked={frequency === 'monthly'}
              onChange={(checked) => setFrequency(checked ? 'monthly' : 'one_time')}
            />
          </div>
        </motion.section>

        {/* Project selection */}
        <motion.section variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-primary-800">
              Support a project (optional)
            </h3>
          </div>
          {loadingProjects ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((p) => (
                <ProjectThermometer
                  key={p.id}
                  project={p}
                  selected={selectedProject === p.id}
                  onSelect={() =>
                    setSelectedProject(selectedProject === p.id ? null : p.id)
                  }
                />
              ))}
            </div>
          ) : null}
        </motion.section>

        {/* Optional message */}
        <motion.section variants={fadeUp}>
          <Input
            type="textarea"
            label="Leave a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </motion.section>

        {/* On behalf of org */}
        <motion.section variants={fadeUp}>
          <div className="flex items-center gap-3 mb-3">
            <Users size={18} className="text-primary-400 shrink-0" />
            <Toggle
              label="On behalf of an organisation"
              checked={showOrg}
              onChange={setShowOrg}
              size="sm"
            />
          </div>
          <AnimatePresence>
            {showOrg && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Input
                  label="Organisation name"
                  value={onBehalfOf}
                  onChange={(e) => setOnBehalfOf(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Public toggle */}
        <motion.section variants={fadeUp}>
          <Toggle
            label="Show on donor wall"
            description="Your name (or org) appears on our public donor recognition page"
            checked={isPublic}
            onChange={setIsPublic}
          />
        </motion.section>
      </motion.div>
    </Page>
  )
}

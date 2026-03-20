import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { Heart, Users, Sparkles, Crown, ChevronRight } from 'lucide-react'
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
import { PRESET_AMOUNTS, type DonationProject } from '@/types/donations'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
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
        'w-full rounded-2xl p-4 text-left transition-all duration-150',
        selected
          ? 'ring-2 ring-primary-500 shadow-sm bg-primary-100'
          : 'bg-primary-50/60',
      )}
    >
      {project.image_url && (
        <img
          src={project.image_url}
          alt={project.name}
          className="w-full h-32 object-cover rounded-xl mb-3"
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
          <span className="font-semibold text-primary-600">
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

  const [selectedAmount, setSelectedAmount] = useState<number | null>(25)
  const [customAmount, setCustomAmount] = useState('')
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
        frequency: 'one_time',
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
    isValid, effectiveAmount, selectedProject,
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
        <div className="max-w-2xl mx-auto w-full">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Heart size={18} />}
            loading={createDonation.isPending}
            disabled={!isValid}
            onClick={handleDonate}
          >
            Donate ${effectiveAmount > 0 ? `$${effectiveAmount}` : ''}
          </Button>
        </div>
      }
    >
      {/* ---- Full-bleed hero  break out of Page px-4 / lg:px-6 ---- */}
      <div className="-mx-4 lg:-mx-6">
        <div className="relative w-full h-52 sm:h-60 lg:h-72 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80&auto=format&fit=crop"
            alt="Volunteers planting native trees"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-primary-900/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 lg:px-8 lg:pb-7">
            <div className="max-w-2xl mx-auto">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1.5">
                Co-Exist Australia
              </p>
              <h2 className="font-heading font-bold text-white text-2xl lg:text-3xl leading-tight">
                Every dollar funds conservation
              </h2>
              <p className="text-sm text-white/75 mt-1.5 max-w-md">
                100% goes to events, native plantings & habitat restoration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Contained form content ---- */}
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="pt-8 space-y-8"
        >
          {/* ---- Amount selection ---- */}
          <motion.section variants={fadeUp}>
            <h3 className="font-heading font-semibold text-primary-800 text-lg mb-4">
              Choose an amount
            </h3>
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {PRESET_AMOUNTS.map((amount) => (
                <motion.button
                  key={amount}
                  type="button"
                  onClick={() => handlePresetSelect(amount)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'h-13 rounded-xl font-heading font-semibold text-base',
                    'transition-all duration-150 cursor-pointer',
                    selectedAmount === amount
                      ? 'ring-2 ring-primary-500 shadow-sm bg-primary-100 text-primary-700'
                      : 'bg-primary-50/60 text-primary-800',
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

          {/* ---- Membership callout ---- */}
          <motion.section variants={fadeUp}>
            <Link
              to="/membership"
              className="flex items-center gap-3 p-4 rounded-2xl bg-primary-50 shadow-sm transition-colors hover:bg-primary-100"
            >
              <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                <Crown size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-semibold text-primary-800">
                  Want to give regularly?
                </p>
                <p className="text-xs text-primary-400 mt-0.5">
                  Become a member for ongoing support + exclusive perks
                </p>
              </div>
              <ChevronRight size={18} className="text-primary-400 shrink-0" />
            </Link>
          </motion.section>

          {/* ---- Divider ---- */}
          <div className="h-px bg-primary-100" />

          {/* ---- Project selection ---- */}
          <motion.section variants={fadeUp}>
            <h3 className="font-heading font-semibold text-primary-800 text-lg mb-1">
              Support a project
            </h3>
            <p className="text-sm text-primary-400 mb-4">
              Optional  direct your donation to a specific initiative
            </p>
            {loadingProjects ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* ---- Divider ---- */}
          <div className="h-px bg-primary-100" />

          {/* ---- Personal touches ---- */}
          <motion.section variants={fadeUp} className="space-y-6">
            <div>
              <h3 className="font-heading font-semibold text-primary-800 text-lg mb-1">
                Personal touches
              </h3>
              <p className="text-sm text-primary-400 mb-5">
                All optional  add a message or donate on behalf of a group
              </p>

              <div className="space-y-5">
                <Input
                  type="textarea"
                  label="Leave a message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />

                <div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm">
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
                        <div className="pt-3">
                          <Input
                            label="Organisation name"
                            value={onBehalfOf}
                            onChange={(e) => setOnBehalfOf(e.target.value)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm">
                  <Sparkles size={18} className="text-primary-400 shrink-0" />
                  <Toggle
                    label="Show on donor wall"
                    description="Your name appears on our public recognition page"
                    checked={isPublic}
                    onChange={setIsPublic}
                  />
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>

      </div>
    </Page>
  )
}

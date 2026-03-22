import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Heart, Users, Sparkles, Crown, ChevronRight, ArrowLeft,
  TreePine, Leaf, Waves, MapPin, Zap,
  TrendingUp, ShieldCheck,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { ProgressBar } from '@/components/progress-bar'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { useDonationProjects, useCreateDonation } from '@/hooks/use-donations'
import { redirectToCheckout } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import {
  PRESET_AMOUNTS,
  getImpactMessage,
  type DonationProject,
} from '@/types/donations'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  National impact stats (same query as /impact/national)             */
/* ------------------------------------------------------------------ */

function useDonateNationalStats() {
  return useQuery({
    queryKey: ['national-impact'],
    queryFn: async () => {
      const [impactRes, eventsRes, membersRes, collectivesRes] = await Promise.all([
        supabase.from('event_impact').select(
          'trees_planted, hours_total, rubbish_kg, native_plants, wildlife_sightings',
        ),
        supabase.from('events').select('id', { count: 'exact', head: true }).lt('date_start', new Date().toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
      ])

      const logs = (impactRes.data ?? []) as any[]
      return {
        totalTrees: logs.reduce((s: number, r: any) => s + (r.trees_planted ?? 0), 0),
        totalRubbishKg: Math.round(logs.reduce((s: number, r: any) => s + (r.rubbish_kg ?? 0), 0)),
        totalNativePlants: logs.reduce((s: number, r: any) => s + (r.native_plants ?? 0), 0),
        totalEvents: eventsRes.count ?? 0,
        totalMembers: membersRes.count ?? 0,
        totalCollectives: collectivesRes.count ?? 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

/* ------------------------------------------------------------------ */
/*  Impact icons mapped to amounts                                     */
/* ------------------------------------------------------------------ */

const IMPACT_ICONS: Record<number, React.ReactNode> = {
  5: <Leaf size={18} className="text-sprout-500" />,
  10: <Waves size={18} className="text-sky-500" />,
  25: <TreePine size={18} className="text-primary-500" />,
  50: <MapPin size={18} className="text-moss-500" />,
}

/* ------------------------------------------------------------------ */
/*  Decorative background shapes                                       */
/* ------------------------------------------------------------------ */

function DecorativeShapes({ reducedMotion }: { reducedMotion: boolean | null }) {
  if (reducedMotion) return null

  return (
    <>
      {/* Ring 1 — upper-right breathing */}
      <motion.div
        className="absolute -top-20 -right-16 w-72 h-72 rounded-full border-[2px] border-primary-200/25"
        animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ring 2 — centre-left breathing */}
      <motion.div
        className="absolute top-[40%] -left-24 w-56 h-56 rounded-full border-[2px] border-primary-200/25"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* Blurred moss glow — bottom-left */}
      <motion.div
        className="absolute bottom-32 -left-12 w-64 h-64 rounded-full bg-moss-100/20 blur-3xl"
        animate={{ opacity: [0.15, 0.3, 0.15], x: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Warm circle — top-right */}
      <motion.div
        className="absolute -top-8 right-8 w-40 h-40 rounded-full bg-coral-50/30 blur-2xl"
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Floating dot 1 */}
      <motion.div
        className="absolute top-[25%] right-[15%] w-2 h-2 rounded-full bg-primary-200/40"
        animate={{ y: [0, -12, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating dot 2 */}
      <motion.div
        className="absolute top-[55%] left-[10%] w-1.5 h-1.5 rounded-full bg-coral-200/35"
        animate={{ y: [0, -10, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Floating dot 3 */}
      <motion.div
        className="absolute top-[70%] right-[25%] w-2.5 h-2.5 rounded-full bg-moss-200/30"
        animate={{ y: [0, -14, 0], opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact equivalency badge                                           */
/* ------------------------------------------------------------------ */

function ImpactBadge({ amount }: { amount: number }) {
  const message = getImpactMessage(amount)
  if (amount < 5) return null

  const closest = [50, 25, 10, 5].find((t) => amount >= t) ?? 5
  const icon = IMPACT_ICONS[closest] ?? <Leaf size={18} className="text-primary-500" />

  return (
    <motion.div
      key={amount}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-sprout-100/60"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-0 flex items-center justify-center shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-sprout-600 uppercase tracking-wider mb-0.5">
          Your impact
        </p>
        <p className="text-sm font-medium text-primary-800">{message}</p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  National stats strip (real data)                                   */
/* ------------------------------------------------------------------ */

function NationalStatsStrip() {
  const { data, isLoading } = useDonateNationalStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="py-5 rounded-2xl bg-white shadow-sm border border-primary-50/60">
            <Skeleton variant="text" className="w-12 mx-auto mb-1" />
            <Skeleton variant="text" className="w-16 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      icon: <TreePine size={16} />,
      value: data.totalTrees.toLocaleString(),
      label: 'Trees planted',
      bg: 'bg-white shadow-sm border border-primary-50/60',
      iconBg: 'bg-sprout-200/60',
      iconColor: 'text-sprout-600',
      valueColor: 'text-sprout-800',
    },
    {
      icon: <Waves size={16} />,
      value: `${(data.totalRubbishKg ?? 0).toLocaleString()} kg`,
      label: 'Rubbish collected',
      bg: 'bg-white shadow-sm border border-primary-50/60',
      iconBg: 'bg-sky-200/50',
      iconColor: 'text-sky-600',
      valueColor: 'text-sky-800',
    },
    {
      icon: <Users size={16} />,
      value: data.totalMembers.toLocaleString(),
      label: 'Members',
      bg: 'bg-white shadow-sm border border-primary-50/60',
      iconBg: 'bg-moss-200/50',
      iconColor: 'text-moss-600',
      valueColor: 'text-moss-800',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn('flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl', s.bg)}
        >
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', s.iconBg, s.iconColor)}>
            {s.icon}
          </div>
          <span className={cn('font-heading font-bold text-base', s.valueColor)}>{s.value}</span>
          <span className="text-[11px] text-primary-400 text-center leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  )
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
      whileTap={{ scale: 0.97 }}
      variants={scaleIn}
      className={cn(
        'w-full rounded-2xl text-left transition-all duration-200 overflow-hidden',
        selected
          ? 'shadow-lg bg-gradient-to-br from-primary-50 to-surface-2 ring-1 ring-primary-200/40'
          : 'bg-white shadow-sm border border-primary-50/60',
      )}
    >
      {project.image_url && (
        <div className="relative h-36 overflow-hidden">
          <img
            src={project.image_url}
            alt={project.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center shadow-md"
            >
              <Heart size={14} className="text-white fill-white" />
            </motion.div>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-primary-800 text-sm">{project.name}</h3>
        <p className="text-xs text-primary-400 mt-1 line-clamp-2">{project.description}</p>
        <div className="mt-3">
          <ProgressBar
            value={pct}
            size="sm"
            color={selected ? 'bg-primary-500' : 'bg-primary-300'}
            aria-label={`${Math.round(pct)}% funded`}
          />
          <div className="flex justify-between mt-2 text-xs">
            <span className="font-bold text-primary-700">
              ${project.raised_amount.toLocaleString()}
            </span>
            <span className="text-primary-400">
              {Math.round(pct)}% of ${project.goal_amount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Amount pill button                                                  */
/* ------------------------------------------------------------------ */

function AmountPill({
  amount,
  selected,
  onSelect,
}: {
  amount: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.93 }}
      className={cn(
        'relative h-16 rounded-2xl font-heading font-bold text-lg',
        'transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5',
        selected
          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
          : 'bg-white shadow-sm border border-primary-50/60 text-primary-800',
      )}
    >
      <span className="text-lg">${amount}</span>
      {!selected && (
        <span className="text-[10px] font-normal text-primary-400 leading-none">
          {amount === 5 && '2 plants'}
          {amount === 10 && 'cleanup kit'}
          {amount === 25 && '10 trees'}
          {amount === 50 && '5m\u00B2 habitat'}
        </span>
      )}
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <Heart size={12} className="text-primary-600 fill-primary-600" />
        </motion.span>
      )}
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Trust badges footer                                                */
/* ------------------------------------------------------------------ */

function TrustBadges() {
  return (
    <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-white shadow-sm border border-primary-50/60">
      <div className="flex items-center gap-1.5 text-primary-400">
        <ShieldCheck size={14} />
        <span className="text-[11px] font-medium">Secure</span>
      </div>
      <div className="w-px h-3.5 bg-primary-200/60" />
      <div className="flex items-center gap-1.5 text-primary-400">
        <Zap size={14} />
        <span className="text-[11px] font-medium">Instant receipt</span>
      </div>
      <div className="w-px h-3.5 bg-primary-200/60" />
      <div className="flex items-center gap-1.5 text-primary-400">
        <TrendingUp size={14} />
        <span className="text-[11px] font-medium">Tax deductible</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main donate page                                                   */
/* ------------------------------------------------------------------ */

export default function DonatePage() {
  const navigate = useNavigate()
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
      className="!px-0 !bg-transparent"
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
            Donate{effectiveAmount > 0 ? ` $${effectiveAmount}` : ''}
          </Button>
        </div>
      }
    >
      <div className="relative min-h-full">
        {/* ---- Full-bleed background gradient ---- */}
        <div className="absolute inset-0 bg-gradient-to-b from-coral-50/30 via-white to-moss-50/15" />

        {/* ---- Animated decorative shapes ---- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <DecorativeShapes reducedMotion={shouldReduceMotion} />
        </div>

        {/* ---- Foreground content ---- */}
        <div className="relative z-10">
          {/* ---- Full-bleed hero ---- */}
          <div className="relative w-full h-64 sm:h-72 lg:h-80 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80&auto=format&fit=crop"
              alt="Volunteers planting native trees"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/85 via-primary-900/35 to-primary-900/10" />

            {/* Floating back button */}
            <motion.button
              type="button"
              onClick={() => navigate(-1)}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 left-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/45 transition-colors cursor-pointer"
              style={{ marginTop: 'var(--safe-top)' }}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </motion.button>

            <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 lg:px-8 lg:pb-8">
              <div className="max-w-2xl mx-auto">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                  Co-Exist Australia
                </p>
                <h2 className="font-heading font-bold text-white text-2xl lg:text-3xl leading-tight">
                  Fund the future of
                  <br />
                  <span className="text-sprout-300">our wild places</span>
                </h2>
                <p className="text-sm text-white/70 mt-2 max-w-sm">
                  100% of every donation goes directly to events, native plantings & habitat restoration
                </p>
              </div>
            </div>
          </div>

          {/* ---- Contained form content ---- */}
          <div className="max-w-2xl mx-auto w-full px-4 lg:px-6">
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="visible"
              className="pt-6 space-y-7"
            >
              {/* ---- National impact stats (real data) ---- */}
              <motion.section variants={fadeUp}>
                <NationalStatsStrip />
              </motion.section>

              {/* ---- Donor wall link ---- */}
              <motion.section variants={fadeUp}>
                <Link
                  to="/donate/donors"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm border border-primary-50/60 transition-colors hover:bg-primary-50/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-100/70 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-primary-800">
                      View donor wall
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      See who&apos;s making a difference
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-primary-300 shrink-0" />
                </Link>
              </motion.section>

              {/* ---- Amount selection ---- */}
              <motion.section variants={fadeUp} className="rounded-2xl bg-white shadow-sm border border-primary-50/60 p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-heading font-semibold text-primary-800 text-lg">
                    Choose an amount
                  </h3>
                  <span className="text-xs text-primary-400">AUD</span>
                </div>
                <div className="grid grid-cols-4 gap-2.5 mb-4">
                  {PRESET_AMOUNTS.map((amount) => (
                    <AmountPill
                      key={amount}
                      amount={amount}
                      selected={selectedAmount === amount}
                      onSelect={() => handlePresetSelect(amount)}
                    />
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

                {/* Impact message */}
                <div className="mt-4">
                  <AnimatePresence mode="wait">
                    {effectiveAmount >= 5 && (
                      <ImpactBadge amount={effectiveAmount} />
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>

              {/* ---- Membership callout ---- */}
              <motion.section variants={fadeUp}>
                <Link
                  to="/membership"
                  className="flex items-center gap-3.5 p-4 rounded-2xl bg-warning-100/50 shadow-sm border border-warning-200/40 transition-colors hover:bg-warning-100/70"
                >
                  <div className="w-11 h-11 rounded-xl bg-warning-200/60 flex items-center justify-center shrink-0">
                    <Crown size={20} className="text-warning-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-primary-800">
                      Want to give regularly?
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      Become a member for ongoing support + exclusive perks
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-primary-300 shrink-0" />
                </Link>
              </motion.section>

              {/* ---- Project selection (only shown when projects exist) ---- */}
              {loadingProjects ? (
                <motion.section variants={fadeUp} className="rounded-2xl bg-white shadow-sm border border-primary-50/60 p-5">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-heading font-semibold text-primary-800 text-lg">
                      Support a project
                    </h3>
                    <span className="text-xs text-primary-400">Optional</span>
                  </div>
                  <p className="text-sm text-primary-400 mb-4">
                    Direct your donation to a specific initiative
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Skeleton variant="card" />
                    <Skeleton variant="card" />
                  </div>
                </motion.section>
              ) : projects && projects.length > 0 ? (
                <motion.section variants={fadeUp} className="rounded-2xl bg-white shadow-sm border border-primary-50/60 p-5">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-heading font-semibold text-primary-800 text-lg">
                      Support a project
                    </h3>
                    <span className="text-xs text-primary-400">Optional</span>
                  </div>
                  <p className="text-sm text-primary-400 mb-4">
                    Direct your donation to a specific initiative
                  </p>
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
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
                  </motion.div>
                </motion.section>
              ) : null}

              {/* ---- Personal touches ---- */}
              <motion.section variants={fadeUp} className="rounded-2xl bg-white shadow-sm border border-primary-50/60 p-5 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-heading font-semibold text-primary-800 text-lg">
                      Personal touches
                    </h3>
                    <span className="text-xs text-primary-400">Optional</span>
                  </div>
                  <p className="text-sm text-primary-400">
                    Add a message or donate on behalf of a group
                  </p>
                </div>

                <Input
                  type="textarea"
                  label="Leave a message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-100/70 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-primary-500" />
                  </div>
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

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-100/70 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-primary-500" />
                  </div>
                  <Toggle
                    label="Show on donor wall"
                    description="Your name appears on our public recognition page"
                    checked={isPublic}
                    onChange={setIsPublic}
                  />
                </div>
              </motion.section>

              {/* ---- Trust footer ---- */}
              <motion.section variants={fadeUp}>
                <TrustBadges />
              </motion.section>

              {/* Bottom spacer for sticky footer */}
              <div className="h-2" />
            </motion.div>
          </div>
        </div>
      </div>
    </Page>
  )
}

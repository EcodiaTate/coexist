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

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

/* ------------------------------------------------------------------ */
/*  Impact icons mapped to amounts                                     */
/* ------------------------------------------------------------------ */

const IMPACT_ICONS: Record<number, React.ReactNode> = {
  5: <Leaf size={18} className="text-white" />,
  10: <Waves size={18} className="text-white" />,
  25: <TreePine size={18} className="text-white" />,
  50: <MapPin size={18} className="text-white" />,
}

/* ------------------------------------------------------------------ */
/*  Breathing decorative elements                                      */
/* ------------------------------------------------------------------ */

function PageDepthElements({ rm }: { rm: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Large ring — upper right */}
      <motion.div
        className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-bark-300/22"
        animate={rm ? undefined : { scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Concentric inner */}
      <motion.div
        className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-warning-200/18"
        animate={rm ? undefined : { scale: [1, 1.04, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Left ring cluster */}
      <motion.div
        className="absolute top-[32%] -left-16 w-56 h-56 rounded-full border-[2.5px] border-bark-200/20"
        animate={rm ? undefined : { scale: [1, 1.08, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-[42%] -left-4 w-28 h-28 rounded-full border-[1.5px] border-moss-200/15"
        animate={rm ? undefined : { rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      />

      {/* Bottom right ring */}
      <motion.div
        className="absolute bottom-[18%] right-2 w-36 h-36 rounded-full border-2 border-bark-200/18"
        animate={rm ? undefined : { rotate: 360 }}
        transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating particles — golden & earthy */}
      <motion.div className="absolute top-[18%] right-[16%] w-3.5 h-3.5 rounded-full bg-warning-400/18"
        animate={rm ? undefined : { y: [-6, 6, -6], x: [0, 4, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[45%] left-[10%] w-3 h-3 rounded-full bg-bark-400/15"
        animate={rm ? undefined : { y: [4, -5, 4] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }} />
      <motion.div className="absolute top-[68%] right-[24%] w-2.5 h-2.5 rounded-full bg-sprout-400/15"
        animate={rm ? undefined : { y: [-4, 5, -4], x: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
      <motion.div className="absolute bottom-[35%] left-[28%] w-2 h-2 rounded-full bg-moss-400/15"
        animate={rm ? undefined : { y: [3, -4, 3] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
      <motion.div className="absolute top-[55%] right-8 w-2 h-2 rounded-full bg-warning-300/15"
        animate={rm ? undefined : { y: [-3, 3, -3], x: [1, -1, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />

      {/* Rich blurred orbs — golden amber warmth */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-warning-200/25 via-bark-100/15 to-transparent blur-[60px]" />
      <div className="absolute -top-12 -left-16 w-[300px] h-[280px] rounded-full bg-gradient-to-br from-bark-200/22 to-transparent blur-[50px]" />
      <div className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-bark-100/18 blur-[50px]" />
      <div className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-moss-200/15 blur-[55px]" />
      <div className="absolute bottom-[12%] right-[8%] w-48 h-48 rounded-full bg-warning-100/15 blur-[50px]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact equivalency badge                                           */
/* ------------------------------------------------------------------ */

function ImpactBadge({ amount }: { amount: number }) {
  const message = getImpactMessage(amount)
  if (amount < 5) return null

  const closest = [50, 25, 10, 5].find((t) => amount >= t) ?? 5
  const icon = IMPACT_ICONS[closest] ?? <Leaf size={18} className="text-white" />

  return (
    <motion.div
      key={amount}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#e4ebd4] via-[#dfe6cd] to-[#d8e0c4] border border-sprout-200/40 shadow-sm shadow-sprout-200/15"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sprout-500 to-primary-700 flex items-center justify-center shrink-0 shadow-md shadow-sprout-500/25">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-sprout-600 uppercase tracking-[0.15em] mb-0.5">
          Your impact
        </p>
        <p className="text-sm font-semibold text-secondary-800">{message}</p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  National stats — gradient cards (no blue)                          */
/* ------------------------------------------------------------------ */

function NationalStatsStrip() {
  const { data, isLoading } = useDonateNationalStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="py-5 rounded-2xl bg-white/10">
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
      icon: <TreePine size={18} strokeWidth={2.5} />,
      value: data.totalTrees.toLocaleString(),
      label: 'Trees planted',
      gradient: 'from-sprout-500 to-primary-600',
    },
    {
      icon: <Waves size={18} strokeWidth={2.5} />,
      value: `${(data.totalRubbishKg ?? 0).toLocaleString()} kg`,
      label: 'Rubbish cleared',
      gradient: 'from-moss-500 to-primary-700',
    },
    {
      icon: <Users size={18} strokeWidth={2.5} />,
      value: data.totalMembers.toLocaleString(),
      label: 'Members',
      gradient: 'from-primary-500 to-secondary-700',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            'relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl overflow-hidden',
            'bg-gradient-to-br text-white shadow-md',
            s.gradient,
          )}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/8" />
          <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full bg-white/5 -translate-x-1/3 translate-y-1/3" />
          <div className="relative w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
            {s.icon}
          </div>
          <span className="relative font-heading font-bold text-lg tabular-nums drop-shadow-sm">{s.value}</span>
          <span className="relative text-[10px] text-white/60 text-center leading-tight font-semibold uppercase tracking-wider">{s.label}</span>
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
        'w-full rounded-[20px] text-left transition-all duration-200 overflow-hidden',
        selected
          ? 'shadow-[0_6px_28px_-6px_rgba(61,77,51,0.18)] ring-2 ring-primary-400 bg-gradient-to-b from-[#f5f0e5] to-[#ede6d8]'
          : 'bg-gradient-to-b from-[#f7f3eb] to-[#f0ead9] border border-bark-200/25 shadow-[0_4px_20px_-4px_rgba(93,77,51,0.10)] hover:shadow-[0_6px_28px_-4px_rgba(93,77,51,0.16)] hover:-translate-y-0.5',
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
          <div className="absolute inset-0 bg-gradient-to-t from-secondary-900/40 to-transparent" />
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
        <h3 className="font-heading font-semibold text-secondary-800 text-sm">{project.name}</h3>
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
        'relative h-[4.5rem] rounded-2xl font-heading font-bold',
        'transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1',
        selected
          ? 'bg-gradient-to-br from-primary-600 via-primary-700 to-moss-700 text-white shadow-lg shadow-primary-700/25 border border-primary-500/30'
          : 'bg-gradient-to-b from-[#faf7f0] to-[#f3ede2] text-secondary-800 hover:from-[#f7f3ea] hover:to-[#efe8db] border border-bark-200/35 shadow-sm',
      )}
    >
      <span className="text-xl">${amount}</span>
      <span className={cn(
        'text-[10px] font-medium leading-none',
        selected ? 'text-white/60' : 'text-primary-400',
      )}>
        {amount === 5 && '2 plants'}
        {amount === 10 && 'cleanup kit'}
        {amount === 25 && '10 trees'}
        {amount === 50 && '5m\u00B2 habitat'}
      </span>
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md"
        >
          <Heart size={12} className="text-primary-600 fill-primary-600" />
        </motion.span>
      )}
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Trust badges                                                        */
/* ------------------------------------------------------------------ */

function TrustBadges() {
  return (
    <div className="flex items-center justify-center gap-4 py-3.5 px-4 rounded-[18px] bg-gradient-to-r from-[#ede6da] to-[#e8e0d3] border border-bark-200/25 shadow-sm shadow-bark-200/10">
      <div className="flex items-center gap-1.5 text-bark-600">
        <ShieldCheck size={14} />
        <span className="text-[11px] font-bold">Secure</span>
      </div>
      <div className="w-px h-3.5 bg-bark-300/30" />
      <div className="flex items-center gap-1.5 text-bark-600">
        <Zap size={14} />
        <span className="text-[11px] font-bold">Instant receipt</span>
      </div>
      <div className="w-px h-3.5 bg-bark-300/30" />
      <div className="flex items-center gap-1.5 text-bark-600">
        <TrendingUp size={14} />
        <span className="text-[11px] font-bold">Tax deductible</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section header with gradient icon badge                            */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType
  title: string
  badge?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-bark-500 to-moss-600 shadow-md shadow-bark-400/20">
          <Icon size={14} className="text-white" />
        </div>
        <h2 className="font-heading font-extrabold text-secondary-900 text-lg">{title}</h2>
      </div>
      {badge && (
        <span className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider">
          {badge}
        </span>
      )}
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
  const rm = !!shouldReduceMotion

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
      noBackground
      className="!px-0 !bg-transparent"
    >
      <div className="relative min-h-full">
        {/* ── Rich layered background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Rich golden-amber base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#f2ece0] via-[#f0ead9] via-30% to-[#eae5d4] to-65%" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-bark-50/12 to-moss-50/15" />

          {/* Topographic contour lines — earthy bushland feel */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="donate-topo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M20 100c30-40 70-60 100-40s60 50 80 20" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M10 140c40-30 80-50 120-30s50 40 70 10" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M30 60c25-35 55-45 85-25s45 35 65 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="160" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="160" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#donate-topo)" className="text-primary-900" />
          </svg>
        </div>

        {/* ── Breathing rings, dots, orbs ── */}
        <PageDepthElements rm={rm} />

        {/* ── Content ── */}
        <div className="relative z-10 px-5 lg:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              variants={rm ? undefined : stagger}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >

              {/* ═══════════════════════════════════════════════════ */}
              {/*  HERO CARD                                         */}
              {/* ═══════════════════════════════════════════════════ */}
              <motion.div variants={fadeUp}>
                <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-br from-secondary-700 via-primary-700 to-moss-800 p-6 pb-5 shadow-[0_8px_40px_-8px_rgba(45,56,38,0.35),0_2px_8px_rgba(45,56,38,0.10)]">
                  {/* Dot grid texture */}
                  <div className="absolute inset-0 opacity-[0.06]">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="donate-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1" fill="white" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#donate-dots)" />
                    </svg>
                  </div>

                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />
                  <div className="absolute top-1/2 right-[15%] w-16 h-16 rounded-full bg-sprout-300/10 blur-xl" />

                  {/* Back button */}
                  <motion.button
                    type="button"
                    onClick={() => navigate(-1)}
                    whileTap={{ scale: 0.9 }}
                    className="relative mb-6 flex items-center justify-center w-10 h-10 rounded-2xl bg-white/15 text-white border border-white/10 active:scale-[0.95] transition-transform cursor-pointer"
                    aria-label="Go back"
                  >
                    <ArrowLeft size={20} />
                  </motion.button>

                  <div className="relative">
                    <h2 className="font-heading font-bold text-white text-[1.75rem] leading-tight">
                      Fund the future of
                      <br />
                      <span className="text-sprout-300">our wild places</span>
                    </h2>
                    <p className="text-sm text-white/50 mt-3 max-w-xs leading-relaxed">
                      100% of every donation goes directly to conservation events, native plantings & habitat restoration
                    </p>
                  </div>

                  {/* Stats inside hero */}
                  <div className="relative mt-6">
                    <NationalStatsStrip />
                  </div>
                </div>
              </motion.div>

              {/* ── Donor wall link ── */}
              <motion.div variants={fadeUp}>
                <Link
                  to="/donate/donors"
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-[20px]',
                    'bg-gradient-to-br from-[#ede6da] via-[#e9e1d4] to-[#e4dccf]',
                    'border border-bark-200/30',
                    'shadow-[0_4px_20px_-4px_rgba(93,77,51,0.14),0_1px_4px_rgba(93,77,51,0.05)]',
                    'transition-all hover:shadow-[0_6px_28px_-4px_rgba(93,77,51,0.18)] hover:-translate-y-0.5 active:scale-[0.98] duration-200',
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bark-500 to-moss-600 flex items-center justify-center shrink-0 shadow-md shadow-bark-400/25">
                    <Users size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-bold text-secondary-800">
                      View donor wall
                    </p>
                    <p className="text-xs text-bark-500 mt-0.5">
                      See who&apos;s making a difference
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-bark-400 shrink-0" />
                </Link>
              </motion.div>

              {/* ═══════════════════════════════════════════════════ */}
              {/*  AMOUNT SELECTION                                  */}
              {/* ═══════════════════════════════════════════════════ */}
              <motion.div variants={fadeUp}>
                <SectionHeader icon={Heart} title="Choose an amount" badge="AUD" />
                <div className="rounded-[20px] bg-gradient-to-b from-[#f5f0e5] via-[#f2ece0] to-[#eee7d9] shadow-[0_4px_20px_-4px_rgba(93,77,51,0.12),0_1px_4px_rgba(93,77,51,0.05)] border border-bark-200/25 p-5">
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

                  <div className="mt-4">
                    <AnimatePresence mode="wait">
                      {effectiveAmount >= 5 && (
                        <ImpactBadge amount={effectiveAmount} />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* ═══════════════════════════════════════════════════ */}
              {/*  MEMBERSHIP CALLOUT                                */}
              {/* ═══════════════════════════════════════════════════ */}
              <motion.div variants={fadeUp}>
                <Link
                  to="/membership"
                  className={cn(
                    'relative flex items-center gap-4 p-5 rounded-[22px] overflow-hidden',
                    'bg-gradient-to-r from-[#ede3d2] via-[#e9deca] to-[#e4d8c0]',
                    'border border-bark-300/30',
                    'shadow-[0_4px_24px_-6px_rgba(93,77,51,0.16),0_2px_6px_rgba(93,77,51,0.06)]',
                    'transition-all hover:shadow-[0_6px_28px_-4px_rgba(93,77,51,0.20)] active:scale-[0.98] duration-200',
                  )}
                >
                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-200/20 blur-2xl" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-bark-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-200/40">
                    <Crown size={22} className="text-white" />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <p className="font-heading text-sm font-bold text-secondary-800">
                      Want to give regularly?
                    </p>
                    <p className="text-xs text-bark-500 mt-0.5">
                      Become a member for ongoing support + exclusive perks
                    </p>
                  </div>
                  <ChevronRight size={18} className="relative text-bark-400 shrink-0" />
                </Link>
              </motion.div>

              {/* ═══════════════════════════════════════════════════ */}
              {/*  PROJECT SELECTION — tinted panel with wave        */}
              {/* ═══════════════════════════════════════════════════ */}
              {loadingProjects ? (
                <motion.div variants={fadeUp}>
                  <div className="relative -mx-5 lg:-mx-6 px-5 lg:px-6 py-6 bg-gradient-to-b from-[#e4ddd0]/50 to-transparent">
                    <div className="absolute top-0 left-0 right-0 -translate-y-[calc(100%-1px)]">
                      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="w-full h-5 block" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,40 C480,0 960,30 1440,10 L1440,40 Z" className="fill-[#e4ddd0]/50" />
                      </svg>
                    </div>
                    <SectionHeader icon={TreePine} title="Support a project" badge="Optional" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </div>
                  </div>
                </motion.div>
              ) : projects && projects.length > 0 ? (
                <motion.div variants={fadeUp}>
                  <div className="relative -mx-5 lg:-mx-6 px-5 lg:px-6 py-6 bg-gradient-to-b from-[#e4ddd0]/50 to-transparent">
                    <div className="absolute top-0 left-0 right-0 -translate-y-[calc(100%-1px)]">
                      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="w-full h-5 block" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,40 C480,0 960,30 1440,10 L1440,40 Z" className="fill-[#e4ddd0]/50" />
                      </svg>
                    </div>
                    <SectionHeader icon={TreePine} title="Support a project" badge="Optional" />
                    <motion.div
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
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
                  </div>
                </motion.div>
              ) : null}

              {/* ═══════════════════════════════════════════════════ */}
              {/*  PERSONAL TOUCHES                                  */}
              {/* ═══════════════════════════════════════════════════ */}
              <motion.div variants={fadeUp}>
                <SectionHeader icon={Sparkles} title="Personal touches" badge="Optional" />
                <div className="rounded-[20px] bg-gradient-to-b from-[#f5f0e5] to-[#eee7d9] shadow-[0_4px_20px_-4px_rgba(93,77,51,0.12),0_1px_4px_rgba(93,77,51,0.05)] border border-bark-200/25 p-5 space-y-4">
                  <Input
                    type="textarea"
                    label="Leave a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e0dace] to-[#d6cec0] border border-bark-200/20 flex items-center justify-center shrink-0">
                      <Users size={16} className="text-primary-600" />
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
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e0dace] to-[#d6cec0] border border-bark-200/20 flex items-center justify-center shrink-0">
                      <Sparkles size={16} className="text-primary-600" />
                    </div>
                    <Toggle
                      label="Show on donor wall"
                      description="Your name appears on our public recognition page"
                      checked={isPublic}
                      onChange={setIsPublic}
                    />
                  </div>
                </div>
              </motion.div>

              {/* ── Trust footer ── */}
              <motion.div variants={fadeUp}>
                <TrustBadges />
              </motion.div>

              <div className="h-20" />
            </motion.div>
          </div>
        </div>

        {/* Sticky donate button — no background panel */}
        <div
          className="sticky bottom-0 z-30 px-5 lg:px-6 pb-3 pt-3"
          style={{ paddingBottom: 'calc(var(--safe-bottom) + 0.75rem)' }}
        >
          <div className="max-w-2xl mx-auto w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Heart size={18} />}
              loading={createDonation.isPending}
              disabled={!isValid}
              onClick={handleDonate}
              className="shadow-[0_-4px_24px_-4px_rgba(61,77,51,0.20),0_4px_16px_-4px_rgba(61,77,51,0.15)]"
            >
              Donate{effectiveAmount > 0 ? ` $${effectiveAmount}` : ''}
            </Button>
          </div>
        </div>
      </div>
    </Page>
  )
}

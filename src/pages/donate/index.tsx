import { useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useParallaxLayers } from '@/hooks/use-parallax-scroll'
import { IMPACT_SELECT_COLUMNS, sumMetric } from '@/lib/impact-metrics'
import {
    Heart, Users, Repeat,
    TreePine, Waves, Loader2,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useCreateDonation } from '@/hooks/use-donations'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { PRESET_AMOUNTS, IMPACT_EQUIVALENCIES, type DonationFrequency } from '@/types/donations'

/* ------------------------------------------------------------------ */
/*  National impact stats (same query as /impact/national)             */
/* ------------------------------------------------------------------ */

function useDonateNationalStats() {
  return useQuery({
    queryKey: ['national-impact'],
    queryFn: async () => {
      const [impactRes, eventsRes, membersRes, collectivesRes] = await Promise.all([
        supabase.from('event_impact').select(IMPACT_SELECT_COLUMNS),
        supabase.from('events').select('id', { count: 'exact', head: true }).lt('date_start', new Date().toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
      ])

      const logs = (impactRes.data ?? []) as unknown as Record<string, unknown>[]
      return {
        totalTrees: sumMetric(logs, 'trees_planted'),
        totalRubbishKg: Math.round(sumMetric(logs, 'rubbish_kg')),
        totalNativePlants: sumMetric(logs, 'native_plants'),
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

/* ------------------------------------------------------------------ */
/*  Breathing decorative elements                                      */
/* ------------------------------------------------------------------ */

function PageDepthElements({ rm }: { rm: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Large ring - upper right */}
      <motion.div
        className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-bark-300/22"
        animate={rm ? undefined : { scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
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

      {/* Floating particles */}
      <motion.div className="absolute top-[18%] right-[16%] w-3.5 h-3.5 rounded-full bg-warning-400/18"
        animate={rm ? undefined : { y: [-6, 6, -6], x: [0, 4, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[45%] left-[10%] w-3 h-3 rounded-full bg-bark-400/15"
        animate={rm ? undefined : { y: [4, -5, 4] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }} />

      {/* Rich blurred orbs */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-warning-200/20 via-bark-100/10 to-transparent" />
      <div className="absolute -top-12 -left-16 w-[300px] h-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-bark-200/18 to-transparent" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  National stats - gradient cards                                    */
/* ------------------------------------------------------------------ */

function NationalStatsStrip() {
  const { data, isLoading } = useDonateNationalStats()
  const showLoading = useDelayedLoading(isLoading)

  if (showLoading) {
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
          <div className="relative w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/10">
            {s.icon}
          </div>
          <span className="relative font-heading font-bold text-lg tabular-nums drop-shadow-sm">{s.value}</span>
          <span className="relative text-[11px] text-white/60 text-center leading-tight font-semibold uppercase tracking-wider">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Parallax Hero                                                      */
/* ------------------------------------------------------------------ */

function DonateHero({ rm }: { rm: boolean }) {
  const { bgRef, fgRef, textRef } = useParallaxLayers({ textRange: 180, withScale: false })

  return (
    <div className="relative">
      <div className="relative w-full h-[480px] sm:h-auto overflow-hidden">
        <div
          ref={rm ? undefined : bgRef}
          className="absolute inset-0 sm:relative sm:inset-auto will-change-transform"
        >
          <img
            src="/img/donate-hero-bg.webp"
            alt="Conservation landscape"
            className="h-full w-auto min-w-full object-cover object-center sm:w-full sm:h-auto sm:object-fill block"
          />
        </div>

        <div
          ref={rm ? undefined : fgRef}
          className="absolute inset-0 z-[3] will-change-transform"
        >
          <img
            src="/img/donate-hero-fg.webp"
            alt=""
            className="h-full w-auto min-w-full object-cover object-center sm:w-full sm:h-auto sm:object-fill block"
          />
        </div>

        <div
          ref={rm ? undefined : textRef}
          className="absolute inset-x-0 top-[13%] sm:top-[10%] z-[2] flex flex-col items-center px-6 will-change-transform"
        >
          <span className="text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-[0.3em] text-white/80 mb-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            Support
          </span>
          <span role="heading" aria-level={1} className="font-heading text-[2.5rem] sm:text-[3.5rem] lg:text-[5rem] font-bold uppercase text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] leading-[0.85] block">
            Donate
          </span>
          <p className="mt-3 text-sm text-white text-center max-w-xs drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            100% goes to conservation events & habitat restoration
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="w-full h-7 sm:h-10 block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,25
               C60,22 100,18 140,20
               C180,22 200,15 220,18
               L228,8 L234,5 L240,10
               C280,18 340,24 400,20
               C440,16 470,22 510,25
               C560,28 600,20 640,22
               C670,24 690,18 710,20
               L718,10 L722,6 L728,12
               C760,20 820,26 880,22
               C920,18 950,24 990,26
               C1020,28 1050,20 1080,18
               C1100,16 1120,22 1140,24
               L1148,12 L1153,7 L1158,9 L1165,16
               C1200,22 1260,26 1320,22
               C1360,18 1400,24 1440,22
               L1440,70 L0,70 Z"
            className="fill-[#f2ece0]"
          />
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Donation form                                                      */
/* ------------------------------------------------------------------ */

function DonationForm() {
  const { user } = useAuth()
  const createDonation = useCreateDonation()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25)
  const [customAmount, setCustomAmount] = useState('')
  const [frequency, setFrequency] = useState<DonationFrequency>('one_time')
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const amount = selectedAmount ?? (Number(customAmount) || 0)
  const isValid = amount >= 1 && amount <= 50000

  const impactText = (() => {
    const thresholds = Object.keys(IMPACT_EQUIVALENCIES)
      .map(Number)
      .sort((a, b) => b - a)
    const match = thresholds.find((t) => amount >= t)
    return match ? IMPACT_EQUIVALENCIES[match] : null
  })()

  const handlePresetSelect = (preset: number) => {
    setSelectedAmount(preset)
    setCustomAmount('')
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSelectedAmount(null)
    setCustomAmount(e.target.value)
  }

  const handleDonate = async () => {
    if (!isValid) return
    try {
      const result = await createDonation.mutateAsync({
        amount,
        frequency,
        message: message.trim() || undefined,
        isPublic,
      })
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      }
    } catch {
      // Error is handled by TanStack Query
    }
  }

  return (
    <div className="rounded-[20px] bg-white shadow-[0_4px_20px_-4px_rgba(93,77,51,0.10),0_1px_4px_rgba(93,77,51,0.04)] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-moss-700 flex items-center justify-center shrink-0 shadow-md shadow-primary-500/25">
          <Heart size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-heading font-extrabold text-secondary-900 text-lg">
            Make a donation
          </h2>
          <p className="text-xs text-primary-400 mt-0.5">
            Secure payment via Stripe
          </p>
        </div>
      </div>

      {/* Frequency toggle */}
      <div className="flex rounded-2xl bg-primary-50/60 p-1 mb-5">
        <button
          type="button"
          onClick={() => setFrequency('one_time')}
          className={cn(
            'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
            frequency === 'one_time'
              ? 'bg-white text-secondary-800 shadow-sm'
              : 'text-primary-400 hover:text-primary-500',
          )}
        >
          One-time
        </button>
        <button
          type="button"
          onClick={() => setFrequency('monthly')}
          className={cn(
            'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5',
            frequency === 'monthly'
              ? 'bg-white text-secondary-800 shadow-sm'
              : 'text-primary-400 hover:text-primary-500',
          )}
        >
          <Repeat size={14} />
          Monthly
        </button>
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetSelect(preset)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-3.5 px-2 rounded-2xl transition-all duration-200',
              'border-2',
              selectedAmount === preset
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-transparent bg-primary-50/60 hover:bg-primary-50',
            )}
          >
            <span className="font-heading font-bold text-lg text-secondary-800">${preset}</span>
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="mb-4">
        <Input
          type="number"
          placeholder="Custom amount"
          value={customAmount}
          onChange={handleCustomChange}
          icon={<span className="text-primary-400 font-semibold">$</span>}
          min="1"
          max="50000"
          step="1"
          compact
        />
      </div>

      {/* Impact equivalency */}
      {isValid && impactText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 px-4 py-3 rounded-xl bg-primary-50/80 border border-primary-100"
        >
          <p className="text-sm text-primary-600 leading-relaxed">
            <Heart size={13} className="inline-block mr-1.5 text-primary-400 -mt-0.5" />
            ${amount} {impactText}
          </p>
          {frequency === 'monthly' && (
            <p className="text-xs text-primary-400 mt-1">
              That&apos;s ${amount * 12}/year of sustained impact
            </p>
          )}
        </motion.div>
      )}

      {/* Optional message */}
      <div className="mb-4">
        <Input
          type="textarea"
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={200}
          compact
        />
      </div>

      {/* Public toggle */}
      <div className="mb-5">
        <Toggle
          checked={isPublic}
          onChange={setIsPublic}
          label="Show on donor wall"
          description="Your name and amount will be visible to others"
          size="sm"
        />
      </div>

      {/* Donate button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        icon={createDonation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />}
        onClick={handleDonate}
        disabled={!isValid || !user || createDonation.isPending}
        className="shadow-[0_4px_16px_-4px_rgba(61,77,51,0.15)]"
      >
        {createDonation.isPending
          ? 'Setting up...'
          : `Donate $${amount}${frequency === 'monthly' ? '/mo' : ''}`}
      </Button>

      {createDonation.isError && (
        <p className="text-xs text-red-500 text-center mt-2">
          Something went wrong. Please try again.
        </p>
      )}

      {!user && (
        <p className="text-xs text-primary-300 text-center mt-3">
          <Link to="/auth/login" className="underline text-primary-500">Sign in</Link> to donate and track your impact
        </p>
      )}

      <p className="text-xs text-primary-300 text-center mt-3">
        Co-Exist Australia is a DGR-registered charity. Donations over $2 are tax-deductible.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main donate page                                                   */
/* ------------------------------------------------------------------ */

export default function DonatePage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  return (
    <Page
      swipeBack
      noBackground
      className="!px-0 !bg-transparent"
      stickyOverlay={<Header title="" back transparent className="collapse-header" />}
    >
      <div className="relative min-h-dvh">
        {/* ── Rich layered background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#f2ece0] via-[#f0ead9] via-30% to-[#eae5d4] to-65%" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-bark-50/12 to-moss-50/15" />

          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
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

        <PageDepthElements rm={rm} />
        <DonateHero rm={rm} />

        {/* ── Content ── */}
        <div className="relative z-10 px-5 lg:px-6 pt-6">
          <div className="max-w-2xl mx-auto">
            <motion.div
              variants={rm ? undefined : stagger}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* ── National stats strip ── */}
              <motion.div variants={fadeUp}>
                <NationalStatsStrip />
              </motion.div>

              {/* ── Donor wall link ── */}
              <motion.div variants={fadeUp}>
                <Link
                  to="/donate/donors"
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-[20px]',
                    'bg-white',
                    'shadow-[0_4px_20px_-4px_rgba(93,77,51,0.10),0_1px_4px_rgba(93,77,51,0.04)]',
                    'transition-transform hover:shadow-[0_6px_28px_-4px_rgba(93,77,51,0.14)] hover:-translate-y-0.5 active:scale-[0.98] duration-200',
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
                </Link>
              </motion.div>

              {/* ── Donation form ── */}
              <motion.div variants={fadeUp}>
                <DonationForm />
              </motion.div>

              <div className="h-20" />
            </motion.div>
          </div>
        </div>
      </div>
    </Page>
  )
}

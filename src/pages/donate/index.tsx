import { useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useParallaxLayers } from '@/hooks/use-parallax-scroll'
import { IMPACT_SELECT_COLUMNS, sumMetric } from '@/lib/impact-metrics'
import {
    Heart, Users, Repeat,
    TreePine, Waves, Loader2,
    Sparkles, Shield, ChevronRight,
    Leaf, MessageCircle,
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

function PageDepthElements({ rm: _rm }: { rm: boolean }) {
  return null
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
      iconBg: 'bg-primary-50 text-primary-600',
    },
    {
      icon: <Waves size={18} strokeWidth={2.5} />,
      value: `${(data.totalRubbishKg ?? 0).toLocaleString()} kg`,
      label: 'Rubbish cleared',
      iconBg: 'bg-moss-50 text-moss-600',
    },
    {
      icon: <Users size={18} strokeWidth={2.5} />,
      value: data.totalMembers.toLocaleString(),
      label: 'Members',
      iconBg: 'bg-sky-50 text-sky-600',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-white border border-neutral-100 shadow-sm"
        >
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', s.iconBg)}>
            {s.icon}
          </div>
          <span className="font-heading font-bold text-lg tabular-nums text-neutral-900">{s.value}</span>
          <span className="text-[11px] text-neutral-500 text-center leading-tight font-semibold uppercase tracking-wider">{s.label}</span>
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
      <div className="relative w-full h-[110vw] min-h-[480px] sm:h-auto overflow-hidden">
        <div
          ref={rm ? undefined : bgRef}
          className="h-full will-change-transform"
        >
          <img
            src="/img/donate-hero-bg.webp"
            alt="Conservation landscape"
            className="w-full h-full object-cover object-center sm:h-auto sm:object-fill block"
          />
        </div>

        <div
          ref={rm ? undefined : fgRef}
          className="absolute inset-0 z-[3] will-change-transform"
        >
          <img
            src="/img/donate-hero-fg.webp"
            alt=""
            className="w-full h-full object-cover object-center sm:h-auto sm:object-fill block"
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
            className="fill-white"
          />
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Donation form                                                      */
/* ------------------------------------------------------------------ */

function DonationForm({ rm }: { rm: boolean }) {
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
    <div className="relative bg-white border border-neutral-100 shadow-sm rounded-2xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
            <Heart size={19} className="text-primary-600" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-neutral-900 text-lg">
              Make a donation
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield size={11} className="text-neutral-400" />
              <p className="text-[11px] text-neutral-500 font-medium">
                Secure payment via Stripe
              </p>
            </div>
          </div>
        </div>

        {/* Frequency toggle */}
        <div className="flex rounded-2xl bg-neutral-50 border border-neutral-100 p-1.5 mb-6">
          <button
            type="button"
            onClick={() => setFrequency('one_time')}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
              frequency === 'one_time'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
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
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            )}
          >
            <Repeat size={14} />
            Monthly
          </button>
        </div>

        {/* Preset amounts */}
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">Choose an amount</p>
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          {PRESET_AMOUNTS.map((preset) => (
            <motion.button
              key={preset}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              whileTap={rm ? undefined : { scale: 0.95 }}
              className={cn(
                'relative flex flex-col items-center gap-0.5 py-4 px-2 rounded-2xl transition-all duration-200 cursor-pointer',
                'border-2',
                selectedAmount === preset
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300',
              )}
            >
              <span className={cn('font-heading font-extrabold text-xl', selectedAmount === preset ? 'text-white' : 'text-neutral-900')}>${preset}</span>
            </motion.button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-5">
          <Input
            type="number"
            placeholder="Enter a custom amount"
            value={customAmount}
            onChange={handleCustomChange}
            icon={<span className="text-neutral-500 font-bold text-base">$</span>}
            inputClassName="bg-neutral-50 border border-neutral-100 focus:bg-white"
            min="1"
            max="50000"
            step="1"
            compact
          />
        </div>

        {/* Impact equivalency */}
        {isValid && impactText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mb-5 px-4 py-3.5 rounded-2xl bg-white border border-neutral-100 shadow-sm"
          >
            <p className="text-sm text-neutral-900 leading-relaxed font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-primary-50 mr-1.5 -mt-0.5 align-middle"><Leaf size={11} className="text-primary-600" /></span>
              ${amount} {impactText}
            </p>
            {frequency === 'monthly' && (
              <p className="text-xs text-neutral-500 mt-1.5 pl-[22px]">
                That&apos;s <span className="font-semibold text-neutral-900">${amount * 12}/year</span> of sustained impact
              </p>
            )}
          </motion.div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-100 to-transparent mb-5" />

        {/* Optional message */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <MessageCircle size={12} />
            Leave a message
          </p>
          <Input
            type="textarea"
            placeholder="Share why you're supporting Co-Exist (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            inputClassName="bg-neutral-50 border border-neutral-100 focus:bg-white"
            rows={2}
            maxLength={200}
            compact
          />
          {message.length > 0 && (
            <p className="text-[10px] text-neutral-400 text-right mt-1">{message.length}/200</p>
          )}
        </div>

        {/* Public toggle */}
        <div className="mb-6 px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-100">
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
          className="shadow-lg shadow-primary-600/20 !rounded-2xl"
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
          <p className="text-xs text-neutral-400 text-center mt-3">
            <Link to="/auth/login" className="underline text-neutral-500 font-medium">Sign in</Link> to donate and track your impact
          </p>
        )}

        <p className="text-[11px] text-neutral-400 text-center mt-4 leading-relaxed">
          Co-Exist Australia is a DGR-registered charity.
          <br />
          Donations over $2 are tax-deductible.
        </p>
      </div>
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
        {/* ── Background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-white" />
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

              {/* ── Donation form ── */}
              <motion.div variants={fadeUp}>
                <DonationForm rm={rm} />
              </motion.div>

              {/* ── Donor wall link ── */}
              <motion.div variants={fadeUp}>
                <Link
                  to="/donate/donors"
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl',
                    'bg-white border border-neutral-100 shadow-sm',
                    'transition-all active:scale-[0.98] duration-200',
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-bold text-neutral-900">
                      View donor wall
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      See who&apos;s making a difference
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-neutral-400 shrink-0" />
                </Link>
              </motion.div>

              {/* ── Tax deductibility note ── */}
              <motion.div variants={fadeUp}>
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white border border-neutral-100 shadow-sm">
                  <Shield size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500 font-medium">Tax-deductible giving</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                      Co-Exist Australia is DGR-registered. Donations over $2 are tax-deductible. You&apos;ll receive a receipt via email.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="h-20" />
            </motion.div>
          </div>
        </div>
      </div>
    </Page>
  )
}

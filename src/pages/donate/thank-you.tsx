import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  Heart, Share2, Calendar, Users, Trophy,
  Leaf, Sparkles,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { WhatsNext } from '@/components/whats-next'
import { cn } from '@/lib/cn'
import { getImpactMessage } from '@/types/donations'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ------------------------------------------------------------------ */
/*  Confetti burst                                                     */
/* ------------------------------------------------------------------ */

const PARTICLE_COUNT = 40
const CONFETTI_COLORS = [
  '#5a835a', '#6b9b6b', '#b07d46', '#c89454', '#e97c28',
  '#4ade80', '#a3d977', '#d4a853', '#8fbc6a', '#e8b960',
  '#7cb07c', '#c5a25e',
]
const SHAPES = ['circle', 'square', 'strip'] as const

function Confetti({ rm }: { rm: boolean }) {
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      width: 5 + Math.random() * 9,
      height: 5 + Math.random() * 9,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
      drift: (Math.random() - 0.5) * 80,
      duration: 2.8 + Math.random() * 1.5,
      shape: SHAPES[i % SHAPES.length],
    })),
  )

  if (rm) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: '110vh',
            x: `calc(${p.x}vw + ${p.drift}px)`,
            rotate: p.rotation + 720,
            opacity: [1, 1, 1, 0],
            scale: [1, 1, 0.6],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="absolute"
          style={{
            width: p.shape === 'strip' ? p.width * 0.4 : p.width,
            height: p.shape === 'strip' ? p.height * 2 : p.height,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'strip' ? '1px' : '2px',
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Decorative depth elements (celebration variant)                    */
/* ------------------------------------------------------------------ */

function CelebrationDepthElements({ rm }: { rm: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Breathing rings */}
      <motion.div
        className="absolute -top-20 -right-16 w-64 h-64 rounded-full border-[3px] border-sprout-300/15"
        animate={rm ? undefined : { scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -top-6 -right-2 w-40 h-40 rounded-full border-2 border-primary-200/20"
        animate={rm ? undefined : { scale: [1, 1.04, 1], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute top-[40%] -left-12 w-48 h-48 rounded-full border-[2.5px] border-primary-200/12"
        animate={rm ? undefined : { scale: [1, 1.07, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Floating particles */}
      <motion.div
        className="absolute top-[15%] right-[14%] w-3 h-3 rounded-full bg-sprout-400/15"
        animate={rm ? undefined : { y: [-5, 5, -5], x: [0, 3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[50%] left-[8%] w-2.5 h-2.5 rounded-full bg-primary-400/12"
        animate={rm ? undefined : { y: [3, -4, 3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        className="absolute top-[28%] left-[22%] w-2 h-2 rounded-full bg-sprout-300/10"
        animate={rm ? undefined : { y: [-3, 4, -3], x: [2, -2, 2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />
      <motion.div
        className="absolute top-[65%] right-[20%] w-2.5 h-2.5 rounded-full bg-primary-300/10"
        animate={rm ? undefined : { y: [4, -3, 4] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2.2 }}
      />

      {/* Rich blurred orbs */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-200/15 via-primary-100/8 to-transparent" />
      <div className="absolute -top-10 -left-12 w-[260px] h-[240px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-200/10 to-transparent" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pulsing heart icon                                                 */
/* ------------------------------------------------------------------ */

function CelebrationHeart({ rm }: { rm: boolean }) {
  return (
    <div className="relative">
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-sprout-400/20 to-primary-400/15"
        animate={rm ? undefined : { scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 96, height: 96, top: -8, left: -8 }}
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-400/15 to-sprout-300/10"
        animate={rm ? undefined : { scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ width: 96, height: 96, top: -8, left: -8 }}
      />

      {/* Heart container */}
      <motion.div
        initial={rm ? false : { scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }}
        className="relative w-20 h-20 rounded-full flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 via-sprout-500 to-moss-500 shadow-lg shadow-primary-500/25" />
        <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-primary-400 via-sprout-400 to-moss-400" />
        <motion.div
          animate={rm ? undefined : { scale: [1, 1.12, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10"
        >
          <Heart size={32} className="text-white drop-shadow-sm" fill="currentColor" />
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Thank you page                                                     */
/* ------------------------------------------------------------------ */

export default function DonateThankYouPage() {
  const [searchParams] = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const [showConfetti, setShowConfetti] = useState(true)

  const rawAmount = Number(searchParams.get('amount') ?? 25)
  const amount = Number.isFinite(rawAmount) && rawAmount >= 1 && rawAmount <= 50000
    ? rawAmount
    : 25
  const isRecurring = searchParams.get('recurring') === 'true'
  const impactMessage = getImpactMessage(amount)
  const points = Math.floor(amount)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleShare = async () => {
    const recurringLabel = isRecurring ? ' monthly' : ''
    const text = `I just donated $${amount}${recurringLabel} to Co-Exist Australia! Every dollar goes to conservation. Join me: coexistaus.org/donate`
    if (navigator.share) {
      try {
        await navigator.share({ text, url: 'https://coexistaus.org/donate' })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

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
          <div className="absolute inset-0 bg-gradient-to-b from-[#f2ece0] via-[#eef5e8] via-40% to-[#f0f4ec] to-70%" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-sprout-50/15 to-primary-50/20" />

          {/* Topographic pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ty-topo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M20 100c30-40 70-60 100-40s60 50 80 20" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M10 140c40-30 80-50 120-30s50 40 70 10" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M30 60c25-35 55-45 85-25s45 35 65 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="160" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="160" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ty-topo)" className="text-primary-900" />
          </svg>
        </div>

        <CelebrationDepthElements rm={rm} />
        {showConfetti && <Confetti rm={rm} />}

        {/* ── Hero celebration area ── */}
        <div className="relative overflow-hidden">
          {/* Warm gradient hero band */}
          <div className="relative pt-20 pb-14 sm:pt-24 sm:pb-16">
            <div className="absolute inset-0 bg-gradient-to-b from-[#e8dfc8]/60 via-[#e5ecd9]/40 to-transparent" />

            <motion.div
              variants={rm ? undefined : stagger}
              initial="hidden"
              animate="visible"
              className="relative z-10 flex flex-col items-center px-6"
            >
              {/* Heart icon with glow */}
              <motion.div variants={fadeUp}>
                <CelebrationHeart rm={rm} />
              </motion.div>

              {/* Heading */}
              <motion.div variants={fadeUp} className="mt-6 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-400/70 block mb-1.5">
                  Donation Successful
                </span>
                <h1 className="font-heading text-[2rem] sm:text-[2.5rem] font-bold text-secondary-800 leading-tight">
                  Thank you!
                </h1>
              </motion.div>

              {/* Amount display */}
              <motion.div variants={fadeUp} className="mt-4 text-center">
                <p className="font-heading text-4xl sm:text-5xl font-extrabold tabular-nums text-secondary-900 tracking-tight">
                  ${amount}
                  {isRecurring && (
                    <span className="text-xl sm:text-2xl font-bold text-primary-400 ml-1">/mo</span>
                  )}
                </p>
                {isRecurring && (
                  <p className="mt-1.5 text-xs text-primary-400 font-medium">
                    Monthly donation &middot; cancel anytime from your profile
                  </p>
                )}
              </motion.div>

              {/* Points pill */}
              <motion.div variants={fadeUp} className="mt-4">
                <motion.div
                  initial={rm ? false : { scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.8 }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
                    'bg-gradient-to-r from-sprout-500 to-primary-500',
                    'shadow-md shadow-primary-500/20',
                  )}
                >
                  <Sparkles size={14} className="text-white/90" />
                  <span className="text-sm font-bold text-white tabular-nums">
                    +{points} points
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Organic edge */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 40"
              preserveAspectRatio="none"
              className="w-full h-5 block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,20 C120,8 240,28 360,18 C480,8 600,28 720,16 C840,4 960,24 1080,14 C1200,4 1320,22 1440,18 L1440,40 L0,40 Z"
                className="fill-[#f0eedf]/0"
              />
            </svg>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 px-5 lg:px-6 -mt-2">
          <div className="max-w-lg mx-auto">
            <motion.div
              variants={rm ? undefined : stagger}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {/* ── Impact card ── */}
              <motion.div variants={fadeUp}>
                <div className="relative rounded-[24px] overflow-hidden shadow-[0_8px_32px_-8px_rgba(93,77,51,0.12),0_2px_8px_rgba(93,77,51,0.04)]">
                  {/* Accent bar */}
                  <div className="h-1.5 bg-gradient-to-r from-primary-400 via-sprout-400 to-moss-400" />

                  <div className="bg-white p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sprout-500 to-primary-600 flex items-center justify-center shrink-0 shadow-md shadow-sprout-500/20">
                        <Leaf size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                          Your Impact
                        </p>
                        <p className="text-sm text-secondary-800 font-medium leading-relaxed mt-1">
                          {impactMessage}
                        </p>
                      </div>
                    </div>

                    {isRecurring && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-primary-100 to-transparent my-3" />
                        <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-sprout-50/80 to-primary-50/60 border border-sprout-200/30">
                          <p className="text-xs text-primary-600 font-medium">
                            <span className="font-bold text-primary-700 tabular-nums">${amount * 12}/year</span> of sustained conservation impact
                          </p>
                          <p className="text-[11px] text-primary-400 mt-0.5">
                            Your monthly support provides ongoing, predictable funding for habitat restoration
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── Share button ── */}
              <motion.div variants={fadeUp}>
                <button
                  type="button"
                  onClick={handleShare}
                  className={cn(
                    'flex items-center gap-3 w-full p-4 rounded-[20px]',
                    'bg-white/90 backdrop-blur-sm',
                    'shadow-[0_4px_20px_-4px_rgba(93,77,51,0.10),0_1px_4px_rgba(93,77,51,0.04)]',
                    'border border-primary-100/30',
                    'transition-all hover:shadow-[0_6px_28px_-4px_rgba(93,77,51,0.14)] hover:-translate-y-0.5 active:scale-[0.98] duration-200',
                    'min-h-[44px]',
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-sprout-600 flex items-center justify-center shrink-0 shadow-md shadow-primary-400/25">
                    <Share2 size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-heading text-sm font-bold text-secondary-800">
                      Share your impact
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      Inspire others to support conservation
                    </p>
                  </div>
                </button>
              </motion.div>

              {/* ── Divider ── */}
              <div className="h-px bg-gradient-to-r from-transparent via-primary-100/60 to-transparent" />

              {/* ── What's next ── */}
              <motion.div variants={fadeUp}>
                <WhatsNext
                  suggestions={[
                    {
                      label: 'Find an Event',
                      description: 'Put your donation into action',
                      icon: <Calendar size={18} />,
                      to: '/events',
                    },
                    {
                      label: 'View Donor Wall',
                      description: 'See the community of supporters',
                      icon: <Users size={18} />,
                      to: '/donate/donors',
                    },
                    {
                      label: 'View Your Impact',
                      description: 'See how your contributions add up',
                      icon: <Trophy size={18} />,
                      to: '/profile',
                    },
                  ]}
                />
              </motion.div>

              {/* ── Tax note ── */}
              <motion.div variants={fadeUp}>
                <p className="text-[11px] text-primary-300 text-center leading-relaxed pb-2">
                  A receipt has been sent to your email.
                  <br />
                  Donations over $2 are tax-deductible.
                </p>
              </motion.div>

              <div className="h-20" />
            </motion.div>
          </div>
        </div>
      </div>
    </Page>
  )
}

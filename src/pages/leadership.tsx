import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
    Users,
    TreePine,
    CalendarDays,
    Heart,
    Star,
    ChevronRight,
    Megaphone,
    CheckCircle2,
    Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'
import { useParallaxLayers } from '@/hooks/use-parallax-scroll'

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const WHAT_LEADERS_DO = [
  {
    icon: <CalendarDays size={22} />,
    title: 'Organise Events',
    description: 'Plan and run conservation activities like tree planting days, beach cleanups, and habitat restoration.',
    gradient: 'from-primary-600 via-primary-700 to-secondary-800',
    shadow: 'shadow-xl shadow-primary-900/30',
  },
  {
    icon: <Users size={22} />,
    title: 'Build Community',
    description: 'Grow your local collective, welcome new members, and create a sense of belonging.',
    gradient: 'from-sky-500 via-sky-600 to-sky-800',
    shadow: 'shadow-xl shadow-sky-900/30',
  },
  {
    icon: <TreePine size={22} />,
    title: 'Track Impact',
    description: 'Log conservation outcomes - trees planted, rubbish removed, species identified - to show real change.',
    gradient: 'from-moss-500 via-moss-600 to-moss-800',
    shadow: 'shadow-xl shadow-moss-900/30',
  },
  {
    icon: <Megaphone size={22} />,
    title: 'Spread the Word',
    description: 'Share your collective\'s story, recruit new volunteers, and inspire your community.',
    gradient: 'from-warning-500 via-bark-500 to-bark-700',
    shadow: 'shadow-xl shadow-bark-900/30',
  },
]

const REQUIREMENTS = [
  'Be 18–30 years old and based in Australia',
  'Passionate about conservation and the environment',
  'Able to commit a few hours per month to organising',
  'Great communicator who enjoys working with people',
  'Willing to complete a brief leader onboarding',
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeadershipPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const navigate = useNavigate()
  const { bgRef, fgRef, textRef } = useParallaxLayers({ textRange: 180, withScale: false })

  return (
    <Page swipeBack noBackground className="!px-0 bg-white" stickyOverlay={<Header title="" back transparent className="collapse-header" />}>
      {/* Hero – layered image parallax (matches donate page pattern) */}
      <div className="relative">
        <div className="relative w-full h-[480px] sm:h-auto overflow-hidden">
          {/* Background layer - covers container, clips sides on narrow screens */}
          <div
            ref={rm ? undefined : bgRef}
            className="absolute inset-0 sm:relative sm:inset-auto will-change-transform"
          >
            <img
              src="/img/leadership-hero-bg.webp"
              alt="Co-Exist leadership landscape"
              decoding="async"
              fetchPriority="high"
              className="h-full w-auto min-w-full object-cover object-center sm:w-full sm:h-auto sm:object-fill block"
            />
          </div>

          {/* Foreground cutout - same sizing, pinned to top */}
          <div
            ref={rm ? undefined : fgRef}
            className="absolute inset-0 z-[3] will-change-transform"
          >
            <img
              src="/img/leadership-hero-fg.webp"
              alt=""
              decoding="async"
              className="h-full w-auto min-w-full object-cover object-center sm:w-full sm:h-auto sm:object-fill block"
            />
          </div>

          {/* Scrim for text legibility */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/20 to-transparent" />

          {/* Hero text */}
          <div
            ref={rm ? undefined : textRef}
            className="absolute inset-x-0 top-[22%] sm:top-[16%] z-[2] flex flex-col items-center px-6 will-change-transform"
          >
            <span className="text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-[0.3em] text-white mb-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
              Leadership Opportunities
            </span>
            <span role="heading" aria-level={1} className="font-heading text-[2.5rem] sm:text-[3.5rem] lg:text-[5rem] font-bold uppercase text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] leading-[0.85] block text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)' }}>
              Become a Leader
            </span>
          </div>
        </div>

        {/* Wave transition */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            className="w-full h-20 sm:h-28 block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,80 C80,68 160,56 240,62 C320,68 360,34 400,40 L408,14 L414,8 L420,22 C460,46 540,74 640,68 C740,62 800,50 880,56 C960,62 1000,28 1040,34 L1048,12 L1054,6 L1060,20 C1100,46 1180,80 1280,74 C1360,68 1400,80 1440,74 L1440,200 L0,200 Z"
              className="fill-white"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="px-6 space-y-8 pb-12 pt-6"
        initial="hidden"
        animate="visible"
        variants={shouldReduceMotion ? undefined : stagger}
      >
        <p className="text-sm text-primary-500 text-center">
          Bring together local volunteers, organise events, and drive real environmental change.
        </p>

        {/* What leaders do - rich colored cards */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary-700/60 mb-3 px-1">
            What leaders do
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {WHAT_LEADERS_DO.map(({ icon, title, description, gradient, shadow }) => (
              <div
                key={title}
                className={cn(
                  'rounded-2xl p-5',
                  'bg-gradient-to-br',
                  gradient,
                  shadow,
                )}
              >
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 text-white mb-3.5">
                  {icon}
                </span>
                <span className="font-heading text-[15px] font-bold text-white block">
                  {title}
                </span>
                <p className="text-[13px] text-white/75 mt-1.5 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* What we look for */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary-700/60 mb-3 px-1">
            What we look for
          </h3>
          <div className="rounded-2xl bg-gradient-to-br from-bark-500 via-bark-700 to-bark-800 shadow-xl shadow-bark-900/30 p-6 space-y-3.5">
            {REQUIREMENTS.map((req) => (
              <div key={req} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-white/60 mt-0.5 shrink-0" />
                <p className="text-[14px] text-white leading-snug">{req}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* How to apply */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary-700/60 mb-3 px-1">
            How to apply
          </h3>
          <div className="rounded-2xl bg-gradient-to-br from-sprout-500 via-sprout-600 to-primary-800 shadow-xl shadow-sprout-900/30 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <Sparkles size={20} className="text-white/70" />
              <span className="font-heading text-base font-bold text-white">
                Ready to lead?
              </span>
            </div>
            <p className="text-[14px] text-white/75 leading-relaxed">
              Interested in starting or leading a collective in your area? We'd love to hear from you.
              Reach out to our team and we'll guide you through the onboarding process.
            </p>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              icon={<Heart size={16} />}
              onClick={() => navigate('/lead-a-collective')}
            >
              Get in Touch
            </Button>
          </div>
        </motion.section>

        {/* Existing leader nudge */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-gradient-to-r from-moss-500 via-moss-600 to-moss-800 shadow-xl shadow-moss-900/25"
        >
          <Users size={20} className="text-white/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white">
              Already a leader?
            </p>
            <p className="text-[12px] text-white/60 mt-0.5">
              Access your Leader Dashboard from the sidebar.
            </p>
          </div>
          <ChevronRight size={16} className="text-white/40 shrink-0" />
        </motion.div>
      </motion.div>
    </Page>
  )
}

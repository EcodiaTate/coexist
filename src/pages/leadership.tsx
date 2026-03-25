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
  const navigate = useNavigate()

  return (
    <Page swipeBack noBackground className="!px-0 bg-white" stickyOverlay={<Header title="" back transparent className="collapse-header" />}>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-secondary-800">
        {/* Decorative shapes - "rising leaders" formation */}
        <div className="absolute -left-14 -top-14 w-72 h-72 rounded-full border border-white/[0.07]" />
        <div className="absolute -left-4 -top-4 w-44 h-44 rounded-full bg-white/[0.05]" />
        <div className="absolute -right-10 bottom-[10%] w-52 h-52 rounded-full bg-white/[0.04]" />
        <div className="absolute right-[20%] top-4 w-16 h-16 rounded-full border border-white/[0.10]" />
        <div className="absolute left-[40%] bottom-8 w-10 h-10 rounded-full bg-white/[0.06]" />

        <div
          className="relative z-10 px-6 pt-14 pb-16 text-center"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 3.5rem)' }}
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-5"
          >
            <Star size={32} className="text-white" />
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 block mb-2">
              Leadership Opportunities
            </span>
            <span className="font-heading text-3xl sm:text-4xl font-bold text-white block">
              Become a Collective Leader
            </span>
            <p className="text-sm sm:text-base text-white/70 mt-3 max-w-md mx-auto leading-relaxed">
              Collective leaders are the backbone of Co-Exist. Bring together local volunteers,
              organise events, and drive real environmental change.
            </p>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg
            viewBox="0 0 1440 70"
            preserveAspectRatio="none"
            className="w-full h-7 sm:h-10 block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,28 C80,24 160,20 240,22 C320,24 360,12 400,14 L408,5 L414,3 L420,8 C460,16 540,26 640,24 C740,22 800,18 880,20 C960,22 1000,10 1040,12 L1048,4 L1054,2 L1060,7 C1100,16 1180,28 1280,26 C1360,24 1400,28 1440,26 L1440,70 L0,70 Z"
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

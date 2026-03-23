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
    gradient: 'from-primary-600 to-primary-800',
  },
  {
    icon: <Users size={22} />,
    title: 'Build Community',
    description: 'Grow your local collective, welcome new members, and create a sense of belonging.',
    gradient: 'from-sky-500 to-sky-700',
  },
  {
    icon: <TreePine size={22} />,
    title: 'Track Impact',
    description: 'Log conservation outcomes - trees planted, rubbish removed, species identified - to show real change.',
    gradient: 'from-moss-500 to-moss-700',
  },
  {
    icon: <Megaphone size={22} />,
    title: 'Spread the Word',
    description: 'Share your collective\'s story, recruit new volunteers, and inspire your community.',
    gradient: 'from-sprout-500 to-sprout-700',
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
    <Page noBackground className="!px-0 bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-secondary-800">
        {/* Decorative elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-8 w-20 h-20 rounded-full border border-white/10" />

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
              d="M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WHAT_LEADERS_DO.map(({ icon, title, description, gradient }) => (
              <div
                key={title}
                className={cn(
                  'rounded-2xl p-5 shadow-lg',
                  'bg-gradient-to-br',
                  gradient,
                )}
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 text-white mb-3">
                  {icon}
                </span>
                <span className="font-heading text-base font-bold text-white block">
                  {title}
                </span>
                <p className="text-[13px] text-white/70 mt-1 leading-relaxed">
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
          <div className="rounded-2xl bg-gradient-to-br from-bark-600 to-bark-800 shadow-lg p-6 space-y-3.5">
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
          <div className="rounded-2xl bg-gradient-to-br from-sprout-600 to-primary-700 shadow-lg p-6 space-y-4">
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
              onClick={() => navigate('/contact')}
            >
              Get in Touch
            </Button>
          </div>
        </motion.section>

        {/* Existing leader nudge */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-gradient-to-r from-moss-600 to-moss-700 shadow-md"
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

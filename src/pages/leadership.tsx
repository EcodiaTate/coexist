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
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const WHAT_LEADERS_DO = [
  {
    icon: <CalendarDays size={20} />,
    title: 'Organise Events',
    description: 'Plan and run conservation activities like tree planting days, beach cleanups, and habitat restoration.',
  },
  {
    icon: <Users size={20} />,
    title: 'Build Community',
    description: 'Grow your local collective, welcome new members, and create a sense of belonging.',
  },
  {
    icon: <TreePine size={20} />,
    title: 'Track Impact',
    description: 'Log conservation outcomes — trees planted, rubbish removed, species identified — to show real change.',
  },
  {
    icon: <Megaphone size={20} />,
    title: 'Spread the Word',
    description: 'Share your collective\'s story, recruit new volunteers, and inspire your community.',
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
    <Page
      header={
        <header
          className="sticky top-0 z-40 px-5 pt-2 pb-3"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.5rem)' }}
        >
          <h1 className="font-heading text-2xl font-bold text-primary-900">
            Leadership Opportunities
          </h1>
          <p className="text-[13px] text-primary-400 mt-0.5">
            Lead a collective and make a real difference
          </p>
        </header>
      }
      className="bg-surface-1"
    >
      <motion.div
        className="space-y-6 pb-10"
        initial="hidden"
        animate="visible"
        variants={shouldReduceMotion ? undefined : stagger}
      >
        {/* Hero section */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className={cn(
            'rounded-2xl overflow-hidden',
            'bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-700',
            'p-6 text-white',
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Star size={22} className="text-white" />
            </div>
            <h2 className="font-heading text-lg font-bold">
              Become a Collective Leader
            </h2>
          </div>
          <p className="text-[14px] text-white/80 leading-relaxed">
            Collective leaders are the backbone of Co-Exist. They bring together local volunteers,
            organise conservation events, and drive real environmental change in their communities.
          </p>
        </motion.div>

        {/* What leaders do */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary-400/70 mb-1.5 px-1">
            What leaders do
          </h3>
          <div className="space-y-2">
            {WHAT_LEADERS_DO.map(({ icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl bg-surface-0 shadow-sm p-4 flex items-start gap-3.5"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-50 text-primary-600 shrink-0 mt-0.5">
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-primary-900 leading-tight">
                    {title}
                  </h4>
                  <p className="text-[13px] text-primary-500 mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* What we look for */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary-400/70 mb-1.5 px-1">
            What we look for
          </h3>
          <div className="rounded-2xl bg-surface-0 shadow-sm p-5 space-y-3">
            {REQUIREMENTS.map((req) => (
              <div key={req} className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-sprout-500 mt-0.5 shrink-0" />
                <p className="text-[14px] text-primary-700 leading-snug">{req}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* How to apply */}
        <motion.section variants={shouldReduceMotion ? undefined : fadeUp}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary-400/70 mb-1.5 px-1">
            How to apply
          </h3>
          <div className="rounded-2xl bg-surface-0 shadow-sm p-5 space-y-4">
            <p className="text-[14px] text-primary-700 leading-relaxed">
              Interested in starting or leading a collective in your area? We'd love to hear from you.
              Reach out to our team and we'll guide you through the onboarding process.
            </p>
            <Button
              variant="primary"
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
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-moss-50/60"
        >
          <Users size={18} className="text-moss-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-moss-700">
              Already a leader?
            </p>
            <p className="text-[12px] text-moss-500 mt-0.5">
              Access your Leader Dashboard from the sidebar or More menu to manage your collective.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </Page>
  )
}

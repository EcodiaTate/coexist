import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Crown, CalendarPlus, Users, MessageSquare, BarChart3, ArrowRight } from 'lucide-react'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

const LEADER_TOOLS = [
  {
    icon: <CalendarPlus size={20} />,
    title: 'Create Events',
    description: 'Set up conservation activities for your collective.',
  },
  {
    icon: <Users size={20} />,
    title: 'Manage Members',
    description: 'Welcome new members and assign roles.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Group Chat',
    description: 'Moderate conversations and pin announcements.',
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Log Impact',
    description: 'Track trees planted, rubbish collected, and more.',
  },
]

export default function LeaderWelcomePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <motion.div
        className="flex-1 flex flex-col px-6 pt-12"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Crown badge */}
        <motion.div
          variants={{
            hidden: { scale: 0.5, opacity: 0 },
            visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 15 } },
          }}
          className="mx-auto mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-accent-100 flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary-400" />
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-heading text-2xl font-bold text-primary-800 text-center"
        >
          Welcome, Leader!
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-2 text-primary-400 text-center max-w-xs mx-auto leading-relaxed"
        >
          You've got the tools to make a real difference. Here's a quick look at what you can do.
        </motion.p>

        {/* Tool cards */}
        <div className="mt-8 space-y-3">
          {LEADER_TOOLS.map((tool) => (
            <motion.div
              key={tool.title}
              variants={fadeUp}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl',
                'bg-white shadow-sm',
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 text-primary-400">
                {tool.icon}
              </div>
              <div>
                <p className="font-semibold text-sm text-primary-800">{tool.title}</p>
                <p className="text-xs text-primary-400 mt-0.5">{tool.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-6 py-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight size={20} />}
          onClick={() => navigate('/', { replace: true })}
        >
          Start leading
        </Button>
      </motion.div>
    </div>
  )
}

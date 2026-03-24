import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  PartyPopper,
  ArrowRight,
  BookOpen,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/button'
import { Confetti } from '@/components/confetti'
import { useDevModule, useDevSection } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LearnCompletePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  const type = searchParams.get('type') // 'module' | 'section'
  const id = searchParams.get('id')

  const { data: module } = useDevModule(type === 'module' ? (id ?? undefined) : undefined)
  const { data: section } = useDevSection(type === 'section' ? (id ?? undefined) : undefined)

  const title = module?.title ?? section?.title ?? 'Content'
  const isModule = type === 'module'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] pb-20 px-4">
      {/* Confetti! */}
      {!rm && <Confetti active />}

      <motion.div
        initial={rm ? {} : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <motion.div
          initial={rm ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-moss-100 to-moss-200 mb-6"
        >
          <PartyPopper size={36} className="text-moss-600" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={rm ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-heading text-2xl font-bold text-primary-800 mb-2"
        >
          {isModule ? 'Module Complete!' : 'Section Complete!'}
        </motion.h1>

        <motion.p
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-primary-500 mb-8"
        >
          You've completed <span className="font-semibold text-primary-700">{title}</span>.
          Great work on your leadership journey!
        </motion.p>

        {/* Completed card */}
        <motion.div
          initial={rm ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-white/60 shadow-sm mb-8"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-moss-100 to-moss-200">
            {isModule ? (
              <BookOpen size={18} className="text-moss-600" />
            ) : (
              <Layers size={18} className="text-moss-600" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-primary-800">{title}</p>
            <p className="text-xs text-moss-600 font-medium">Completed</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => navigate('/learn')}
          >
            Continue Learning
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}

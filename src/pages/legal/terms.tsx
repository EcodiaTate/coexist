import { motion, useReducedMotion } from 'framer-motion'
import { Page } from '@/components/page'

export default function TermsOfServicePage() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <Page>
      <motion.div
        className="py-8 space-y-6"
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className="font-heading text-2xl font-bold text-primary-800 text-center">
          Terms of Service
        </h1>
        <p className="text-sm text-primary-400 leading-relaxed">
          These terms of service govern your use of the Co-Exist app and
          website. By creating an account you agree to these terms.
        </p>
        <p className="text-sm text-primary-400 leading-relaxed">
          Full terms coming soon. For questions contact{' '}
          <a
            href="mailto:hello@coexistaus.org"
            className="text-primary-500 font-medium hover:underline"
          >
            hello@coexistaus.org
          </a>
        </p>
      </motion.div>
    </Page>
  )
}

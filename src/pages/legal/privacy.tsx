import { motion, useReducedMotion } from 'framer-motion'
import { Page } from '@/components/page'
import { OGMeta } from '@/components/og-meta'

export default function PrivacyPolicyPage() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <Page>
      <OGMeta
        title="Privacy Policy"
        description="Co-Exist Australia's Privacy Policy. Learn how we collect, use, and safeguard your personal information when you use the Co-Exist conservation platform."
        canonicalPath="/privacy"
      />
      <motion.div
        className="py-8 space-y-6"
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className="font-heading text-2xl font-bold text-primary-800 text-center">
          Privacy Policy
        </h1>
        <p className="text-sm text-primary-400 leading-relaxed">
          Co-Exist Australia is committed to protecting your privacy. This
          policy explains how we collect, use, and safeguard your personal
          information.
        </p>
        <p className="text-sm text-primary-400 leading-relaxed">
          Full policy coming soon. For questions contact{' '}
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

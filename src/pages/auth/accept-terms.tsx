import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { FileText, Shield } from 'lucide-react'
import { Button } from '@/components/button'
import { Checkbox } from '@/components/checkbox'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/use-auth'

const CURRENT_TOS_VERSION = '1.0'

export default function AcceptTermsPage() {
  const navigate = useNavigate()
  const { acceptTos, signOut } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      await acceptTos(CURRENT_TOS_VERSION)
      navigate('/', { replace: true })
    } catch {
      // TOS acceptance failed - don't navigate, let user retry
      setIsSubmitting(false)
    }
  }

  const handleDecline = async () => {
    await signOut()
    navigate('/welcome', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Header title="Updated Terms" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col px-6 pt-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white text-primary-400">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-primary-800">
              Terms & Conditions Updated
            </h1>
            <p className="text-sm text-primary-400">Version {CURRENT_TOS_VERSION}</p>
          </div>
        </div>

        <p className="text-sm text-primary-400 leading-relaxed mb-4">
          We've updated our Terms of Service and Privacy Policy. Please review and accept
          the updated terms to continue using Co-Exist.
        </p>

        <div className="flex-1 overflow-y-auto rounded-xl border border-primary-200 bg-white p-4 mb-4 max-h-[50vh]">
          <h2 className="font-heading text-sm font-semibold text-primary-800 mb-2">
            Summary of Changes
          </h2>
          <ul className="space-y-2 text-xs text-primary-400 list-disc pl-4">
            <li>Updated data privacy practices in line with GDPR and Australian Privacy Act</li>
            <li>Added data export and account deletion rights</li>
            <li>Clarified content moderation and reporting policies</li>
            <li>Updated age verification requirements (18+)</li>
            <li>Added cookie consent and analytics disclosure</li>
          </ul>
        </div>

        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label="I have read and agree to the updated Terms of Service and Privacy Policy"
        />

        <div
          className="mt-6 space-y-3"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!agreed}
            loading={isSubmitting}
            onClick={handleAccept}
          >
            Accept & Continue
          </Button>

          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={handleDecline}
            className="text-primary-400"
          >
            Decline & Log Out
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

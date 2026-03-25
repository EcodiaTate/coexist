import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Share2,
  Copy,
  Users,
  Gift,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useReferralCode, useReferralStats } from '@/hooks/use-referral'
import { analytics, ANALYTICS_EVENTS } from '@/lib/analytics'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function ReferralSkeleton() {
  return (
    <div className="py-6 space-y-6">
      <Skeleton variant="card" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReferralPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { toast } = useToast()
  const { data: code, isLoading: codeLoading, createCode } = useReferralCode()
  const showLoading = useDelayedLoading(codeLoading)
  const { data: stats } = useReferralStats()

  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const referralLink = code
    ? `${window.location.origin}/signup?ref=${code}`
    : ''

  const handleCopy = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link copied!')
      analytics.track(ANALYTICS_EVENTS.REFERRAL_SHARED, { method: 'copy' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  const handleShare = async () => {
    if (!referralLink) return
    const shareData = {
      title: 'Join Co-Exist',
      text: 'Join me on Co-Exist - the conservation movement for young Australians!',
      url: referralLink,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        analytics.track(ANALYTICS_EVENTS.REFERRAL_SHARED, { method: 'native_share' })
      } else {
        await handleCopy()
      }
    } catch (err) {
      // User cancelled the share dialog — not an error
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error('Could not share link')
    }
  }

  const handleCreateCode = async () => {
    setIsCreating(true)
    try {
      await createCode.mutateAsync()
    } catch {
      toast.error('Could not generate referral code')
    } finally {
      setIsCreating(false)
    }
  }

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Invite Friends" back />}>
        <ReferralSkeleton />
      </Page>
    )
  }
  if (codeLoading) return null

  return (
    <Page swipeBack header={<Header title="Invite Friends" back />}>
      <div className="relative min-h-[calc(100dvh-4rem)] overflow-x-hidden">
        {/* Full-bleed gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-moss-50/50 via-white to-sky-50/15" />

        {/* Decorative geometric shapes */}
        <motion.div
          className="absolute top-12 -right-12 w-56 h-56 rounded-full border border-moss-200/35"
          animate={rm ? undefined : { rotate: 360 }}
          transition={rm ? undefined : { duration: 50, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-44 -left-16 w-44 h-44 rounded-full border border-moss-200/35"
          animate={rm ? undefined : { rotate: -360 }}
          transition={rm ? undefined : { duration: 60, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-24 right-10 w-20 h-20 rounded-full bg-moss-100/25"
          animate={rm ? undefined : { y: [0, -12, 0] }}
          transition={rm ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-80 left-6 w-16 h-16 rounded-full bg-moss-100/25"
          animate={rm ? undefined : { y: [0, 10, 0] }}
          transition={rm ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-40 -right-8 w-32 h-32 rounded-full border border-moss-200/35"
          animate={rm ? undefined : { rotate: 360 }}
          transition={rm ? undefined : { duration: 70, repeat: Infinity, ease: 'linear' }}
        />

        {/* Floating dots */}
        <motion.div
          className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-sky-300/20"
          animate={rm ? undefined : { y: [0, -8, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={rm ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-56 right-1/4 w-1.5 h-1.5 rounded-full bg-moss-300/25"
          animate={rm ? undefined : { y: [0, 6, 0], opacity: [0.25, 0.5, 0.25] }}
          transition={rm ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-[22rem] left-1/3 w-2.5 h-2.5 rounded-full bg-sky-300/20"
          animate={rm ? undefined : { y: [0, -10, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={rm ? undefined : { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <motion.div
          className="absolute top-[28rem] right-1/3 w-1.5 h-1.5 rounded-full bg-moss-300/25"
          animate={rm ? undefined : { y: [0, 8, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={rm ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute bottom-28 left-1/5 w-2 h-2 rounded-full bg-moss-300/25"
          animate={rm ? undefined : { y: [0, -6, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={rm ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10 pb-8"
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Hero */}
          <motion.div
            variants={fadeUp}
            className="mt-4 rounded-2xl bg-white/90 border border-moss-200/40 shadow-sm p-5 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-moss-100/60 flex items-center justify-center mx-auto mb-3">
              <Gift size={28} className="text-moss-600" />
            </div>
            <h2 className="font-heading text-lg font-bold text-primary-800">
              Grow the Movement
            </h2>
            <p className="mt-1 text-sm text-primary-400 max-w-xs mx-auto">
              Invite friends to join Co-Exist and help grow the conservation community!
            </p>
          </motion.div>

          {/* Referral Code */}
          <motion.div
            variants={fadeUp}
            className="mt-5"
          >
            <h3 className="font-heading text-sm font-semibold text-primary-800 mb-2">
              Your Referral Code
            </h3>
            {code ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl bg-white/90 border border-moss-200/40 px-4 py-3 text-center font-heading text-lg font-bold text-primary-800 tracking-wider select-all shadow-sm">
                  {code}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    'flex items-center justify-center min-h-11 min-w-11 rounded-xl active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none shadow-sm',
                    copied
                      ? 'bg-success-100/80 border border-success-200/40 text-success-600'
                      : 'bg-white/90 border border-moss-200/40 text-primary-500 hover:bg-moss-50/60',
                  )}
                  aria-label="Copy code"
                >
                  {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                loading={isCreating}
                onClick={handleCreateCode}
              >
                Generate Your Code
              </Button>
            )}
          </motion.div>

          {/* Share button */}
          {code && (
            <motion.div variants={fadeUp} className="mt-4">
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={<Share2 size={16} />}
                onClick={handleShare}
              >
                Share Invite Link
              </Button>
            </motion.div>
          )}

          {/* Stats */}
          {stats && (
            <motion.div
              variants={fadeUp}
              className="mt-6 grid grid-cols-3 gap-3"
            >
              <StatCard
                value={stats.total}
                label="Invites Sent"
                icon={<Share2 size={18} />}
              />
              <StatCard
                value={stats.accepted}
                label="Joined"
                icon={<Users size={18} />}
              />
              <StatCard
                value={stats.pending}
                label="Pending"
                icon={<Clock size={18} />}
              />
            </motion.div>
          )}

        </motion.div>
      </div>
    </Page>
  )
}

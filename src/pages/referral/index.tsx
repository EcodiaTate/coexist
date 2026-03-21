import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Share2,
  Copy,
  Users,
  Gift,
  CheckCircle,
  UserPlus,
  Trophy,
  Clock,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useReferralCode, useReferralStats } from '@/hooks/use-referral'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

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

export default function ReferralPage() {
  const shouldReduceMotion = useReducedMotion()
  const { toast } = useToast()
  const { data: code, isLoading: codeLoading } = useReferralCode()
  const { data: stats } = useReferralStats()

  const [copied, setCopied] = useState(false)

  const referralLink = code
    ? `${window.location.origin}/signup?ref=${code}`
    : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'Join Co-Exist',
      text: 'Join me on Co-Exist - the conservation movement for young Australians!',
      url: referralLink,
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await handleCopy()
    }
  }

  if (codeLoading) {
    return (
      <Page header={<Header title="Invite Friends" back />}>
        <ReferralSkeleton />
      </Page>
    )
  }

  return (
    <Page header={<Header title="Invite Friends" back />}>
      <motion.div
        className="pb-8"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Hero */}
        <motion.div
          variants={fadeUp}
          className="mt-4 rounded-2xl bg-gradient-to-br from-white to-white shadow-sm p-5 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <Gift size={28} className="text-primary-500" />
          </div>
          <h2 className="font-heading text-lg font-bold text-primary-800">
            Grow the Movement
          </h2>
          <p className="mt-1 text-sm text-primary-400 max-w-xs mx-auto">
            Invite friends to join Co-Exist. Earn 200 points when they attend their first event!
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
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-white px-4 py-3 text-center font-heading text-lg font-bold text-primary-800 tracking-wider select-all">
              {code}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'flex items-center justify-center min-h-11 min-w-11 rounded-xl active:scale-[0.97] transition-all duration-150 cursor-pointer select-none',
                copied
                  ? 'bg-success-50 shadow-sm text-success-600'
                  : 'bg-white shadow-sm text-primary-400 hover:bg-primary-50',
              )}
              aria-label="Copy code"
            >
              {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </motion.div>

        {/* Share button */}
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

        {/* Reward chain */}
        <motion.section
          variants={fadeUp}
          className="mt-6"
        >
          <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">
            Referral Rewards
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Friend joins Co-Exist', points: 50, icon: <UserPlus size={16} /> },
              { label: 'Friend attends first event', points: 200, icon: <CheckCircle size={16} /> },
              { label: 'Friend attends 5th event', points: 100, icon: <Trophy size={16} /> },
            ].map(({ label, points, icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-white shadow-sm px-4 py-3"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-primary-400">
                  {icon}
                </span>
                <span className="flex-1 text-sm text-primary-800">{label}</span>
                <span className="text-sm font-bold text-primary-400">+{points} pts</span>
              </div>
            ))}
          </div>
        </motion.section>

      </motion.div>
    </Page>
  )
}

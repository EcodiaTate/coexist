import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Copy,
  Check,
  Share2,
  Users,
  Link as LinkIcon,
  QrCode,
} from 'lucide-react'
import { useLeaderHeader, useLeaderContext } from '@/components/leader-layout'
import { useToast } from '@/components/toast'
import { useCollective } from '@/hooks/use-collective'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderInvitePage() {
  const shouldReduceMotion = useReducedMotion()
  const { collectiveId, collectiveSlug } = useLeaderContext()
  const { data: collective } = useCollective(collectiveId)
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  useLeaderHeader('Invite')

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/collective/${collectiveSlug ?? collectiveId}`
    : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${collective?.name ?? 'our collective'} on Co-Exist`,
          text: `Join our conservation collective and make a difference!`,
          url: inviteUrl,
        })
      } catch {
        // User cancelled
      }
    } else {
      handleCopy()
    }
  }

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : stagger}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center max-w-md mx-auto space-y-6"
    >
      {/* Hero card */}
      <motion.div
        variants={fadeUp}
        className="w-full rounded-2xl bg-gradient-to-br from-moss-500 to-moss-700 p-6 text-white text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
          <Users size={28} />
        </div>
        <p className="font-heading text-xl font-bold mb-1">Grow Your Collective</p>
        <p className="text-sm text-white/70">Share the link below to invite new members</p>

        {/* Invite link */}
        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3 mt-5">
          <LinkIcon size={14} className="text-white/50 shrink-0" />
          <p className="text-sm text-white/90 truncate flex-1 font-mono text-left">{inviteUrl}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer transition-colors shrink-0"
            aria-label="Copy invite link"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div variants={fadeUp} className="w-full grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex flex-col items-center gap-2 p-5 rounded-2xl',
            'bg-white shadow-sm',
            'hover:shadow-md hover:bg-moss-50/30',
            'active:scale-[0.98] transition-all duration-150',
            'cursor-pointer select-none',
          )}
        >
          <div className="w-11 h-11 rounded-xl bg-moss-100 flex items-center justify-center">
            <Copy size={20} className="text-moss-600" />
          </div>
          <span className="text-xs font-semibold text-primary-700">Copy Link</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className={cn(
            'flex flex-col items-center gap-2 p-5 rounded-2xl',
            'bg-white shadow-sm',
            'hover:shadow-md hover:bg-moss-50/30',
            'active:scale-[0.98] transition-all duration-150',
            'cursor-pointer select-none',
          )}
        >
          <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center">
            <Share2 size={20} className="text-sky-600" />
          </div>
          <span className="text-xs font-semibold text-primary-700">Share</span>
        </button>
      </motion.div>

      {/* QR code placeholder */}
      <motion.div
        variants={fadeUp}
        className="w-full rounded-2xl bg-white shadow-sm p-6 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
          <QrCode size={28} className="text-primary-400" />
        </div>
        <p className="text-sm font-semibold text-primary-700">QR Code</p>
        <p className="text-xs text-primary-400 mt-1">
          Print or display at events for instant sign-ups
        </p>
      </motion.div>
    </motion.div>
  )
}

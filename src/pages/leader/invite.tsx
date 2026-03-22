import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Copy,
  Check,
  Share2,
  Users,
  Link as LinkIcon,
  QrCode,
  ExternalLink,
  Sparkles,
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react'
import { useLeaderHeader, useLeaderContext } from '@/components/leader-layout'
import { useToast } from '@/components/toast'
import { useCollective } from '@/hooks/use-collective'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/constants'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Stat pill                                                          */
/* ------------------------------------------------------------------ */

function StatPill({ icon: Icon, value, label }: { icon: typeof Users; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5">
      <Icon size={13} className="text-white/60" />
      <span className="text-xs font-semibold text-white">{value}</span>
      <span className="text-[10px] text-white/50">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderInvitePage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { collectiveId, collectiveSlug } = useLeaderContext()
  const { data: collective } = useCollective(collectiveId)
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  useLeaderHeader('Invite', { fullBleed: true })

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/collective/${collectiveSlug ?? collectiveId}`
    : ''

  const collectiveName = collective?.name ?? 'Your Collective'

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
          title: `Join ${collectiveName} on ${APP_NAME}`,
          text: `Join our conservation collective and make a difference! 🌿`,
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
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Rich gradient background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-moss-800 via-moss-700 to-primary-900" />

      {/* Decorative ambient shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl"
          animate={rm ? undefined : { scale: [1, 1.15, 1], opacity: [0.04, 0.07, 0.04] }}
          transition={rm ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 -left-24 w-64 h-64 rounded-full bg-moss-400/[0.06] blur-3xl"
          animate={rm ? undefined : { scale: [1, 1.1, 1], opacity: [0.06, 0.1, 0.06] }}
          transition={rm ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-sky-400/[0.05] blur-3xl"
          animate={rm ? undefined : { scale: [1, 1.2, 1] }}
          transition={rm ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Floating particles */}
        <motion.div
          className="absolute top-28 left-1/4 w-1.5 h-1.5 rounded-full bg-white/20"
          animate={rm ? undefined : { y: [0, -12, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={rm ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-48 right-1/3 w-2 h-2 rounded-full bg-moss-300/15"
          animate={rm ? undefined : { y: [0, 10, 0], opacity: [0.1, 0.3, 0.1] }}
          transition={rm ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
        <motion.div
          className="absolute top-72 left-[15%] w-1 h-1 rounded-full bg-white/25"
          animate={rm ? undefined : { y: [0, -8, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={rm ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
      </div>

      {/* ── Content ── */}
      <motion.div
        className="relative z-10 px-5 pt-6 pb-24 flex flex-col items-center max-w-md mx-auto"
        variants={rm ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Hero header */}
        <motion.div variants={fadeUp} className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 mb-3">
            <Sparkles size={12} className="text-moss-300" />
            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Grow your movement</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Invite Members</h1>
          <p className="text-sm text-white/50 mt-1.5 max-w-xs mx-auto">
            Share your collective's link to bring in new volunteers
          </p>
        </motion.div>

        {/* ── Collective preview card - shows what the shared page looks like ── */}
        <motion.div
          variants={fadeUp}
          className="w-full rounded-2xl overflow-hidden bg-white shadow-2xl shadow-black/20"
        >
          {/* Mini hero */}
          <div className="relative h-28 bg-gradient-to-br from-primary-600 via-moss-600 to-moss-800 overflow-hidden">
            {collective?.cover_image_url ? (
              <img
                src={collective.cover_image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {/* Browser chrome mockup */}
            <div className="absolute top-0 inset-x-0 h-6 bg-black/20 backdrop-blur-sm flex items-center px-2.5 gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex-1 mx-2 h-3 rounded-full bg-white/10 flex items-center px-2">
                <span className="text-[7px] text-white/40 truncate font-mono">{inviteUrl}</span>
              </div>
            </div>
            <div className="absolute bottom-2.5 left-3 right-3">
              <p className="font-heading text-base font-bold text-white drop-shadow-md truncate">{collectiveName}</p>
              {collective?.region && (
                <p className="flex items-center gap-1 text-[10px] text-white/80 mt-0.5">
                  <MapPin size={9} />
                  {collective.region}{collective?.state ? `, ${collective.state}` : ''}
                </p>
              )}
            </div>
          </div>
          {/* Card body */}
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 text-primary-400">
                <Users size={13} />
                <span className="text-xs font-medium">{collective?.member_count ?? 0} members</span>
              </div>
              <div className="flex items-center gap-1.5 text-primary-400">
                <Calendar size={13} />
                <span className="text-xs font-medium">Upcoming events</span>
              </div>
            </div>
            {collective?.description && (
              <p className="text-xs text-primary-400 leading-relaxed line-clamp-2">{collective.description}</p>
            )}
            {/* Mock CTA buttons */}
            <div className="flex gap-2 mt-3.5">
              <div className="flex-1 h-9 rounded-xl bg-primary-800 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-white">Open in App</span>
              </div>
              <div className="flex-1 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-primary-700">Download</span>
              </div>
            </div>
          </div>
          {/* Preview label */}
          <div className="bg-primary-50/60 px-4 py-2 flex items-center justify-center gap-1.5 border-t border-primary-100/50">
            <Eye size={12} className="text-primary-400" />
            <span className="text-[10px] font-medium text-primary-400">Preview - this is what visitors will see</span>
          </div>
        </motion.div>

        {/* ── Invite link bar ── */}
        <motion.div
          variants={fadeUp}
          className="w-full mt-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-4"
        >
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2.5">Your invite link</p>
          <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2.5 border border-white/5">
            <LinkIcon size={13} className="text-white/40 shrink-0" />
            <p className="text-sm text-white/80 truncate flex-1 font-mono">{inviteUrl}</p>
          </div>
        </motion.div>

        {/* ── Action buttons ── */}
        <motion.div variants={fadeUp} className="w-full grid grid-cols-3 gap-2.5 mt-4">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'flex flex-col items-center gap-2.5 p-4 rounded-2xl',
              'bg-white/10 backdrop-blur-sm border border-white/10',
              'hover:bg-white/15 hover:border-white/15',
              'active:scale-[0.97] transition-all duration-150',
              'cursor-pointer select-none group',
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-150',
              copied ? 'bg-moss-500' : 'bg-white/10 group-hover:bg-white/15',
            )}>
              {copied ? <Check size={22} className="text-white" /> : <Copy size={22} className="text-white/80" />}
            </div>
            <span className="text-xs font-semibold text-white/80">{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className={cn(
              'flex flex-col items-center gap-2.5 p-4 rounded-2xl',
              'bg-gradient-to-br from-moss-500 to-moss-600 border border-moss-400/20',
              'hover:from-moss-400 hover:to-moss-500',
              'active:scale-[0.97] transition-all duration-150',
              'cursor-pointer select-none shadow-lg shadow-moss-900/20',
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Share2 size={22} className="text-white" />
            </div>
            <span className="text-xs font-bold text-white">Share</span>
          </button>

          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex flex-col items-center gap-2.5 p-4 rounded-2xl',
              'bg-white/10 backdrop-blur-sm border border-white/10',
              'hover:bg-white/15 hover:border-white/15',
              'active:scale-[0.97] transition-all duration-150',
              'cursor-pointer select-none group',
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center transition-colors duration-150">
              <ExternalLink size={22} className="text-white/80" />
            </div>
            <span className="text-xs font-semibold text-white/80">Visit</span>
          </a>
        </motion.div>

        {/* ── QR Code card ── */}
        <motion.div
          variants={fadeUp}
          className="w-full mt-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <QrCode size={28} className="text-white/50" />
          </div>
          <p className="text-sm font-semibold text-white/80">QR Code</p>
          <p className="text-xs text-white/40 mt-1 max-w-[200px] mx-auto">
            Print or display at events for instant sign-ups
          </p>
        </motion.div>

        {/* ── Tips section ── */}
        <motion.div variants={fadeUp} className="w-full mt-5">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3 px-1">Sharing tips</p>
          <div className="space-y-2">
            {[
              { text: "Post the link in your collective's social media bio", icon: '🔗' },
              { text: 'Share after events when energy is high', icon: '⚡' },
              { text: 'Print the QR code for flyers and event signage', icon: '📋' },
            ].map((tip) => (
              <div
                key={tip.text}
                className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/5 px-3.5 py-2.5"
              >
                <span className="text-sm mt-0.5 shrink-0">{tip.icon}</span>
                <p className="text-xs text-white/50 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats at bottom */}
        {collective && (
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <StatPill icon={Users} value={collective.member_count ?? 0} label="members" />
            {collective.region && (
              <StatPill icon={MapPin} value={collective.region} label="" />
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

import { motion, useReducedMotion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Wallet } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { cn } from '@/lib/cn'
import { APP_NAME, TAGLINE } from '@/lib/constants'
import type { TierName } from '@/hooks/use-points'

interface MembershipCardProps {
  name: string
  memberId: string
  userId: string
  tier: TierName
  memberSince: string
  avatarUrl?: string | null
  className?: string
}

const tierGradients: Record<TierName, string> = {
  seedling: 'from-green-500 to-green-700',
  sapling: 'from-emerald-500 to-emerald-700',
  native: 'from-teal-500 to-teal-700',
  canopy: 'from-primary-500 to-primary-700',
  elder: 'from-amber-500 to-amber-700',
}

const tierLabels: Record<TierName, string> = {
  seedling: 'Seedling',
  sapling: 'Sapling',
  native: 'Native',
  canopy: 'Canopy',
  elder: 'Elder',
}

export default function MembershipCard({
  name,
  memberId,
  userId,
  tier,
  memberSince,
  avatarUrl,
  className,
}: MembershipCardProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-lg',
        'bg-gradient-to-br',
        tierGradients[tier],
        'p-5 text-white',
        className,
      )}
      aria-label={`${name}'s membership card`}
    >
      {/* Nature texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            {APP_NAME}
          </p>
          <p className="text-[10px] opacity-60 mt-0.5">{TAGLINE}</p>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
          {tierLabels[tier]}
        </span>
      </div>

      {/* Avatar + Name */}
      <div className="relative mt-5 flex items-center gap-3">
        <Avatar
          src={avatarUrl}
          name={name}
          size="lg"
          tier={tier}
        />
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold truncate">{name}</p>
          <p className="text-xs opacity-70">Member since {memberSince}</p>
        </div>
      </div>

      {/* Member ID + QR */}
      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider opacity-60">Member ID</p>
          <p className="font-heading text-sm font-bold tracking-widest">{memberId}</p>
        </div>
        <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-white p-1.5">
          <QRCodeSVG
            value={`coexist://member/${userId}`}
            size={44}
            level="M"
            bgColor="transparent"
            fgColor="#1a1a1a"
          />
        </div>
      </div>

      {/* Add to Wallet hint */}
      <button
        className="relative mt-3 flex items-center justify-center gap-1.5 w-full rounded-lg bg-white/15 backdrop-blur-sm py-2 text-xs font-semibold hover:bg-white/25 transition-colors"
        aria-label="Add to wallet"
      >
        <Wallet size={14} />
        Add to Wallet
      </button>
    </motion.div>
  )
}

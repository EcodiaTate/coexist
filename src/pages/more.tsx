import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  User,
  Settings,
  TrendingUp,
  Star,
  Trophy,
  ShoppingBag,
  Heart,
  MessageCircle,
  Bell,
  Megaphone,
  Share2,
  Users,
  MapPin,
  BarChart3,
  Plus,
  Shield,
  Gift,
  ChevronRight,
  Leaf,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { usePointsBalance, getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'

const tierLabels: Record<TierName, string> = {
  seedling: 'Seedling',
  sapling: 'Sapling',
  native: 'Native',
  canopy: 'Canopy',
  elder: 'Elder',
}

interface MenuLink {
  label: string
  to: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  description?: string
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
}

function MenuSection({
  title,
  items,
  navigate,
  shouldReduceMotion,
}: {
  title: string
  items: MenuLink[]
  navigate: (to: string) => void
  shouldReduceMotion: boolean | null
}) {
  return (
    <motion.section
      variants={shouldReduceMotion ? undefined : fadeUp}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary-400/70 mb-1.5 px-1">
        {title}
      </h3>
      <div className="rounded-2xl bg-surface-0 shadow-sm overflow-hidden">
        {items.map(({ label, to, icon, iconBg, iconColor, description }, idx) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className={cn(
              'w-full flex items-center gap-3.5 px-4 py-3',
              'text-left transition-all duration-150',
              'active:bg-surface-3',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
              'cursor-pointer select-none',
              idx > 0 && 'border-t border-primary-100/40',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                iconBg,
                iconColor,
              )}
            >
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-primary-900 leading-tight">{label}</p>
            </div>
            <ChevronRight size={16} className="text-primary-300/60 shrink-0" />
          </button>
        ))}
      </div>
    </motion.section>
  )
}

export default function MorePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { profile, collectiveRoles, isStaff } = useAuth()
  const { data: pointsData } = usePointsBalance()

  const points = pointsData?.points ?? profile?.points ?? 0
  const tier = getTierFromPoints(points) as TierName

  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  const mainLinks: MenuLink[] = [
    { label: 'Notifications', to: '/notifications', icon: <Bell size={17} />, iconBg: 'bg-error-50', iconColor: 'text-error-500' },
    { label: 'Settings', to: '/settings', icon: <Settings size={17} />, iconBg: 'bg-primary-100/80', iconColor: 'text-primary-600' },
  ]

  const activityLinks: MenuLink[] = [
    { label: 'Impact Dashboard', to: '/impact', icon: <TrendingUp size={17} />, iconBg: 'bg-primary-50', iconColor: 'text-primary-600' },
    { label: 'Points History', to: '/points', icon: <Star size={17} />, iconBg: 'bg-warning-50', iconColor: 'text-warning-600' },
    { label: 'Leaderboard', to: '/leaderboard', icon: <Trophy size={17} />, iconBg: 'bg-bark-50', iconColor: 'text-bark-600' },
    { label: 'National Impact', to: '/impact/national', icon: <MapPin size={17} />, iconBg: 'bg-moss-50', iconColor: 'text-moss-600' },
  ]

  const communityLinks: MenuLink[] = [
    { label: 'Chat', to: '/chat', icon: <MessageCircle size={17} />, iconBg: 'bg-sky-50', iconColor: 'text-sky-600' },
    { label: 'Collectives', to: '/collectives', icon: <Users size={17} />, iconBg: 'bg-primary-100/80', iconColor: 'text-primary-600' },
    { label: 'Announcements', to: '/announcements', icon: <Megaphone size={17} />, iconBg: 'bg-plum-50', iconColor: 'text-plum-600' },
    { label: 'Invite Friends', to: '/referral', icon: <Share2 size={17} />, iconBg: 'bg-coral-50', iconColor: 'text-coral-500' },
  ]

  const shopLinks: MenuLink[] = [
    { label: 'Shop', to: '/shop', icon: <ShoppingBag size={17} />, iconBg: 'bg-primary-100/80', iconColor: 'text-primary-700' },
    { label: 'Donate', to: '/donate', icon: <Heart size={17} />, iconBg: 'bg-coral-50', iconColor: 'text-coral-500' },
    { label: 'Partner Offers', to: '/shop', icon: <Gift size={17} />, iconBg: 'bg-warning-50', iconColor: 'text-warning-600' },
  ]

  const leaderLinks: MenuLink[] = [
    { label: 'Leader Dashboard', to: '/leader', icon: <BarChart3 size={17} />, iconBg: 'bg-primary-200/60', iconColor: 'text-primary-800' },
    { label: 'Create Event', to: '/events/create', icon: <Plus size={17} />, iconBg: 'bg-primary-200/60', iconColor: 'text-primary-800' },
    { label: 'Reports', to: '/reports', icon: <TrendingUp size={17} />, iconBg: 'bg-primary-200/60', iconColor: 'text-primary-800' },
  ]

  const adminLinks: MenuLink[] = [
    { label: 'Admin Dashboard', to: '/admin', icon: <Shield size={17} />, iconBg: 'bg-error-100/60', iconColor: 'text-error-700' },
  ]

  return (
    <Page
      header={
        <header
          className="sticky top-0 z-40 px-5 pt-2 pb-3"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.5rem)' }}
          aria-label="More page header"
        >
          <h1 className="font-heading text-2xl font-bold text-primary-900">
            More
          </h1>
        </header>
      }
      className="bg-surface-1"
    >
      <motion.div
        className="space-y-6 pb-10"
        initial="hidden"
        animate="visible"
        variants={shouldReduceMotion ? undefined : stagger}
      >
        {/* Profile card */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
        >
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className={cn(
              'w-full flex items-center gap-4 p-4',
              'rounded-2xl',
              'bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-700',
              'shadow-lg',
              'active:scale-[0.98] transition-transform duration-150',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
            )}
          >
            <div className="relative">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name ?? ''}
                size="lg"
                tier={tier}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-heading text-lg font-bold text-white truncate">
                {profile?.display_name}
              </p>
              <div className="flex items-center gap-2.5 mt-1">
                <Badge variant="tier" tier={tier} size="sm">
                  {tierLabels[tier]}
                </Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-primary-200">
                  <Star size={12} fill="currentColor" />
                  {points.toLocaleString()} pts
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="text-primary-300/80 shrink-0" />
          </button>
        </motion.div>

        <MenuSection title="Account" items={mainLinks} navigate={navigate} shouldReduceMotion={shouldReduceMotion} />
        <MenuSection title="Your Activity" items={activityLinks} navigate={navigate} shouldReduceMotion={shouldReduceMotion} />
        <MenuSection title="Community" items={communityLinks} navigate={navigate} shouldReduceMotion={shouldReduceMotion} />
        <MenuSection title="Shop & Support" items={shopLinks} navigate={navigate} shouldReduceMotion={shouldReduceMotion} />

        {isAnyLeader && (
          <MenuSection title="Leader Tools" items={leaderLinks} navigate={navigate} shouldReduceMotion={shouldReduceMotion} />
        )}

        {isStaff && (
          <MenuSection title="Admin" items={adminLinks} navigate={navigate} shouldReduceMotion={shouldReduceMotion} />
        )}

        {/* Footer tagline */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="flex flex-col items-center gap-2 pt-4 pb-2"
        >
          <Leaf size={18} className="text-primary-300/50" />
          <p className="text-[11px] font-medium text-primary-400/50 tracking-wide">
            Explore. Connect. Protect.
          </p>
        </motion.div>
      </motion.div>
    </Page>
  )
}

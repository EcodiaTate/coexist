import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
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
  Shield,
  Gift,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { usePointsBalance, getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'

const tierLabels: Record<TierName, string> = {
  seedling: 'Seedling',
  sapling: 'Sapling',
  native: 'Native',
  canopy: 'Canopy',
  elder: 'Elder',
}

interface MenuItem {
  label: string
  to: string
  icon: ReactNode
}

interface MenuSheetProps {
  open: boolean
  onClose: () => void
}

const instantTransition = { duration: 0 }

/* ------------------------------------------------------------------ */
/*  Stagger animation variants                                         */
/* ------------------------------------------------------------------ */

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025, delayChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
}

/* ------------------------------------------------------------------ */
/*  Menu row                                                           */
/* ------------------------------------------------------------------ */

function MenuRow({
  item,
  onNavigate,
}: {
  item: MenuItem
  onNavigate: (to: string) => void
}) {
  return (
    <motion.button
      type="button"
      variants={itemVariants}
      onClick={() => onNavigate(item.to)}
      className={cn(
        'w-full flex items-center gap-3.5 px-2 py-2.5',
        'text-left rounded-xl',
        'active:bg-primary-50/80',
        'hover:bg-primary-50/50',
        'transition-all duration-150',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:rounded-xl',
        'group',
      )}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50/60 shrink-0 text-primary-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all duration-150">
        {item.icon}
      </span>
      <span className="flex-1 text-[14px] font-medium text-primary-700 leading-snug group-hover:text-primary-800 transition-colors">
        {item.label}
      </span>
      <ChevronRight
        size={14}
        strokeWidth={1.5}
        className="text-primary-200 group-hover:text-primary-300 transition-colors shrink-0"
      />
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

function MenuSection({
  title,
  items,
  onNavigate,
}: {
  title: string
  items: MenuItem[]
  onNavigate: (to: string) => void
}) {
  return (
    <div>
      <motion.p
        variants={itemVariants}
        className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-300 mb-1 px-2"
      >
        {title}
      </motion.p>
      {items.map((item) => (
        <MenuRow key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function MenuSheet({ open, onClose }: MenuSheetProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const { profile, collectiveRoles, isStaff } = useAuth()
  const { data: pointsData } = usePointsBalance()

  const points = pointsData?.points ?? profile?.points ?? 0
  const tier = getTierFromPoints(points) as TierName

  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  const handleNavigate = useCallback(
    (to: string) => {
      onClose()
      requestAnimationFrame(() => navigate(to))
    },
    [navigate, onClose],
  )

  // Close on route change
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Lock body scroll + focus management
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => sheetRef.current?.focus())
    } else {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !sheetRef.current) return
    const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Link data                                                        */
  /* ---------------------------------------------------------------- */

  const accountItems: MenuItem[] = [
    { label: 'Notifications', to: '/notifications', icon: <Bell size={17} strokeWidth={1.5} /> },
    { label: 'Chat', to: '/chat', icon: <MessageCircle size={17} strokeWidth={1.5} /> },
    { label: 'Settings', to: '/settings', icon: <Settings size={17} strokeWidth={1.5} /> },
  ]

  const activityItems: MenuItem[] = [
    { label: 'Impact Dashboard', to: '/impact', icon: <TrendingUp size={17} strokeWidth={1.5} /> },
    { label: 'Points History', to: '/points', icon: <Star size={17} strokeWidth={1.5} /> },
    { label: 'Leaderboard', to: '/leaderboard', icon: <Trophy size={17} strokeWidth={1.5} /> },
    { label: 'National Impact', to: '/impact/national', icon: <MapPin size={17} strokeWidth={1.5} /> },
  ]

  const communityItems: MenuItem[] = [
    { label: 'Collectives', to: '/collectives', icon: <Users size={17} strokeWidth={1.5} /> },
    { label: 'Announcements', to: '/announcements', icon: <Megaphone size={17} strokeWidth={1.5} /> },
    { label: 'Invite Friends', to: '/referral', icon: <Share2 size={17} strokeWidth={1.5} /> },
  ]

  const supportItems: MenuItem[] = [
    { label: 'Shop', to: '/shop', icon: <ShoppingBag size={17} strokeWidth={1.5} /> },
    { label: 'Donate', to: '/donate', icon: <Heart size={17} strokeWidth={1.5} /> },
    { label: 'Partner Offers', to: '/shop', icon: <Gift size={17} strokeWidth={1.5} /> },
  ]

  const leaderItems: MenuItem[] = [
    { label: 'Leader Dashboard', to: '/leader', icon: <BarChart3 size={17} strokeWidth={1.5} /> },
  ]

  const adminItems: MenuItem[] = [
    { label: 'Admin Dashboard', to: '/admin', icon: <Shield size={17} strokeWidth={1.5} /> },
  ]

  /* ---------------------------------------------------------------- */
  /*  Animation config                                                 */
  /* ---------------------------------------------------------------- */

  const slideTransition = shouldReduceMotion
    ? instantTransition
    : { type: 'spring' as const, stiffness: 380, damping: 34, mass: 0.7 }

  const backdropTransition = shouldReduceMotion
    ? instantTransition
    : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: backdropTransition }}
            exit={{ opacity: 0, transition: shouldReduceMotion ? instantTransition : { duration: 0.15 } }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className={cn(
              'fixed top-0 right-0 bottom-0',
              'w-[min(84vw,360px)]',
              'bg-white',
              'shadow-[-12px_0_40px_-8px_rgba(51,63,43,0.15)]',
              'flex flex-col',
              'outline-none',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: slideTransition }}
            exit={{
              x: '100%',
              transition: shouldReduceMotion
                ? instantTransition
                : { type: 'spring', stiffness: 380, damping: 34 },
            }}
            onKeyDown={handleKeyDown}
          >
            {/* ---- Top: wordmark + close + profile ---- */}
            <div
              className="px-5 pb-5"
              style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)' }}
            >
              {/* Wordmark + close */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex-1" />
                <img
                  src="/logos/black-wordmark.png"
                  alt="Co-Exist"
                  className="h-5 w-auto"
                />
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-xl',
                      'bg-primary-50/60 text-primary-400 hover:text-primary-700 hover:bg-primary-100/60',
                      'transition-all duration-150',
                      'cursor-pointer select-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    )}
                    aria-label="Close menu"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Profile card */}
              <button
                type="button"
                onClick={() => handleNavigate('/profile')}
                className={cn(
                  'w-full flex items-center gap-3.5 p-3 group',
                  'bg-gradient-to-br from-primary-50/80 to-primary-50/30',
                  'rounded-2xl border border-primary-100/40',
                  'cursor-pointer select-none text-left',
                  'hover:from-primary-50 hover:to-primary-50/50',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                )}
              >
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? ''}
                  size="lg"
                  tier={tier}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-[17px] font-bold text-primary-900 truncate leading-tight">
                    {profile?.display_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="tier" tier={tier} size="sm">
                      {tierLabels[tier]}
                    </Badge>
                    <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary-400">
                      <Star size={10} fill="currentColor" className="text-primary-300" />
                      {points.toLocaleString()}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className="text-primary-200 group-hover:text-primary-400 transition-colors shrink-0"
                />
              </button>
            </div>

            {/* ---- Scrollable links ---- */}
            <motion.div
              className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-8 space-y-5"
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)',
              }}
              variants={shouldReduceMotion ? undefined : listVariants}
              initial="hidden"
              animate="visible"
            >
              <MenuSection title="Account" items={accountItems} onNavigate={handleNavigate} />
              <MenuSection title="Activity" items={activityItems} onNavigate={handleNavigate} />
              <MenuSection title="Community" items={communityItems} onNavigate={handleNavigate} />
              <MenuSection title="Support" items={supportItems} onNavigate={handleNavigate} />

              {(isAnyLeader || isStaff) && (
                <MenuSection title="Management" items={[
                  ...(isAnyLeader ? leaderItems : []),
                  ...(isStaff ? adminItems : []),
                ]} onNavigate={handleNavigate} />
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

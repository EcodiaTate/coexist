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
  Plus,
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
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
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
        'w-full flex items-center gap-3.5 px-1 py-2.5',
        'text-left rounded-xl',
        'active:bg-primary-50/80',
        'transition-colors duration-100',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:rounded-xl',
      )}
    >
      <span className="flex items-center justify-center w-5 shrink-0 text-primary-400">
        {item.icon}
      </span>
      <span className="flex-1 text-[15px] text-primary-700 leading-snug">
        {item.label}
      </span>
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
        className="text-[11px] font-semibold uppercase tracking-widest text-primary-300 mb-1 px-1"
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
    { label: 'Notifications', to: '/notifications', icon: <Bell size={18} strokeWidth={1.5} /> },
    { label: 'Chat', to: '/chat', icon: <MessageCircle size={18} strokeWidth={1.5} /> },
    { label: 'Settings', to: '/settings', icon: <Settings size={18} strokeWidth={1.5} /> },
  ]

  const activityItems: MenuItem[] = [
    { label: 'Impact Dashboard', to: '/impact', icon: <TrendingUp size={18} strokeWidth={1.5} /> },
    { label: 'Points History', to: '/points', icon: <Star size={18} strokeWidth={1.5} /> },
    { label: 'Leaderboard', to: '/leaderboard', icon: <Trophy size={18} strokeWidth={1.5} /> },
    { label: 'National Impact', to: '/impact/national', icon: <MapPin size={18} strokeWidth={1.5} /> },
  ]

  const communityItems: MenuItem[] = [
    { label: 'Collectives', to: '/collectives', icon: <Users size={18} strokeWidth={1.5} /> },
    { label: 'Announcements', to: '/announcements', icon: <Megaphone size={18} strokeWidth={1.5} /> },
    { label: 'Invite Friends', to: '/referral', icon: <Share2 size={18} strokeWidth={1.5} /> },
  ]

  const supportItems: MenuItem[] = [
    { label: 'Shop', to: '/shop', icon: <ShoppingBag size={18} strokeWidth={1.5} /> },
    { label: 'Donate', to: '/donate', icon: <Heart size={18} strokeWidth={1.5} /> },
    { label: 'Partner Offers', to: '/shop', icon: <Gift size={18} strokeWidth={1.5} /> },
  ]

  const leaderItems: MenuItem[] = [
    { label: 'Leader Dashboard', to: '/leader', icon: <BarChart3 size={18} strokeWidth={1.5} /> },
    { label: 'Create Event', to: '/events/create', icon: <Plus size={18} strokeWidth={1.5} /> },
  ]

  const adminItems: MenuItem[] = [
    { label: 'Admin', to: '/admin', icon: <Shield size={18} strokeWidth={1.5} /> },
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
            className="fixed inset-0 bg-black/30"
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
              'w-[min(82vw,340px)]',
              'bg-white',
              'shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.12)]',
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
            {/* ---- Top: close + profile ---- */}
            <div
              className="px-5 pb-4"
              style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)' }}
            >
              {/* Close */}
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full',
                    'text-primary-400 hover:text-primary-700 hover:bg-primary-50',
                    'transition-colors duration-100',
                    'cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                  )}
                  aria-label="Close menu"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Profile row */}
              <button
                type="button"
                onClick={() => handleNavigate('/profile')}
                className={cn(
                  'w-full flex items-center gap-3 group',
                  'cursor-pointer select-none text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:rounded-xl',
                )}
              >
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? ''}
                  size="lg"
                  tier={tier}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-lg font-bold text-primary-900 truncate leading-tight">
                    {profile?.display_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
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

            {/* Divider */}
            <div className="h-px bg-primary-100/70 mx-5" />

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

              {isAnyLeader && (
                <MenuSection title="Leader" items={leaderItems} onNavigate={handleNavigate} />
              )}

              {isStaff && (
                <MenuSection title="Admin" items={adminItems} onNavigate={handleNavigate} />
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

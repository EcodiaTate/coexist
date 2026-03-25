import { useState, useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/constants'

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

export interface SidebarNavItem {
  label: string
  path: string
  icon: ReactNode
  /** Only show this item on md+ screens (desktop sidebar) */
  desktopOnly?: boolean
}

export interface SidebarNavCategory {
  label: string
  items: SidebarNavItem[]
}

export interface SidebarShellProps {
  /** Unique aria-label for the <aside> */
  ariaLabel: string
  /** Navigation categories to render */
  categories: SidebarNavCategory[]
  /** Accent color family for active/hover states */
  accent?: 'primary' | 'moss'
  /** Unique layoutId prefix for the active indicator animation */
  layoutId: string
  /** Content rendered between the wordmark and the nav list (badges, "back to app", etc.) */
  header?: (collapsed: boolean) => ReactNode
  /** Content rendered in the footer area above the collapse button (profile link, etc.) */
  footer?: (collapsed: boolean) => ReactNode
  /** Additional className on the <aside> */
  className?: string
  /** Hide on mobile, show on md+ (admin/leader pattern). Default false. */
  hideOnMobile?: boolean
}

/* ------------------------------------------------------------------ */
/*  Widths - identical across all suites                               */
/* ------------------------------------------------------------------ */

const EXPANDED_WIDTH = 'w-[240px]'
const COLLAPSED_WIDTH = 'w-[60px]'

/* ------------------------------------------------------------------ */
/*  Session-level cache - only stagger on first mount per suite        */
/* ------------------------------------------------------------------ */

const mountedSuites = new Set<string>()

/** True once *any* sidebar has mounted - used to skip wordmark entry animation on suite switches */
let anySidebarMounted = false

/* ------------------------------------------------------------------ */
/*  Stagger animation (first mount only)                               */
/* ------------------------------------------------------------------ */

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.06 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const headerEnter = {
  hidden: { opacity: 0, y: -4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
}

/* ------------------------------------------------------------------ */
/*  Revisit - near-instant fade, no stagger                            */
/* ------------------------------------------------------------------ */

const quickFadeContainer = {
  hidden: {},
  visible: { transition: { duration: 0 } },
}

const quickFadeItem = {
  hidden: { opacity: 0.6 },
  visible: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
}

const quickFadeHeader = {
  hidden: { opacity: 0.6 },
  visible: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
}

/* ------------------------------------------------------------------ */
/*  Reduced motion                                                     */
/* ------------------------------------------------------------------ */

const instantVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

/* ------------------------------------------------------------------ */
/*  SidebarShell                                                       */
/* ------------------------------------------------------------------ */

export function SidebarShell({
  ariaLabel,
  categories,
  accent = 'primary',
  layoutId,
  header,
  footer,
  className,
  hideOnMobile = false,
}: SidebarShellProps) {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) => {
    if (path === '/' || path === '/admin' || path === '/leader') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  const reduced = !!shouldReduceMotion
  const isFirstMount = !mountedSuites.has(layoutId)
  if (isFirstMount) mountedSuites.add(layoutId)

  // Skip wordmark animation when switching between suites (not cold app load)
  const skipWordmarkAnim = anySidebarMounted
  useEffect(() => { anySidebarMounted = true }, [])

  /* ---- Pick animation set ---- */
  const containerV = reduced ? undefined : isFirstMount ? staggerContainer : quickFadeContainer
  const itemV = reduced ? instantVariants : isFirstMount ? staggerItem : quickFadeItem
  const headerV = reduced ? instantVariants : isFirstMount ? headerEnter : quickFadeHeader

  /* ---- Accent-driven classes ---- */
  const borderColor = accent === 'moss' ? 'border-moss-100/40' : 'border-primary-100/40'
  const dividerColor = accent === 'moss' ? 'bg-moss-100/30' : 'bg-primary-100/30'
  const activeClasses = accent === 'moss'
    ? 'bg-moss-50/70 text-moss-800 font-medium'
    : 'bg-primary-50/80 text-primary-700 font-medium'
  const hoverClasses = accent === 'moss'
    ? 'text-primary-400 hover:bg-moss-50/40 hover:text-moss-700'
    : 'text-primary-400 hover:bg-primary-50/50 hover:text-primary-700'
  const indicatorFrom = accent === 'moss' ? 'from-moss-400' : 'from-primary-500'
  const indicatorTo = accent === 'moss' ? 'to-moss-600' : 'to-primary-700'
  const dotColor = accent === 'moss' ? 'bg-moss-500' : 'bg-primary-600'
  const focusRing = accent === 'moss' ? 'focus-visible:ring-moss-400' : 'focus-visible:ring-primary-400'
  const collapseHover = accent === 'moss'
    ? 'hover:text-primary-600 hover:bg-moss-50/50'
    : 'hover:text-primary-600 hover:bg-primary-50/50'

  return (
    <aside
      className={cn(
        hideOnMobile && 'hidden md:flex',
        !hideOnMobile && 'flex',
        'flex-col',
        'sticky top-0 self-start max-h-dvh z-50',
        'bg-white',
        'border-r',
        borderColor,
        'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.08),8px_0_16px_-8px_rgba(0,0,0,0.04)]',
        'transition-[width] duration-250 ease-in-out',
        collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        className,
      )}
      aria-label={ariaLabel}
    >
      {/* ---- Wordmark (identical everywhere - no animation on suite switch) ---- */}
      <div className="flex items-center justify-center px-4 py-4">
        <Link
          to="/"
          className={cn('focus-visible:outline-none focus-visible:ring-2 rounded-md', focusRing)}
          aria-label={`${APP_NAME} home`}
        >
          {skipWordmarkAnim ? (
            <img
              src={collapsed ? '/logos/black-logo-transparent.png' : '/logos/black-wordmark.png'}
              alt={APP_NAME}
              className={cn(collapsed ? 'h-6 w-6 object-contain' : 'h-5 w-auto')}
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.img
                key={collapsed ? 'icon' : 'wordmark'}
                src={collapsed ? '/logos/black-logo-transparent.png' : '/logos/black-wordmark.png'}
                alt={APP_NAME}
                className={cn(collapsed ? 'h-6 w-6 object-contain' : 'h-5 w-auto')}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
              />
            </AnimatePresence>
          )}
        </Link>
      </div>

      {/* ---- Suite-specific header (badges, "back to app", etc.) ---- */}
      <motion.div
        variants={headerV}
        initial="hidden"
        animate="visible"
      >
        {header?.(collapsed)}
      </motion.div>

      {/* ---- Nav categories ---- */}
      <motion.nav
        className="flex-1 overflow-y-auto py-2 px-2"
        variants={containerV}
        initial="hidden"
        animate="visible"
      >
        {categories.map((cat, catIdx) => {
          if (cat.items.length === 0) return null
          const showLabel = catIdx > 0
          return (
            <div key={cat.label}>
              {showLabel && (
                <motion.div variants={itemV}>
                  {!collapsed && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-300 px-2.5 mt-4 mb-1.5">
                      {cat.label}
                    </p>
                  )}
                  {collapsed && <div className={cn('my-2.5 mx-2 h-px', dividerColor)} />}
                </motion.div>
              )}

              <ul className="space-y-0.5">
                {cat.items.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <motion.li key={item.path} variants={itemV} className={item.desktopOnly ? 'hidden md:list-item' : undefined}>
                      <Link
                        to={item.path}
                        onClick={() => window.scrollTo({ top: 0 })}
                        className={cn(
                          'relative flex items-center gap-2.5',
                          'rounded-xl text-[13px]',
                          'transition-colors duration-150',
                          'cursor-pointer select-none',
                          'focus-visible:outline-none focus-visible:ring-2',
                          focusRing,
                          collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-2.5 h-10',
                          active ? activeClasses : hoverClasses,
                        )}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Active indicator bar */}
                        {active && !collapsed && (
                          <motion.span
                            layoutId={reduced ? undefined : layoutId}
                            className={cn(
                              'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b',
                              indicatorFrom,
                              indicatorTo,
                            )}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}

                        {/* Active dot (collapsed) */}
                        {active && collapsed && (
                          <motion.span
                            layoutId={reduced ? undefined : `${layoutId}-dot`}
                            className={cn(
                              'absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full',
                              dotColor,
                            )}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}

                        <span
                          className={cn(
                            'flex items-center justify-center shrink-0 transition-transform duration-150',
                            active && 'scale-105',
                          )}
                        >
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </motion.nav>

      {/* ---- Suite-specific footer (profile, etc.) ---- */}
      <motion.div
        variants={headerV}
        initial="hidden"
        animate="visible"
      >
        {footer?.(collapsed)}
      </motion.div>

      {/* ---- Collapse toggle ---- */}
      <motion.div
        className={cn('p-2 border-t', borderColor)}
        variants={headerV}
        initial="hidden"
        animate="visible"
      >
        <button
          type="button"
          onClick={() => setCollapsed((p) => !p)}
          className={cn(
            'flex items-center justify-center gap-2 w-full',
            'h-10 rounded-xl text-[13px]',
            'text-primary-300',
            collapseHover,
            'cursor-pointer select-none',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2',
            focusRing,
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center justify-center"
          >
            <PanelLeftClose size={15} strokeWidth={1.5} />
          </motion.span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </motion.div>
    </aside>
  )
}

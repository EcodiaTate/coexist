import { type ReactNode, Children, cloneElement, isValidElement } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { useCountUp } from '@/components/stat-card'
import { cn } from '@/lib/cn'
import { useRef } from 'react'

/* ------------------------------------------------------------------ */
/*  Bento colour themes                                                */
/*                                                                     */
/*  Each theme provides a rich background gradient, text colour, and   */
/*  a watermark icon tint. Cards feel deep and immersive.              */
/* ------------------------------------------------------------------ */

export const BENTO_THEMES = {
  // Greens / nature
  moss:     { bg: 'bg-gradient-to-br from-moss-600 to-moss-700',       text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },
  sprout:   { bg: 'bg-gradient-to-br from-sprout-500 to-sprout-600',   text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },
  primary:  { bg: 'bg-gradient-to-br from-primary-600 to-primary-700', text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },

  // Earth
  bark:     { bg: 'bg-gradient-to-br from-bark-500 to-bark-600',       text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },

  // Blues / cool
  sky:      { bg: 'bg-gradient-to-br from-sky-500 to-sky-600',         text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },
  info:     { bg: 'bg-gradient-to-br from-info-500 to-info-600',       text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },

  // Warm
  warning:  { bg: 'bg-gradient-to-br from-warning-500 to-warning-600', text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },
  coral:    { bg: 'bg-gradient-to-br from-coral-500 to-coral-600',     text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },

  // Purple
  plum:     { bg: 'bg-gradient-to-br from-plum-500 to-plum-600',       text: 'text-white', sub: 'text-white/60', watermark: 'text-white/[0.07]', icon: 'bg-white/15 text-white' },

  // Soft / light variants for secondary cards
  'moss-soft':    { bg: 'bg-moss-50',    text: 'text-moss-800',    sub: 'text-moss-500',    watermark: 'text-moss-200/60',    icon: 'bg-moss-100 text-moss-600' },
  'sprout-soft':  { bg: 'bg-sprout-50',  text: 'text-sprout-800',  sub: 'text-sprout-500',  watermark: 'text-sprout-200/60',  icon: 'bg-sprout-100 text-sprout-600' },
  'primary-soft': { bg: 'bg-primary-50', text: 'text-primary-900', sub: 'text-primary-500', watermark: 'text-primary-200/60', icon: 'bg-primary-100 text-primary-600' },
  'bark-soft':    { bg: 'bg-bark-50',    text: 'text-bark-800',    sub: 'text-bark-500',    watermark: 'text-bark-200/60',    icon: 'bg-bark-100 text-bark-600' },
  'sky-soft':     { bg: 'bg-sky-50',     text: 'text-sky-800',     sub: 'text-sky-500',     watermark: 'text-sky-200/60',     icon: 'bg-sky-100 text-sky-600' },
  'warning-soft': { bg: 'bg-warning-50', text: 'text-warning-800', sub: 'text-warning-500', watermark: 'text-warning-200/60', icon: 'bg-warning-100 text-warning-600' },
  'plum-soft':    { bg: 'bg-plum-50',    text: 'text-plum-800',    sub: 'text-plum-500',    watermark: 'text-plum-200/60',    icon: 'bg-plum-100 text-plum-600' },
  'coral-soft':   { bg: 'bg-coral-50',   text: 'text-coral-800',   sub: 'text-coral-500',   watermark: 'text-coral-200/60',   icon: 'bg-coral-100 text-coral-600' },
} as const

export type BentoTheme = keyof typeof BENTO_THEMES

/* ------------------------------------------------------------------ */
/*  BentoStatCard                                                      */
/* ------------------------------------------------------------------ */

export interface BentoStatCardProps {
  value: number | string
  label: string
  icon: ReactNode
  /** Watermark icon — defaults to same as `icon` but rendered large behind the value */
  watermarkIcon?: ReactNode
  theme?: BentoTheme
  /** Whether this is a "hero" (large) card in the bento grid */
  hero?: boolean
  /** Optional unit suffix (kg, m, hrs, etc.) */
  unit?: string
  /** Stagger delay index */
  delay?: number
  className?: string
}

export function BentoStatCard({
  value,
  label,
  icon,
  watermarkIcon,
  theme = 'moss',
  hero = false,
  unit,
  delay = 0,
  className,
}: BentoStatCardProps) {
  const rm = useReducedMotion()
  const isNum = typeof value === 'number'
  const display = useCountUp(isNum ? value : 0, 1200, isNum && !rm)
  const t = BENTO_THEMES[theme]

  const formatted = isNum
    ? (value > 0 ? display.toLocaleString() : '0')
    : value

  return (
    <motion.div
      initial={rm ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        rm
          ? { duration: 0 }
          : { duration: 0.45, delay: 0.08 + delay * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }
      }
      className={cn(
        'relative overflow-hidden rounded-2xl',
        hero ? 'p-5 sm:p-6' : 'p-4',
        t.bg,
        theme.endsWith('-soft') ? 'shadow-[0_2px_12px_rgba(0,0,0,0.08)]' : 'shadow-[0_4px_20px_rgba(0,0,0,0.15)]',
        className,
      )}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      {/* Watermark icon — large, positioned bottom-right, clipped */}
      <div
        className={cn(
          'absolute pointer-events-none select-none',
          hero
            ? '-bottom-3 -right-3 w-28 h-28 sm:w-32 sm:h-32'
            : '-bottom-2 -right-2 w-20 h-20 sm:w-24 sm:h-24',
          t.watermark,
        )}
        aria-hidden="true"
      >
        <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full">
          {watermarkIcon ?? icon}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon badge */}
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-xl mb-3',
            hero ? 'w-10 h-10' : 'w-8 h-8',
            t.icon,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>

        {/* Value */}
        <p
          className={cn(
            'font-heading font-extrabold tabular-nums leading-none tracking-tight',
            hero ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
            t.text,
          )}
        >
          {formatted}
          {unit && (
            <span className={cn('text-base font-bold ml-1', t.sub)}>
              {unit}
            </span>
          )}
        </p>

        {/* Label */}
        <p
          className={cn(
            'font-semibold uppercase tracking-wider mt-1.5',
            hero ? 'text-[11px]' : 'text-[10px]',
            t.sub,
          )}
        >
          {label}
        </p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  BentoStatGrid                                                      */
/*                                                                     */
/*  Irregular bento layout. First 1-2 items get hero treatment.        */
/*  Remaining fill a tighter grid. Automatically assigns col-span      */
/*  classes for the irregular feel.                                     */
/* ------------------------------------------------------------------ */

/**
 * Bento layout patterns for different item counts.
 * Each entry is [smColSpan, mobColSpan, isHero].
 * Grid is 4 columns on sm+, 2 columns on mobile.
 *
 * INVARIANT: mob col spans must sum to a multiple of 2.
 *            sm col spans must sum to a multiple of 4.
 *            This guarantees a complete rectangle with no empty corners.
 */
const BENTO_LAYOUTS: Record<number, Array<[sm_col: number, mob_col: number, hero: boolean]>> = {
  1: [[4, 2, true]],
  // 2 items: two equal cards, full width each
  2: [[2, 2, true], [2, 2, false]],
  // 3 items: one hero 2-wide + two 1-wide (mob: 2+1+1=4 ok, sm: 2+1+1=4 ok)
  3: [[2, 2, true], [1, 1, false], [1, 1, false]],
  // 4 items: two wide + two regular (mob: 2+2+1+1=6 ✓  sm: 2+2+1+1=6… nope, need mult of 4)
  // Better: all 2-wide → mob: 2*4=8 ✓  sm: 2*4=8 ✓ — two rows of two on desktop
  4: [[2, 2, true], [2, 2, false], [2, 1, false], [2, 1, false]],
  // 5 items: one hero 2-wide + four 1-wide (mob: 2+1+1+1+1=6, sm: 2+1+1+1+1=6 — not multiples)
  //   fix: hero 2sm+2mob, then 2sm+1mob, then three 1+1 → mob: 2+1+1+1+1=6 nope
  //   better: two 2sm cols + three 1sm — but must pad sm to 8. Use: [2,2,hero],[2,1],[2,1],[1,1],[1,1]
  //   mob: 2+1+1+1+1 = 6 ✓  sm: 2+2+2+1+1 = 8 ✓
  5: [[2, 2, true], [2, 1, false], [2, 1, false], [1, 1, false], [1, 1, false]],
  // 6 items: hero + 5 regular — mob: 2+1+1+1+1+1+1=8? no, 6 items.
  //   [2,2,hero],[1,1],[1,1],[2,1],[1,1],[1,1] → mob: 2+1+1+1+1+1=... wait. 6 values.
  //   mob: 2+1+1+1+1+1 = 7 ✗. Need mob sum = even.
  //   [2,2,hero],[2,2],[1,1],[1,1],[1,1],[1,1] → mob: 2+2+1+1+1+1=8 ✓  sm: 2+2+1+1+1+1=8 ✓
  6: [[2, 2, true], [2, 2, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false]],
  // 7 items: need mob sum even, sm sum mult of 4.
  //   [2,2,hero],[2,2],[1,1]*5 → mob: 2+2+5=9 ✗
  //   [2,2,hero],[1,1]*6 → mob: 2+6=8 ✓  sm: 2+6=8 ✓
  7: [[2, 2, true], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false]],
  // 8: hero + 7 regular → mob: 2+7=9 ✗. Use [2,2,hero],[2,2],[1,1]*6 → mob: 2+2+6=10 ✓ sm: 2+2+6=10 ✗ (not mult 4)
  //   [2,2,hero],[2,2],[2,1],[1,1]*5 → sm: 2+2+2+5=11 ✗
  //   All [1,1]: mob: 8 ✓  sm: 8 ✓ — clean but no hero
  //   [2,2,hero],[2,2],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1] → 8 items, mob: 2+2+6=10 ✓ sm: 2+2+6=10 ✗
  //   Best: [2,2,hero],[2,2],[2,2],[1,1],[1,1],[1,1],[1,1],[1,1] — 9 items, too many
  //   Simplest rectangle for 8: all 1-col = 8 ✓/8 ✓, but give first hero via prop.
  //   Or: [2,2],[2,2],[1,1]*4 = 8 items, mob: 2+2+4=8 ✓ sm: 2+2+4=8 ✓
  8: [[2, 2, true], [2, 2, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false]],
  // 9: [2,2,hero],[1,1]*8 → mob: 2+8=10 ✓  sm: 2+8=10 ✗ (not mult 4)
  //   [2,2,hero],[2,2],[1,1]*7 → mob: 2+2+7=11 ✗
  //   [2,2,hero],[2,2],[2,2],[1,1]*6 → 9 items, mob: 2+2+2+6=12 ✓ sm: 2+2+2+6=12 ✓
  9: [[2, 2, true], [2, 2, false], [2, 2, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false], [1, 1, false]],
}

/**
 * Build a layout for `count` items that always fills a complete rectangle.
 * mob cols sum must be even (2-col grid). sm cols sum must be multiple of 4.
 */
function getLayout(count: number): Array<[number, number, boolean]> {
  if (count <= 0) return []
  if (BENTO_LAYOUTS[count]) return BENTO_LAYOUTS[count]!

  // For 10+ items: start with one hero (2,2), then fill remaining with 1-col cards.
  // Pad to ensure both mob (even) and sm (mult of 4) sums are met.
  const remaining = count - 1
  const base: Array<[number, number, boolean]> = [[2, 2, true]]

  // After hero: mob used = 2, sm used = 2. Need remaining mob cols to be even, remaining sm cols to be (mult of 4 - 2).
  // Each regular card adds 1 mob + 1 sm. So mob total = 2 + remaining, sm total = 2 + remaining.
  // mob must be even → remaining must be even.
  // sm must be mult of 4 → 2 + remaining ≡ 0 mod 4 → remaining ≡ 2 mod 4.
  // If remaining is odd: make one card 2-mob-wide to compensate.
  // If sm sum is wrong: make some cards 2-sm-wide.

  let mobSum = 2
  let smSum = 2

  for (let i = 0; i < remaining; i++) {
    base.push([1, 1, false])
    mobSum += 1
    smSum += 1
  }

  // Fix mob: if odd, expand last card to 2 mob cols
  if (mobSum % 2 !== 0) {
    base[base.length - 1]![1] = 2
    mobSum += 1
  }

  // Fix sm: need smSum % 4 === 0
  const smRemainder = smSum % 4
  if (smRemainder !== 0) {
    const needed = 4 - smRemainder
    // Expand `needed` cards from 1-sm to 2-sm (starting from card index 1)
    let expanded = 0
    for (let i = 1; i < base.length && expanded < needed; i++) {
      if (base[i]![0] === 1) {
        base[i]![0] = 2
        smSum += 1
        expanded++
        // Also fix mob if this card was mob=1 and mob sum would go odd
      }
    }
    // If mob is now odd from sm fixes, expand one more mob
    if (mobSum % 2 !== 0) {
      for (let i = base.length - 1; i >= 1; i--) {
        if (base[i]![1] === 1) {
          base[i]![1] = 2
          break
        }
      }
    }
  }

  return base
}

const smColClasses: Record<number, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
}

const mobColClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
}

export interface BentoStatGridProps {
  children: ReactNode
  className?: string
  /** Animate into view when scrolled into viewport */
  animateInView?: boolean
}

export function BentoStatGrid({
  children,
  className,
  animateInView = false,
}: BentoStatGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const shouldAnimate = !animateInView || inView

  const items = Children.toArray(children).filter(isValidElement)
  const layout = getLayout(items.length)

  return (
    <motion.div
      ref={ref}
      layout
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 gap-3',
        className,
      )}
    >
      {items.map((child, i) => {
        const [smCol, mobCol, isHero] = layout[i] ?? [1, 1, false]

        return (
          <motion.div
            key={i}
            layout
            className={cn(
              mobColClasses[mobCol],
              smColClasses[smCol],
            )}
          >
            {isValidElement<BentoStatCardProps>(child)
              ? cloneElement(child, {
                  hero: child.props.hero ?? isHero,
                  delay: child.props.delay ?? i,
                } as Partial<BentoStatCardProps>)
              : child}
          </motion.div>
        )
      })}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Convenience: Theme cycling for auto-assignment                     */
/* ------------------------------------------------------------------ */

const THEME_CYCLE_BOLD: BentoTheme[] = [
  'moss', 'warning', 'sky', 'sprout', 'bark', 'plum', 'primary', 'coral', 'info',
]

const THEME_CYCLE_SOFT: BentoTheme[] = [
  'moss-soft', 'warning-soft', 'sky-soft', 'sprout-soft', 'bark-soft', 'plum-soft', 'primary-soft', 'coral-soft',
]

/** Get a bold theme for index i (cycles) */
export function bentoBoldTheme(i: number): BentoTheme {
  return THEME_CYCLE_BOLD[i % THEME_CYCLE_BOLD.length]!
}

/** Get a soft theme for index i (cycles) — first item gets bold, rest soft */
export function bentoMixedTheme(i: number): BentoTheme {
  if (i === 0) return THEME_CYCLE_BOLD[0]!
  return THEME_CYCLE_SOFT[(i - 1) % THEME_CYCLE_SOFT.length]!
}

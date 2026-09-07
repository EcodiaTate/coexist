import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { OptimizedImage } from '@/components/optimized-image'
import { cn } from '@/lib/cn'

/**
 * The full-bleed photographic hero on both membership pages.
 *
 * Written twice, near line for line (CA3 finding 6.F1): the join page at
 * membership/index.tsx and the manage page at profile/membership.tsx. Both
 * carried their own copy of the same OptimizedImage props, the same gradient,
 * the same floating back button and the same motion variants, so a change to
 * the image quality or the srcSet widths reached one page and not the other.
 *
 * Two variants, because the pages differ in exactly three measurements and
 * nothing else. `join` is the taller, larger-titled entry surface; `manage` is
 * the shorter status header. Everything genuinely per-page (the eyebrow, the
 * title, the status pill, the lines under it, the greyscale on a lapsed
 * membership) arrives as a prop or as children, so neither page had to give
 * anything up to share this.
 */
type MembershipHeroVariant = 'join' | 'manage'

const VARIANT: Record<MembershipHeroVariant, { frame: string; content: string; title: string }> = {
  join: {
    frame: 'min-h-[360px]',
    content: 'p-6 sm:p-8',
    title: 'text-[2.5rem] leading-[0.92]',
  },
  manage: {
    frame: 'min-h-[300px]',
    content: 'p-6',
    title: 'text-[2rem] leading-[0.95]',
  },
}

interface MembershipHeroProps {
  variant: MembershipHeroVariant
  /** Signed hero photo. Falls back to the flat brand panel when absent. */
  heroImage?: string | null
  /** Small uppercase line above the title. */
  eyebrow: string
  title: string
  /** Optional pill rendered beside the title (the manage page's status). */
  badge?: ReactNode
  /** Optional extra class on the photo, e.g. greyscale for a lapsed member. */
  imageClassName?: string
  /** Lines rendered under the title. */
  children?: ReactNode
}

export function MembershipHero({
  variant,
  heroImage,
  eyebrow,
  title,
  badge,
  imageClassName,
  children,
}: MembershipHeroProps) {
  const navigate = useNavigate()
  const rm = useReducedMotion()
  const v = VARIANT[variant]
  const titleClass = cn(
    'font-heading font-bold uppercase tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]',
    v.title,
  )

  return (
    <div className="-mx-4 lg:-mx-6">
      <div className={cn('relative overflow-hidden bg-primary-900', v.frame)}>
        {heroImage && (
          <OptimizedImage
            src={heroImage}
            alt=""
            priority
            quality={72}
            sizes="100vw"
            srcSetWidths={[640, 960, 1280, 1600]}
            wrapperClassName="absolute inset-0"
            className={imageClassName}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" aria-hidden="true" />

        <div className="absolute top-3 left-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 active:scale-[0.98] transition-[colors,transform] duration-150"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <motion.div
          className={cn('absolute inset-x-0 bottom-0 z-10', v.content)}
          variants={rm ? undefined : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="visible"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70 mb-3">{eyebrow}</p>
          {badge ? (
            // The manage page pairs the title with a status pill. The join
            // page does not, and its h1 is deliberately NOT put inside a flex
            // row: a flex item is content-sized, so wrapping a bare heading
            // would change where a long plan name breaks.
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={titleClass}>{title}</h1>
              {badge}
            </div>
          ) : (
            <h1 className={titleClass}>{title}</h1>
          )}
          {children}
        </motion.div>
      </div>
    </div>
  )
}

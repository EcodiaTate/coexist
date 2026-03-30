import { motion, useReducedMotion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { Header, Badge } from '@/components'
import { OptimizedImage } from '@/components/optimized-image'
import { ACTIVITY_TYPE_LABELS, getCountdown } from '@/hooks/use-events'
import { cn } from '@/lib/cn'
import type { EventDetailData } from '@/hooks/use-events'

/* ------------------------------------------------------------------ */
/*  Activity badge map                                                 */
/* ------------------------------------------------------------------ */

const activityToBadge: Record<string, 'shore-cleanup' | 'tree-planting' | 'land-regeneration' | 'nature-walk' | 'camp-out' | 'retreat' | 'film-screening' | 'marine-restoration' | 'workshop'> = {
  shore_cleanup: 'shore-cleanup',
  tree_planting: 'tree-planting',
  land_regeneration: 'land-regeneration',
  nature_walk: 'nature-walk',
  camp_out: 'camp-out',
  retreat: 'retreat',
  film_screening: 'film-screening',
  marine_restoration: 'marine-restoration',
  workshop: 'workshop',
}

export { activityToBadge }

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface EventHeroProps {
  event: EventDetailData
  past: boolean
  userStatus: string | null
  accent: { gradient: string; glow: string; bg: string; text: string; border: string }
  onShare: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EventHero({ event, past, userStatus, accent, onShare }: EventHeroProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <>
      {/* ── Full-bleed hero image ── */}
      {event.cover_image_url && (
        <div className="relative -mx-4 lg:-mx-6">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3/4', maxHeight: '56vh' }}>
            <OptimizedImage
              src={event.cover_image_url}
              alt={event.title}
              priority
              sizes="100vw"
              wrapperClassName="absolute inset-0"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
              aria-hidden="true"
            />

            {/* Activity badge on image */}
            <div className="absolute top-3 right-3">
              <Badge
                variant="activity"
                activity={activityToBadge[event.activity_type] ?? 'workshop'}
                size="md"
              >
                {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
              </Badge>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 pb-10 z-[5]">
              {!past && userStatus === 'registered' && (
                <motion.span
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-2.5',
                    'bg-white/25 text-white border border-white/20',
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sprout-400 animate-pulse" />
                  {getCountdown(event.date_start)}
                </motion.span>
              )}
              <h1 className="font-heading text-[26px] sm:text-3xl font-bold text-white leading-tight drop-shadow-lg">
                {event.title}
              </h1>
              {event.collectives && (
                <p className="text-sm text-white/70 font-medium mt-1.5 drop-shadow">
                  by {event.collectives.name}
                </p>
              )}
            </div>
          </div>

          {/* Organic wave transition - matches homepage hero */}
          <div className="absolute -bottom-px left-0 right-0 z-10">
            <svg
              viewBox="0 0 1440 70"
              preserveAspectRatio="none"
              className="w-full h-7 sm:h-10 block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,25
                   C60,22 100,18 140,20
                   C180,22 200,15 220,18
                   L228,8 L234,5 L240,10
                   C280,18 340,24 400,20
                   C440,16 470,22 510,25
                   C560,28 600,20 640,22
                   C670,24 690,18 710,20
                   L718,10 L722,6 L728,12
                   C760,20 820,26 880,22
                   C920,18 950,24 990,26
                   C1020,28 1050,20 1080,18
                   C1100,16 1120,22 1140,24
                   L1148,12 L1153,7 L1158,9 L1165,16
                   C1200,22 1260,26 1320,22
                   C1360,18 1400,24 1440,22
                   L1440,70 L0,70 Z"
                className="fill-white"
              />
            </svg>
          </div>
        </div>
      )}

      {/* ── No cover image header ── */}
      {!event.cover_image_url && (
        <>
          <motion.div
            className="pt-2 pb-1"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2.5">
              <Badge
                variant="activity"
                activity={activityToBadge[event.activity_type] ?? 'workshop'}
                size="md"
              >
                {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
              </Badge>
              {!past && userStatus === 'registered' && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold',
                  accent.bg, accent.text, accent.border, 'border',
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {getCountdown(event.date_start)}
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl font-bold text-primary-800 mt-2.5">
              {event.title}
            </h1>
            {event.collectives && (
              <p className="text-sm text-primary-500 font-medium mt-1">
                by {event.collectives.name}
              </p>
            )}
          </motion.div>
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Sticky overlay header (used by Page stickyOverlay prop)            */
/* ------------------------------------------------------------------ */

export interface EventHeroOverlayProps {
  hasCoverImage: boolean
  onShare: () => void
}

export function EventHeroOverlay({ hasCoverImage, onShare }: EventHeroOverlayProps) {
  if (hasCoverImage) {
    return (
      <Header
        title=""
        back
        transparent
        className="collapse-header"
        rightActions={
          <motion.button
            type="button"
            onClick={onShare}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white cursor-pointer select-none active:scale-95 transition-transform duration-150"
            aria-label="Share event"
          >
            <Share2 size={18} />
          </motion.button>
        }
      />
    )
  }

  return <Header title="" back className="collapse-header" />
}

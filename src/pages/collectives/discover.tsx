import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    MapPin as MapPinIcon,
    List,
    Map,
    Users,
    ChevronRight,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { SearchBar } from '@/components/search-bar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { MapView } from '@/components/map/map-view'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import type { MapMarker } from '@/components'
import { useCollectives, type CollectiveWithLeader } from '@/hooks/use-collective'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATES = [
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT',
]

/* ------------------------------------------------------------------ */
/*  Collective card                                                    */
/* ------------------------------------------------------------------ */

function CollectiveCard({ collective }: { collective: CollectiveWithLeader }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Link
        to={`/collectives/${collective.slug}`}
        className="group flex gap-3 rounded-2xl bg-white shadow-sm border border-neutral-100 p-3 transition-transform duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
      >
        {/* Cover thumbnail */}
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary-100">
          {collective.cover_image_url ? (
            <img
              src={collective.cover_image_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100">
              <Users size={24} className="text-neutral-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-heading text-base font-semibold text-primary-800 truncate">
            {collective.name}
          </h3>
          {collective.region && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-primary-400">
              <MapPinIcon size={12} />
              <span className="truncate">{collective.region}{collective.state ? `, ${collective.state}` : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-primary-400">
              <span className="font-semibold text-primary-800">{collective.member_count}</span> members
            </span>
            {collective.profiles?.display_name && (
              <span className="text-xs text-primary-400">
                Led by {collective.profiles.display_name}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={18} className="self-center text-primary-300 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DiscoverCollectivesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [search, setSearch] = useState('')
  const [selectedState, setSelectedState] = useState<string | null>(null)

  const { data: collectives = [], isLoading, isError } = useCollectives({
    state: selectedState ?? undefined,
    search: search || undefined,
  })
  const showLoading = useDelayedLoading(isLoading)

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['collectives'] })
  }, [queryClient])

  return (
    <Page
      swipeBack
      header={
        <Header
          title="Collectives"
          back
          rightActions={
            <button
              type="button"
              onClick={() => setView(view === 'list' ? 'map' : 'list')}
              aria-label={view === 'list' ? 'Switch to map view' : 'Switch to list view'}
              className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-surface-3 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
            >
              {view === 'list' ? <Map size={20} /> : <List size={20} />}
            </button>
          }
        />
      }
      className="!px-0 bg-surface-1"
    >
      <PullToRefresh
        onRefresh={handleRefresh}
        background={
          <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
            <div className="absolute inset-0 bg-surface-1" />
          </div>
        }
      >
        <div className="relative min-h-full overflow-x-hidden">
          {/* ── Content ── */}
          <div className="relative z-10 px-4 lg:px-6 py-4 space-y-5">
            {/* Search */}
            <div className="rounded-2xl bg-white/90 border border-secondary-100/40 shadow-sm">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by name or location..."
                aria-label="Search collectives"
              />
            </div>

            {/* State filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:-mx-6 lg:px-6 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedState(null)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 min-h-11 text-xs font-semibold active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                  selectedState === null
                    ? 'bg-secondary-700 text-white shadow-sm'
                    : 'bg-white/90 text-primary-400 border border-secondary-100/50 hover:bg-white',
                )}
              >
                All
              </button>
              {STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => setSelectedState(selectedState === state ? null : state)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 min-h-11 text-xs font-semibold active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                    selectedState === state
                      ? 'bg-secondary-700 text-white shadow-sm'
                      : 'bg-white/90 text-primary-400 border border-secondary-100/50 hover:bg-white',
                  )}
                >
                  {state}
                </button>
              ))}
            </div>

            {/* List / Map / Empty / Loading */}
            {view === 'map' ? (
              <MapView
                aria-label="Collectives map"
                className="aspect-[3/4] w-full rounded-2xl border border-secondary-100/40 shadow-sm"
                zoom={5}
                center={{ lat: -28.0, lng: 134.0 }}
                markers={collectives
                  .map((c): MapMarker | null => {
                    const pos = parseLocationPoint(c.location_point)
                    if (!pos) return null
                    return { id: c.id, position: pos, variant: 'collective', label: c.name }
                  })
                  .filter((m): m is MapMarker => m !== null)}
                onMarkerClick={(id) => {
                  const c = collectives?.find((c) => c.id === id)
                  navigate(`/collectives/${c?.slug ?? id}`)
                }}
              />
            ) : showLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} variant="card" className="h-24" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                illustration="error"
                title="Something went wrong"
                description="We couldn't load collectives."
                action={{ label: 'Try again', onClick: handleRefresh }}
              />
            ) : collectives.length === 0 ? (
              <EmptyState
                illustration="search"
                title="No collectives found"
                description={
                  search
                    ? `No collectives match "${search}". Try a different search.`
                    : 'No collectives in this area yet. Check back soon!'
                }
                action={search ? { label: 'Clear Search', onClick: () => setSearch('') } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {collectives.map((collective, i) => (
                  <motion.div
                    key={collective.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  >
                    <CollectiveCard collective={collective} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </Page>
  )
}

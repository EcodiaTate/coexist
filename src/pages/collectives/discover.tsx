import { useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  MapPin as MapPinIcon,
  List,
  Map,
  Users,
  ChevronRight,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Input } from '@/components/input'
import { SearchBar } from '@/components/search-bar'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { MapView } from '@/components/map-view'
import { Chip } from '@/components/chip'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import type { MapMarker } from '@/components'
import { useCollectives, type CollectiveWithLeader } from '@/hooks/use-collective'

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
        className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.98]"
      >
        {/* Cover thumbnail */}
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-primary-100">
          {collective.cover_image_url ? (
            <img
              src={collective.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
              <Users size={24} className="text-primary-400" />
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

        <ChevronRight size={18} className="self-center text-primary-300 flex-shrink-0" />
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

  const { data: collectives = [], isLoading } = useCollectives({
    state: selectedState ?? undefined,
    search: search || undefined,
  })

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['collectives'] })
  }, [queryClient])

  return (
    <Page
      header={
        <Header
          title="Collectives"
          back
          rightActions={
            <button
              type="button"
              onClick={() => setView(view === 'list' ? 'map' : 'list')}
              aria-label={view === 'list' ? 'Switch to map view' : 'Switch to list view'}
              className="flex items-center justify-center w-9 h-9 rounded-full text-primary-400 hover:bg-primary-50 transition-colors duration-150"
            >
              {view === 'list' ? <Map size={20} /> : <List size={20} />}
            </button>
          }
        />
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 p-4">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or location..."
          aria-label="Search collectives"
        />

        {/* State filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedState(null)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              selectedState === null
                ? 'bg-primary-800 text-white'
                : 'bg-white text-primary-400 hover:bg-primary-50',
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
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
                selectedState === state
                  ? 'bg-primary-800 text-white'
                  : 'bg-white text-primary-400 hover:bg-primary-50',
              )}
            >
              {state}
            </button>
          ))}
        </div>

        {/* Content */}
        {view === 'map' ? (
          <MapView
            aria-label="Collectives map"
            className="aspect-[3/4] w-full rounded-2xl"
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
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} variant="card" className="h-24" />
            ))}
          </div>
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
      </PullToRefresh>
    </Page>
  )
}

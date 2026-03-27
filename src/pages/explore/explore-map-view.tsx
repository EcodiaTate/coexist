import type { RefObject } from 'react'
import { useReducedMotion, motion } from 'framer-motion'
import {
  MapIcon,
  List,
  SlidersHorizontal,
} from 'lucide-react'
import { MapView } from '@/components'
import { SearchBar } from '@/components/search-bar'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import type { MapMarker } from '@/components'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ViewMode = 'map' | 'list'

interface NearbyEvent {
  id: string
  title: string
  location_point: unknown
}

interface NearbyCollective {
  id: string
  name: string
  slug: string
  location_point: unknown
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface ExploreMapViewProps {
  searchInputRef: RefObject<HTMLInputElement | null>
  query: string
  setQuery: (q: string) => void
  commitSearch: (term: string) => void
  openFilters: () => void
  activeFilterCount: number
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  userLocation: { lat: number; lng: number } | undefined
  nearbyEventsData: NearbyEvent[] | undefined
  nearbyCollectivesData: NearbyCollective[] | undefined
  onNavigate: (path: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ExploreMapView({
  searchInputRef,
  query,
  setQuery,
  commitSearch,
  openFilters,
  activeFilterCount,
  viewMode,
  setViewMode,
  userLocation,
  nearbyEventsData,
  nearbyCollectivesData,
  onNavigate,
}: ExploreMapViewProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="px-4 lg:px-6 pt-10">
      {/* Search + filter bar for map mode */}
      <div className="flex items-center gap-2 mb-3">
        <SearchBar
          ref={searchInputRef}
          value={query}
          onChange={setQuery}
          onSubmit={commitSearch}
          placeholder="Search events, collectives, people..."
          aria-label="Search"
          className="flex-1 min-w-0"
        />
        <motion.button
          type="button"
          onClick={openFilters}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
          className={cn(
            'relative flex items-center justify-center min-h-11 min-w-11 rounded-xl shrink-0',
            'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
            activeFilterCount > 0
              ? 'bg-primary-50 text-primary-600 shadow-sm'
              : 'bg-primary-50/60 text-primary-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-[10px] font-bold text-white shadow-sm">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
        <div className="flex rounded-xl overflow-hidden shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={cn(
              'flex items-center justify-center min-h-11 min-w-11',
              'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
              viewMode === 'map'
                ? 'bg-primary-600 text-white'
                : 'bg-surface-0 text-primary-400 hover:bg-surface-3',
            )}
            aria-label="Map view"
            aria-pressed={viewMode === 'map'}
          >
            <MapIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center justify-center min-h-11 min-w-11',
              'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-surface-0 text-primary-400 hover:bg-surface-3',
            )}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      <MapView
        center={
          userLocation ?? { lat: -33.8688, lng: 151.2093 }
        }
        zoom={10}
        markers={[
          ...(nearbyEventsData ?? [])
            .map((e): MapMarker | null => {
              const pos = parseLocationPoint(e.location_point)
              if (!pos) return null
              return { id: e.id, position: pos, variant: 'event', label: e.title }
            })
            .filter((m): m is MapMarker => m !== null),
          ...(nearbyCollectivesData ?? [])
            .map((c): MapMarker | null => {
              const pos = parseLocationPoint(c.location_point)
              if (!pos) return null
              return { id: c.id, position: pos, variant: 'collective', label: c.name }
            })
            .filter((m): m is MapMarker => m !== null),
        ]}
        onMarkerClick={(id) => {
          const isEvent = nearbyEventsData?.some((e) => e.id === id)
          const isCollective = nearbyCollectivesData?.some((c) => c.id === id)
          if (isEvent) onNavigate(`/events/${id}`)
          else if (isCollective) onNavigate(`/collectives/${id}`)
        }}
        className="h-[60vh] rounded-2xl"
        aria-label="Map showing nearby events and collectives"
      />
    </div>
  )
}

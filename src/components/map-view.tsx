import { lazy, Suspense, type ReactNode } from 'react'
import { MapPin as MapPinLucide } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MapCenter {
  lat: number
  lng: number
}

export type MarkerVariant = 'default' | 'event' | 'collective'

export interface MapMarker {
  id: string
  position: MapCenter
  variant?: MarkerVariant
  label?: string
  popupContent?: ReactNode
}

export interface MapViewProps {
  center?: MapCenter
  zoom?: number
  markers?: MapMarker[]
  onMarkerClick?: (id: string) => void
  /** Draggable single pin mode (for location picking) */
  draggable?: boolean
  onDragEnd?: (position: MapCenter) => void
  /** Disable zoom/pan interactions (mini-map mode) */
  interactive?: boolean
  loading?: boolean
  children?: ReactNode
  className?: string
  'aria-label'?: string
}

/* ------------------------------------------------------------------ */
/*  Lazy-loaded inner map (avoids Leaflet in main bundle)              */
/* ------------------------------------------------------------------ */

const LeafletMapInner = lazy(() => import('./leaflet-map-inner'))

/* ------------------------------------------------------------------ */
/*  Loading placeholder                                                */
/* ------------------------------------------------------------------ */

function MapPlaceholder({ className, ariaLabel }: { className?: string; ariaLabel: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${ariaLabel}`}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl bg-white',
        className,
      )}
    >
      <div className="absolute inset-0 animate-pulse">
        <div className="h-full w-full bg-gradient-to-br from-primary-200 via-primary-100 to-primary-200" />
      </div>
      <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 text-primary-400">
        <MapPinLucide size={32} strokeWidth={1.5} aria-hidden="true" />
        <span className="text-sm font-medium">Loading map...</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MapView (public component)                                         */
/* ------------------------------------------------------------------ */

export function MapView({
  center,
  zoom = 13,
  markers,
  onMarkerClick,
  draggable = false,
  onDragEnd,
  interactive = true,
  loading = false,
  children,
  className,
  'aria-label': ariaLabel = 'Map view',
}: MapViewProps) {
  if (loading) {
    return <MapPlaceholder className={className} ariaLabel={ariaLabel} />
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl bg-white',
        className,
      )}
    >
      <Suspense fallback={<MapPlaceholder className="absolute inset-0" ariaLabel={ariaLabel} />}>
        <LeafletMapInner
          center={center}
          zoom={zoom}
          markers={markers}
          onMarkerClick={onMarkerClick}
          draggable={draggable}
          onDragEnd={onDragEnd}
          interactive={interactive}
        />
      </Suspense>
      {children && (
        <div className="absolute inset-0 z-[1000] pointer-events-none" aria-label="Map overlay">
          <div className="pointer-events-auto">{children}</div>
        </div>
      )}
    </div>
  )
}

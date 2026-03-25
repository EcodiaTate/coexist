import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { cn } from '@/lib/cn'
import type { MapCenter } from './map-view'

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'coexist-draw-overrides'

function injectDrawStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .leaflet-draw-toolbar a { border-radius: 6px !important; }
    .leaflet-draw-actions a { border-radius: 4px !important; }
  `
  document.head.appendChild(style)
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AreaGeoJSON {
  type: 'Feature'
  geometry: {
    type: 'Polygon' | 'Circle'
    coordinates: number[][] | number[][][]
  }
  properties: { radius?: number }
}

interface LeafletDrawMapProps {
  center?: MapCenter
  zoom?: number
  onAreaChange?: (area: AreaGeoJSON | null) => void
  className?: string
  'aria-label'?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export default function LeafletDrawMap({
  center = { lat: -33.8688, lng: 151.2093 },
  zoom = 14,
  onAreaChange,
  className,
  'aria-label': ariaLabel = 'Draw area on map',
}: LeafletDrawMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const onAreaChangeRef = useRef(onAreaChange)
  onAreaChangeRef.current = onAreaChange

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    injectDrawStyles()

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      attributionControl: true,
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)

    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 },
        },
        circle: {
          shapeOptions: { color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 },
        },
        rectangle: {
          shapeOptions: { color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 },
        },
        polyline: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })

    map.addControl(drawControl)

    function emitArea() {
      const layers = drawnItems.getLayers()
      if (layers.length === 0) {
        onAreaChangeRef.current?.(null)
        return
      }

      const last = layers[layers.length - 1]
      const geoJSON = (last as L.Polygon | L.Circle).toGeoJSON() as AreaGeoJSON

      // For circles, include the radius in properties
      if (last instanceof L.Circle) {
        geoJSON.properties = { radius: last.getRadius() }
      }

      onAreaChangeRef.current?.(geoJSON)
    }

    map.on(L.Draw.Event.CREATED, ((e: L.DrawEvents.Created) => {
      // Only keep one shape at a time
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      emitArea()
    }) as unknown as L.LeafletEventHandlerFn)

    map.on(L.Draw.Event.EDITED, () => emitArea())
    map.on(L.Draw.Event.DELETED, () => emitArea())

    mapRef.current = map

    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update center
  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], zoom)
  }, [center.lat, center.lng, zoom])

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn('relative w-full overflow-hidden rounded-2xl bg-white', className)}
    >
      <div ref={containerRef} className="h-full w-full min-h-[250px]" style={{ zIndex: 0 }} />
    </div>
  )
}

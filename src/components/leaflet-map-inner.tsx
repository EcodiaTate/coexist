import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { createPinIcon, createClusterIcon } from '@/lib/leaflet-icons'
import type { MapCenter, MapMarker } from './map-view'

/* ------------------------------------------------------------------ */
/*  Global CSS overrides for Co-Exist styling                          */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'coexist-leaflet-overrides'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .coexist-map-pin { background: none !important; border: none !important; }
    .coexist-cluster-icon { background: none !important; border: none !important; }
    .leaflet-popup-content-wrapper {
      border-radius: 12px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
      font-family: 'Inter', sans-serif !important;
    }
    .leaflet-popup-tip { box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; }
    .leaflet-control-zoom a {
      border-radius: 8px !important;
      width: 36px !important;
      height: 36px !important;
      line-height: 36px !important;
      font-size: 16px !important;
    }
    .leaflet-control-zoom {
      border: none !important;
      border-radius: 10px !important;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
    }
    .leaflet-touch .leaflet-bar a { width: 36px; height: 36px; line-height: 36px; }
  `
  document.head.appendChild(style)
}

/* ------------------------------------------------------------------ */
/*  Tile layer config                                                  */
/* ------------------------------------------------------------------ */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const DEFAULT_CENTER: MapCenter = { lat: -33.8688, lng: 151.2093 } // Sydney

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface LeafletMapInnerProps {
  center?: MapCenter
  zoom: number
  markers?: MapMarker[]
  onMarkerClick?: (id: string) => void
  draggable?: boolean
  onDragEnd?: (position: MapCenter) => void
  interactive?: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LeafletMapInner({
  center,
  zoom,
  markers,
  onMarkerClick,
  draggable = false,
  onDragEnd,
  interactive = true,
}: LeafletMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const draggableMarkerRef = useRef<L.Marker | null>(null)

  // Stable callback refs
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick
  const onDragEndRef = useRef(onDragEnd)
  onDragEndRef.current = onDragEnd

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    injectStyles()

    const c = center ?? DEFAULT_CENTER
    const map = L.map(containerRef.current, {
      center: [c.lat, c.lng],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
      // @ts-expect-error tap is valid Leaflet option
      tap: interactive,
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)

    mapRef.current = map

    // Force a resize after mount to handle containers that aren't visible yet
    requestAnimationFrame(() => {
      map.invalidateSize()
    })

    return () => {
      map.remove()
      mapRef.current = null
      clusterGroupRef.current = null
      draggableMarkerRef.current = null
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update center/zoom
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const c = center ?? DEFAULT_CENTER
    map.setView([c.lat, c.lng], zoom, { animate: true })
  }, [center?.lat, center?.lng, zoom])

  // Update markers with clustering
  useEffect(() => {
    const map = mapRef.current
    if (!map || draggable) return

    // Clean previous cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current)
      clusterGroupRef.current = null
    }

    if (!markers?.length) return

    const group = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      animate: true,
    })

    for (const m of markers) {
      const icon = createPinIcon(m.variant ?? 'default')
      const leafletMarker = L.marker([m.position.lat, m.position.lng], { icon })

      if (m.label) {
        leafletMarker.bindTooltip(m.label, {
          direction: 'top',
          offset: [0, -46],
          className: 'coexist-tooltip',
        })
      }

      leafletMarker.on('click', () => {
        onMarkerClickRef.current?.(m.id)
      })

      group.addLayer(leafletMarker)
    }

    map.addLayer(group)
    clusterGroupRef.current = group

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.position.lat, m.position.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [markers, draggable])

  // Draggable pin mode
  useEffect(() => {
    const map = mapRef.current
    if (!map || !draggable) return

    const c = center ?? DEFAULT_CENTER
    const icon = createPinIcon('event')

    if (draggableMarkerRef.current) {
      draggableMarkerRef.current.setLatLng([c.lat, c.lng])
      return
    }

    const marker = L.marker([c.lat, c.lng], {
      icon,
      draggable: true,
    }).addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      onDragEndRef.current?.({ lat: pos.lat, lng: pos.lng })
    })

    draggableMarkerRef.current = marker

    return () => {
      map.removeLayer(marker)
      draggableMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable])

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-[200px]"
      style={{ zIndex: 0 }}
    />
  )
}

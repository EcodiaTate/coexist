import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Users, TreePine, ArrowRight, Navigation, X } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Collective data                                                    */
/* ------------------------------------------------------------------ */

interface Collective {
  id: string
  slug: string
  name: string
  shortName: string
  location: string
  lat: number
  lng: number
  members: number
  nextEvent?: string
  description: string
}

const COLLECTIVES: Collective[] = [
  {
    id: 'perth',
    slug: 'perth',
    name: 'Perth Collective',
    shortName: 'Perth',
    location: 'Perth, WA',
    lat: -31.9505,
    lng: 115.8605,
    members: 124,
    nextEvent: 'Beach Clean - Apr 5',
    description: 'Protecting the stunning coastline and bushlands of Western Australia.',
  },
  {
    id: 'adelaide',
    slug: 'adelaide',
    name: 'Adelaide Collective',
    shortName: 'Adelaide',
    location: 'Adelaide, SA',
    lat: -34.9285,
    lng: 138.6007,
    members: 89,
    nextEvent: 'River Restoration - Apr 12',
    description: "Restoring native habitats along the Torrens and across Adelaide's parks.",
  },
  {
    id: 'geelong',
    slug: 'geelong',
    name: 'Geelong Collective',
    shortName: 'Geelong',
    location: 'Geelong, VIC',
    lat: -38.1499,
    lng: 144.3617,
    members: 67,
    nextEvent: 'Dune Planting - Apr 8',
    description: 'Caring for the Bellarine coast and Barwon River corridors.',
  },
  {
    id: 'mornington',
    slug: 'mornington-peninsula',
    name: 'Mornington Peninsula Collective',
    shortName: 'Mornington',
    location: 'Mornington Peninsula, VIC',
    lat: -38.2833,
    lng: 145.1667,
    members: 53,
    nextEvent: 'Mangrove Monitoring - Apr 19',
    description: "Protecting the unique ecosystems of the Peninsula's coastline.",
  },
  {
    id: 'melbourne',
    slug: 'melbourne-city',
    name: 'Melbourne City Collective',
    shortName: 'Melbourne',
    location: 'Melbourne, VIC',
    lat: -37.8136,
    lng: 144.9631,
    members: 312,
    nextEvent: 'Urban Greening - Apr 2',
    description: "Greening Melbourne's inner city through planting, litter removal and advocacy.",
  },
  {
    id: 'hobart',
    slug: 'hobart',
    name: 'Hobart Collective',
    shortName: 'Hobart',
    location: 'Hobart, TAS',
    lat: -42.8821,
    lng: 147.3272,
    members: 48,
    nextEvent: 'Habitat Survey - Apr 15',
    description: "Conserving Tasmania's unique wilderness and waterways.",
  },
  {
    id: 'sydney',
    slug: 'sydney',
    name: 'Sydney Collective',
    shortName: 'Sydney',
    location: 'Sydney, NSW',
    lat: -33.8688,
    lng: 151.2093,
    members: 287,
    nextEvent: 'Harbour Clean-up - Apr 6',
    description: "From the harbour to the Blue Mountains - protecting Sydney's natural heritage.",
  },
  {
    id: 'northern-rivers',
    slug: 'northern-rivers',
    name: 'Northern Rivers Collective',
    shortName: 'Northern Rivers',
    location: 'Northern Rivers, NSW',
    lat: -28.8131,
    lng: 153.2760,
    members: 95,
    nextEvent: 'Rainforest Regen - Apr 20',
    description: 'Restoring the lush subtropical rainforests and river systems of the Northern Rivers.',
  },
  {
    id: 'gold-coast',
    slug: 'gold-coast',
    name: 'Gold Coast Collective',
    shortName: 'Gold Coast',
    location: 'Gold Coast, QLD',
    lat: -28.0167,
    lng: 153.4000,
    members: 143,
    nextEvent: 'Dune Restoration - Apr 10',
    description: "Protecting the Gold Coast's beaches, hinterland and waterways.",
  },
  {
    id: 'brisbane',
    slug: 'brisbane',
    name: 'Brisbane Collective',
    shortName: 'Brisbane',
    location: 'Brisbane, QLD',
    lat: -27.4698,
    lng: 153.0251,
    members: 198,
    nextEvent: 'Creek Clean - Apr 3',
    description: "Revitalising Brisbane's creeks, parks and urban bushland.",
  },
  {
    id: 'sunshine-coast',
    slug: 'sunshine-coast',
    name: 'Sunshine Coast Collective',
    shortName: 'Sunshine Coast',
    location: 'Sunshine Coast, QLD',
    lat: -26.6500,
    lng: 153.0667,
    members: 76,
    nextEvent: 'Turtle Nesting Watch - Apr 22',
    description: "Guardians of the Sunshine Coast's beaches, reefs and hinterland.",
  },
  {
    id: 'townsville',
    slug: 'townsville',
    name: 'Townsville Collective',
    shortName: 'Townsville',
    location: 'Townsville, QLD',
    lat: -19.2590,
    lng: 146.8169,
    members: 42,
    nextEvent: 'Reef Monitoring - Apr 18',
    description: 'Protecting tropical ecosystems from reef to rainforest in North Queensland.',
  },
  {
    id: 'cairns',
    slug: 'cairns',
    name: 'Cairns Collective',
    shortName: 'Cairns',
    location: 'Cairns, QLD',
    lat: -16.9186,
    lng: 145.7781,
    members: 61,
    nextEvent: 'Mangrove Planting - Apr 25',
    description: 'Where the rainforest meets the reef - conservation in tropical Far North Queensland.',
  },
]

/* ------------------------------------------------------------------ */
/*  Custom pin - slate coloured                                        */
/* ------------------------------------------------------------------ */

const PIN_COLOR = '#475569' // slate-600
const PIN_ACTIVE_COLOR = '#1e293b' // slate-800

function createCollectiveIcon(active = false): L.DivIcon {
  const size = active ? 30 : 20
  const height = active ? 38 : 26
  const color = active ? PIN_ACTIVE_COLOR : PIN_COLOR

  const svg = `<svg width="${size}" height="${height}" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 16.2 26.4 17.1 27.15a1.5 1.5 0 0 0 1.8 0C19.8 44.4 36 30.6 36 18 36 8.06 27.94 0 18 0Z" fill="${color}"/>
    <circle cx="18" cy="17" r="9" fill="white" fill-opacity="0.95"/>
    <circle cx="18" cy="17" r="4" fill="${color}"/>
  </svg>`

  return L.divIcon({
    html: active
      ? `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:${color};opacity:0.12;animation:coexist-map-ping 1.5s ease-out infinite;top:-3px;left:-3px;"></div>
          ${svg}
        </div>`
      : svg,
    className: 'coexist-cmap-pin',
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
  })
}

/* ------------------------------------------------------------------ */
/*  VIC cluster icon - for the 3 close Melbourne-area collectives      */
/* ------------------------------------------------------------------ */

function createVicClusterIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;
      display:flex;align-items:center;justify-content:center;
      background:${PIN_COLOR};color:white;
      border-radius:50%;border:2px solid white;
      font-size:11px;font-weight:700;
      box-shadow:0 2px 6px rgba(0,0,0,0.15);
      cursor:pointer;
    ">3</div>`,
    className: 'coexist-cmap-pin',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

/* ------------------------------------------------------------------ */
/*  Injected styles                                                    */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'coexist-collective-map-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .coexist-cmap-pin { background: none !important; border: none !important; }

    @keyframes coexist-map-ping {
      0% { transform: scale(0.8); opacity: 0.2; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .coexist-cmap .leaflet-control-zoom {
      border: none !important;
      border-radius: 12px !important;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
    }
    .coexist-cmap .leaflet-control-zoom a {
      border-radius: 0 !important;
      width: 34px !important;
      height: 34px !important;
      line-height: 34px !important;
      font-size: 15px !important;
      color: #475569 !important;
      border-bottom: 1px solid #e2e8f0 !important;
      background: white !important;
    }
    .coexist-cmap .leaflet-control-zoom a:last-child { border-bottom: none !important; }
    .coexist-cmap .leaflet-control-zoom a:hover { background: #f8fafc !important; }
    .coexist-cmap .leaflet-control-attribution { display: none !important; }

    /* Transparent bg - page white shows through as ocean */
    .coexist-cmap,
    .coexist-cmap.leaflet-container {
      background: transparent !important;
    }
    /* Allow page scrolling when not interacting with the map */
    .coexist-cmap.leaflet-container {
      touch-action: auto !important;
    }
    .coexist-cmap.leaflet-container.coexist-cmap-active {
      touch-action: none !important;
    }

    /* Tooltip labels - hidden by default, shown when zoomed in */
    .coexist-cmap-label {
      background: none !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      font-family: 'Montserrat', sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #334155 !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      visibility: hidden !important;
      transition: opacity 0.25s ease, visibility 0.25s ease;
      pointer-events: none !important;
    }
    .coexist-cmap-label::before {
      display: none !important;
    }
    .coexist-cmap-labels-visible .coexist-cmap-label {
      opacity: 1 !important;
      visibility: visible !important;
    }
  `
  document.head.appendChild(style)
}

/* ------------------------------------------------------------------ */
/*  Australia GeoJSON boundary                                         */
/* ------------------------------------------------------------------ */

import australiaGeoJson from '@/assets/australia.geo.json'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AUS_CENTER: L.LatLngExpression = [-28.5, 134.5]
const AUS_ZOOM = 3.25
const VIC_CENTER: L.LatLngExpression = [-38.05, 144.8]
const VIC_IDS = new Set(['geelong', 'mornington', 'melbourne'])

const springSheet = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 36,
  mass: 0.8,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CollectiveMapProps {
  className?: string
}

export function CollectiveMap({ className }: CollectiveMapProps) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const vicClusterRef = useRef<L.Marker | null>(null)
  const vicExpandedRef = useRef(false)

  const [selected, setSelected] = useState<Collective | null>(null)
  const [mapReady, setMapReady] = useState(false)

  /* ---------- Init map ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    injectStyles()

    // Bounding box: generous padding around Australia so it can't be panned off-screen
    const ausBounds = L.latLngBounds(
      [-48, 108], // SW corner (south of Tassie, west of WA)
      [-8, 160],  // NE corner (north of Cape York, east of NSW)
    )

    const map = L.map(containerRef.current, {
      center: AUS_CENTER,
      zoom: AUS_ZOOM,
      zoomControl: true,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      // @ts-expect-error tap is valid Leaflet option
      tap: false,
      minZoom: 3,
      maxZoom: 12,
      maxBounds: ausBounds,
      maxBoundsViscosity: 0.8,
      // Start with all interactions disabled - enabled only over land/markers
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
    })

    map.zoomControl.setPosition('bottomright')

    // Track whether interactions are currently enabled
    let interactionsEnabled = false

    function enableInteractions() {
      if (interactionsEnabled) return
      interactionsEnabled = true
      map.dragging.enable()
      map.touchZoom.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      const el = map.getContainer()
      el.style.cursor = 'grab'
      el.classList.add('coexist-cmap-active')
    }

    function disableInteractions() {
      if (!interactionsEnabled) return
      interactionsEnabled = false
      map.dragging.disable()
      map.touchZoom.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      const el = map.getContainer()
      el.style.cursor = ''
      el.classList.remove('coexist-cmap-active')
    }

    // Draw Australia as an olive polygon
    const ausLayer = L.geoJSON(australiaGeoJson as GeoJSON.FeatureCollection, {
      style: {
        fillColor: '#869e62',
        fillOpacity: 1,
        color: '#748b50',
        weight: 1.5,
        opacity: 0.6,
      },
    }).addTo(map)

    // Enable map interactions when hovering/touching the continent
    ausLayer.on('mouseover', enableInteractions)
    ausLayer.on('mouseout', disableInteractions)

    // For touch: detect if touch starts on land or ocean
    const container = map.getContainer()
    container.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      if (!touch) return
      const point = map.containerPointToLatLng(L.point(
        touch.clientX - container.getBoundingClientRect().left,
        touch.clientY - container.getBoundingClientRect().top,
      ))
      // Check if point is inside any Australia polygon
      let onLand = false
      ausLayer.eachLayer((layer) => {
        if ((layer as L.Polygon).getBounds?.().contains(point)) {
          // Rough bounding box check - good enough for touch
          onLand = true
        }
      })
      if (onLand) {
        enableInteractions()
      } else {
        disableInteractions()
      }
    }, { passive: true })

    container.addEventListener('touchend', () => {
      // Small delay then disable so momentum continues briefly
      setTimeout(disableInteractions, 300)
    }, { passive: true })

    // Also enable interactions when hovering any marker
    mapRef.current = map
    // Store enableInteractions for markers to use
    ;(map as unknown as Record<string, unknown>)._coexistEnable = enableInteractions
    ;(map as unknown as Record<string, unknown>)._coexistDisable = disableInteractions

    requestAnimationFrame(() => {
      map.invalidateSize()
      setMapReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  /* ---------- Helpers for VIC cluster ---------- */
  const showVicCluster = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    // Hide individual VIC markers
    VIC_IDS.forEach((id) => {
      const m = markersRef.current.get(id)
      if (m) map.removeLayer(m)
    })

    // Add cluster marker if not already on map
    if (!vicClusterRef.current) {
      const icon = createVicClusterIcon()
      const marker = L.marker(VIC_CENTER, { icon })
      marker.on('click', () => {
        // Zoom into VIC to expand the three
        map.flyTo(VIC_CENTER, 8, {
          duration: shouldReduceMotion ? 0.3 : 0.8,
        })
      })
      vicClusterRef.current = marker
    }
    vicClusterRef.current.addTo(map)
    vicExpandedRef.current = false
  }, [shouldReduceMotion])

  const showVicIndividual = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    // Remove cluster
    if (vicClusterRef.current) {
      map.removeLayer(vicClusterRef.current)
    }

    // Show individual markers
    VIC_IDS.forEach((id) => {
      const m = markersRef.current.get(id)
      if (m && !map.hasLayer(m)) m.addTo(map)
    })
    vicExpandedRef.current = true
  }, [])

  /* ---------- Add markers ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Clear old
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current.clear()
    if (vicClusterRef.current) {
      map.removeLayer(vicClusterRef.current)
      vicClusterRef.current = null
    }

    for (const c of COLLECTIVES) {
      const icon = createCollectiveIcon(false)
      const marker = L.marker([c.lat, c.lng], { icon })

      // Permanent tooltip label - hidden initially, shown on zoom
      marker.bindTooltip(c.shortName, {
        permanent: true,
        direction: 'right',
        offset: [12, -14],
        className: 'coexist-cmap-label',
      })

      // Enable map interactions when hovering markers
      const enable = (map as unknown as Record<string, unknown>)._coexistEnable as (() => void) | undefined
      const disable = (map as unknown as Record<string, unknown>)._coexistDisable as (() => void) | undefined
      if (enable) marker.on('mouseover', enable)
      if (disable) marker.on('mouseout', disable)

      marker.on('click', () => {
        setSelected(c)
        enable?.()
        map.flyTo([c.lat, c.lng], 10, {
          duration: shouldReduceMotion ? 0.3 : 1.0,
          easeLinearity: 0.4,
        })
        // Update icons
        markersRef.current.forEach((m, id) => {
          m.setIcon(createCollectiveIcon(id === c.id))
        })
      })

      markersRef.current.set(c.id, marker)

      // Only add non-VIC markers directly; VIC handled by cluster
      if (!VIC_IDS.has(c.id)) {
        marker.addTo(map)
      }
    }

    // Start with VIC clustered
    showVicCluster()

    // Toggle labels + VIC cluster based on zoom
    const LABEL_ZOOM = 5
    const updateLabelsAndCluster = () => {
      const z = map.getZoom()

      // VIC cluster
      if (z >= 7 && !vicExpandedRef.current) {
        showVicIndividual()
      } else if (z < 7 && vicExpandedRef.current) {
        showVicCluster()
      }

      // Labels - show/hide via CSS class on the container
      const container = map.getContainer()
      if (z >= LABEL_ZOOM) {
        container.classList.add('coexist-cmap-labels-visible')
      } else {
        container.classList.remove('coexist-cmap-labels-visible')
      }
    }
    map.on('zoomend', updateLabelsAndCluster)
    // Run once on init
    updateLabelsAndCluster()

    return () => {
      map.off('zoomend', updateLabelsAndCluster)
    }
  }, [mapReady, shouldReduceMotion, showVicCluster, showVicIndividual])

  /* ---------- Close card ---------- */
  const handleClose = useCallback(() => {
    setSelected(null)
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => {
      m.setIcon(createCollectiveIcon(false))
    })

    map.flyTo(AUS_CENTER, AUS_ZOOM, {
      duration: shouldReduceMotion ? 0.3 : 0.8,
    })
  }, [shouldReduceMotion])

  /* ---------- Tap map to deselect ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handler = () => { if (selected) handleClose() }
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [selected, handleClose])

  /* ---------- Select from chip ---------- */
  const selectCollective = useCallback((c: Collective) => {
    setSelected(c)
    const map = mapRef.current
    if (!map) return

    // If it's a VIC collective, expand VIC first
    if (VIC_IDS.has(c.id) && !vicExpandedRef.current) {
      showVicIndividual()
    }

    map.flyTo([c.lat, c.lng], 10, {
      duration: shouldReduceMotion ? 0.3 : 1.0,
      easeLinearity: 0.4,
    })
    markersRef.current.forEach((m, id) => {
      m.setIcon(createCollectiveIcon(id === c.id))
    })
  }, [shouldReduceMotion, showVicIndividual])

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Map container */}
      <div
        ref={containerRef}
        className="coexist-cmap w-full h-full"
        style={{ zIndex: 0, background: '#ffffff' }}
      />

      {/* Loading */}
      <AnimatePresence>
        {!mapReady && (
          <motion.div
            className="absolute inset-0 z-[400] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="h-8 w-8 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-left badge */}
      <div className="absolute top-3 left-3 z-[500]">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-400">
            <TreePine size={12} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-secondary-700">
            {COLLECTIVES.length} Collectives
          </span>
        </div>
      </div>

      {/* Selected collective card */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            className="absolute bottom-3 left-3 right-3 z-[500]"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.12 } : springSheet}
          >
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/8">
              {/* Green accent */}
              <div className="h-1 bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300" />

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-bold text-secondary-800 leading-snug">
                      {selected.name}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-secondary-400">
                      <Navigation size={11} />
                      <span>{selected.location}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClose() }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200/60 text-secondary-400 active:scale-[0.90] transition-transform duration-150 cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-secondary-500 line-clamp-2">
                  {selected.description}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs">
                      <Users size={13} className="text-primary-500" />
                      <span className="font-semibold text-secondary-700">{selected.members}</span>
                    </div>
                    {selected.nextEvent && (
                      <div className="flex items-center gap-1 text-xs text-secondary-400">
                        <TreePine size={13} className="text-primary-500" />
                        <span>{selected.nextEvent}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/collectives/${selected.slug}`)}
                    className={cn(
                      'flex items-center gap-1.5 shrink-0',
                      'rounded-xl bg-primary-400 px-3.5 py-2',
                      'text-xs font-semibold text-white',
                      'active:scale-[0.97] transition-transform duration-150',
                    )}
                  >
                    View
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable chips */}
      <AnimatePresence>
        {!selected && mapReady && (
          <motion.div
            className="absolute bottom-3 left-0 right-0 z-[500] px-3"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div
              className={cn(
                'flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5',
                '[mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-8px),transparent)]',
              )}
            >
              {COLLECTIVES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCollective(c)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5',
                    'rounded-xl bg-white',
                    'px-3 py-2 shadow-sm',
                    'text-xs font-medium text-secondary-600',
                    'active:scale-[0.97] transition-transform duration-150',
                    'border border-primary-100/60',
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-slate-500" />
                  {c.shortName}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

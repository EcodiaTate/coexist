import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  MapPin,
  Users,
  TreePine,
  ArrowRight,
  Navigation,
  X,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Collective data — hardcoded for now                                */
/* ------------------------------------------------------------------ */

interface Collective {
  id: string
  name: string
  location: string
  lat: number
  lng: number
  members: number
  nextEvent?: string
  image?: string
  description: string
}

const COLLECTIVES: Collective[] = [
  {
    id: 'perth',
    name: 'Perth Collective',
    location: 'Perth, WA',
    lat: -31.9505,
    lng: 115.8605,
    members: 124,
    nextEvent: 'Beach Clean — Apr 5',
    description: 'Protecting the stunning coastline and bushlands of Western Australia.',
  },
  {
    id: 'adelaide',
    name: 'Adelaide Collective',
    location: 'Adelaide, SA',
    lat: -34.9285,
    lng: 138.6007,
    members: 89,
    nextEvent: 'River Restoration — Apr 12',
    description: 'Restoring native habitats along the Torrens and across Adelaide\'s parks.',
  },
  {
    id: 'geelong',
    name: 'Geelong Collective',
    location: 'Geelong, VIC',
    lat: -38.1499,
    lng: 144.3617,
    members: 67,
    nextEvent: 'Dune Planting — Apr 8',
    description: 'Caring for the Bellarine coast and Barwon River corridors.',
  },
  {
    id: 'mornington',
    name: 'Mornington Peninsula Collective',
    location: 'Mornington Peninsula, VIC',
    lat: -38.3833,
    lng: 145.0167,
    members: 53,
    nextEvent: 'Mangrove Monitoring — Apr 19',
    description: "Protecting the unique ecosystems of the Peninsula's coastline.",
  },
  {
    id: 'melbourne',
    name: 'Melbourne City Collective',
    location: 'Melbourne, VIC',
    lat: -37.8136,
    lng: 144.9631,
    members: 312,
    nextEvent: 'Urban Greening — Apr 2',
    description: "Greening Melbourne's inner city through planting, litter removal and advocacy.",
  },
  {
    id: 'hobart',
    name: 'Hobart Collective',
    location: 'Hobart, TAS',
    lat: -42.8821,
    lng: 147.3272,
    members: 48,
    nextEvent: 'Habitat Survey — Apr 15',
    description: "Conserving Tasmania's unique wilderness and waterways.",
  },
  {
    id: 'sydney',
    name: 'Sydney Collective',
    location: 'Sydney, NSW',
    lat: -33.8688,
    lng: 151.2093,
    members: 287,
    nextEvent: 'Harbour Clean-up — Apr 6',
    description: "From the harbour to the Blue Mountains — protecting Sydney's natural heritage.",
  },
  {
    id: 'northern-rivers',
    name: 'Northern Rivers Collective',
    location: 'Northern Rivers, NSW',
    lat: -28.8131,
    lng: 153.2760,
    members: 95,
    nextEvent: 'Rainforest Regen — Apr 20',
    description: 'Restoring the lush subtropical rainforests and river systems of the Northern Rivers.',
  },
  {
    id: 'gold-coast',
    name: 'Gold Coast Collective',
    location: 'Gold Coast, QLD',
    lat: -28.0167,
    lng: 153.4000,
    members: 143,
    nextEvent: 'Dune Restoration — Apr 10',
    description: "Protecting the Gold Coast's beaches, hinterland and waterways.",
  },
  {
    id: 'brisbane',
    name: 'Brisbane Collective',
    location: 'Brisbane, QLD',
    lat: -27.4698,
    lng: 153.0251,
    members: 198,
    nextEvent: 'Creek Clean — Apr 3',
    description: "Revitalising Brisbane's creeks, parks and urban bushland.",
  },
  {
    id: 'sunshine-coast',
    name: 'Sunshine Coast Collective',
    location: 'Sunshine Coast, QLD',
    lat: -26.6500,
    lng: 153.0667,
    members: 76,
    nextEvent: 'Turtle Nesting Watch — Apr 22',
    description: "Guardians of the Sunshine Coast's beaches, reefs and hinterland.",
  },
  {
    id: 'townsville',
    name: 'Townsville Collective',
    location: 'Townsville, QLD',
    lat: -19.2590,
    lng: 146.8169,
    members: 42,
    nextEvent: 'Reef Monitoring — Apr 18',
    description: 'Protecting tropical ecosystems from reef to rainforest in North Queensland.',
  },
  {
    id: 'cairns',
    name: 'Cairns Collective',
    location: 'Cairns, QLD',
    lat: -16.9186,
    lng: 145.7781,
    members: 61,
    nextEvent: 'Mangrove Planting — Apr 25',
    description: 'Where the rainforest meets the reef — conservation in tropical Far North Queensland.',
  },
]

/* ------------------------------------------------------------------ */
/*  Custom pin SVG                                                     */
/* ------------------------------------------------------------------ */

function createCollectiveIcon(active = false): L.DivIcon {
  const size = active ? 48 : 36
  const height = active ? 62 : 46
  const color = '#879e62'
  const svg = `<svg width="${size}" height="${height}" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 16.2 26.4 17.1 27.15a1.5 1.5 0 0 0 1.8 0C19.8 44.4 36 30.6 36 18 36 8.06 27.94 0 18 0Z" fill="${color}"/>
    <circle cx="18" cy="17" r="10" fill="white" fill-opacity="0.95"/>
    <circle cx="18" cy="17" r="4.5" fill="${color}"/>
  </svg>`

  return L.divIcon({
    html: active
      ? `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:56px;height:56px;border-radius:50%;background:${color};opacity:0.15;animation:coexist-ping 1.5s ease-out infinite;top:-3px;left:-4px;"></div>
          ${svg}
        </div>`
      : svg,
    className: 'coexist-map-pin',
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
  })
}

/* ------------------------------------------------------------------ */
/*  Injected CSS                                                       */
/* ------------------------------------------------------------------ */

const MAP_STYLE_ID = 'coexist-fullmap-styles'

function injectMapStyles() {
  if (document.getElementById(MAP_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = MAP_STYLE_ID
  style.textContent = `
    .coexist-map-pin { background: none !important; border: none !important; }

    @keyframes coexist-ping {
      0% { transform: scale(0.8); opacity: 0.25; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .coexist-fullmap .leaflet-control-zoom {
      border: none !important;
      border-radius: 16px !important;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1) !important;
    }
    .coexist-fullmap .leaflet-control-zoom a {
      border-radius: 0 !important;
      width: 40px !important;
      height: 40px !important;
      line-height: 40px !important;
      font-size: 18px !important;
      color: #3d4d33 !important;
      border-bottom: 1px solid #e8eddf !important;
    }
    .coexist-fullmap .leaflet-control-zoom a:last-child { border-bottom: none !important; }
    .coexist-fullmap .leaflet-control-zoom a:hover { background: #f5f7f0 !important; }
    .coexist-fullmap .leaflet-control-attribution {
      background: rgba(255,255,255,0.7) !important;
      font-size: 10px !important;
      padding: 2px 6px !important;
      border-radius: 6px 0 0 0 !important;
    }

    /* Soften the tile layer with an overlay */
    .coexist-fullmap .leaflet-tile-pane {
      filter: saturate(0.3) brightness(1.05);
    }
    .coexist-fullmap .leaflet-tile-pane::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(135, 158, 98, 0.08);
      pointer-events: none;
      z-index: 1;
    }
  `
  document.head.appendChild(style)
}

/* ------------------------------------------------------------------ */
/*  Map tile — CartoDB Positron (clean, white ocean, minimal labels)   */
/* ------------------------------------------------------------------ */

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AUS_CENTER: L.LatLngExpression = [-28.5, 134.5]
const AUS_ZOOM = 4

const springSheet = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 34,
  mass: 0.8,
}

export default function MapPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  const [selected, setSelected] = useState<Collective | null>(null)
  const [mapReady, setMapReady] = useState(false)

  /* ---------- Initialize Leaflet map ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    injectMapStyles()

    const map = L.map(containerRef.current, {
      center: AUS_CENTER,
      zoom: AUS_ZOOM,
      zoomControl: true,
      attributionControl: true,
      // @ts-expect-error tap is valid Leaflet option
      tap: true,
    })

    // Position zoom control on the right, above the sheet area
    map.zoomControl.setPosition('topright')

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map)

    // Colour overlay — tints the entire map background with brand green
    const overlay = L.DomUtil.create('div')
    overlay.style.cssText = `
      position: absolute; inset: 0; z-index: 199;
      background: rgba(135, 158, 98, 0.06);
      pointer-events: none;
    `
    map.getContainer().appendChild(overlay)

    mapRef.current = map

    // Slight delay to let tiles load
    requestAnimationFrame(() => {
      map.invalidateSize()
      setMapReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  /* ---------- Add markers ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Clear old
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current.clear()

    for (const c of COLLECTIVES) {
      const icon = createCollectiveIcon(false)
      const marker = L.marker([c.lat, c.lng], { icon })

      marker.on('click', () => {
        setSelected(c)
        map.flyTo([c.lat, c.lng], 10, {
          duration: shouldReduceMotion ? 0.3 : 1.2,
          easeLinearity: 0.4,
        })
        // Update all icons
        markersRef.current.forEach((m, id) => {
          m.setIcon(createCollectiveIcon(id === c.id))
        })
      })

      marker.addTo(map)
      markersRef.current.set(c.id, marker)
    }
  }, [mapReady, shouldReduceMotion])

  /* ---------- Close card ---------- */
  const handleClose = useCallback(() => {
    setSelected(null)
    const map = mapRef.current
    if (!map) return

    // Reset all icons to default
    markersRef.current.forEach((m) => {
      m.setIcon(createCollectiveIcon(false))
    })

    // Zoom back out to full Australia
    map.flyTo(AUS_CENTER, AUS_ZOOM, {
      duration: shouldReduceMotion ? 0.3 : 1.0,
      easeLinearity: 0.4,
    })
  }, [shouldReduceMotion])

  /* ---------- Tap map background to deselect ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handler = () => {
      if (selected) handleClose()
    }
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [selected, handleClose])

  /* ---------- Total members ---------- */
  const totalMembers = useMemo(
    () => COLLECTIVES.reduce((sum, c) => sum + c.members, 0),
    [],
  )

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-primary-50">
      {/* ---- Top bar ---- */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-[500]',
          'pt-[var(--safe-top,0px)]',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 backdrop-blur-md px-4 py-2.5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-400">
              <MapPin size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary-700">
                {COLLECTIVES.length} Collectives
              </p>
              <p className="text-xs text-secondary-500">
                {totalMembers.toLocaleString()} members across Australia
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-md shadow-sm"
            aria-label="Go back"
          >
            <X size={18} className="text-secondary-700" />
          </button>
        </div>
      </div>

      {/* ---- Full-screen map ---- */}
      <div
        ref={containerRef}
        className="coexist-fullmap absolute inset-0"
        style={{ zIndex: 0 }}
      />

      {/* ---- Map loading state ---- */}
      <AnimatePresence>
        {!mapReady && (
          <motion.div
            className="absolute inset-0 z-[400] flex items-center justify-center bg-primary-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-3 border-primary-200 border-t-primary-500 animate-spin" />
              <p className="text-sm font-medium text-primary-600">Loading map...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Collective card (bottom sheet style) ---- */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            className={cn(
              'absolute bottom-0 left-0 right-0 z-[500]',
              'pb-[calc(var(--safe-bottom,0px)+1rem)]',
              'px-4',
            )}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : springSheet}
          >
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg shadow-primary-900/10">
              {/* Green accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300" />

              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-secondary-800 leading-snug">
                      {selected.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-secondary-500">
                      <Navigation size={13} />
                      <span>{selected.location}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClose()
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-secondary-500"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Description */}
                <p className="mt-3 text-sm leading-relaxed text-secondary-600">
                  {selected.description}
                </p>

                {/* Stats row */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50">
                      <Users size={14} className="text-primary-600" />
                    </div>
                    <span className="font-semibold text-secondary-700">{selected.members}</span>
                    <span className="text-secondary-400">members</span>
                  </div>
                  {selected.nextEvent && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50">
                        <TreePine size={14} className="text-primary-600" />
                      </div>
                      <span className="text-secondary-500">{selected.nextEvent}</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate(`/collectives/${selected.id}`)}
                  className={cn(
                    'mt-4 flex w-full items-center justify-center gap-2',
                    'rounded-2xl bg-primary-400 px-5 py-3.5',
                    'text-sm font-semibold text-white',
                    'active:scale-[0.98] transition-transform duration-150',
                  )}
                >
                  View Collective
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Floating list of collectives (scrollable chips at bottom when nothing selected) ---- */}
      <AnimatePresence>
        {!selected && mapReady && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 z-[500]',
              'pb-[calc(var(--safe-bottom,0px)+1rem)]',
              'px-3',
            )}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div
              className={cn(
                'flex gap-2 overflow-x-auto scrollbar-hide',
                'pb-1 pt-1',
                // Fade edges
                '[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]',
              )}
            >
              {COLLECTIVES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c)
                    mapRef.current?.flyTo([c.lat, c.lng], 10, {
                      duration: shouldReduceMotion ? 0.3 : 1.2,
                      easeLinearity: 0.4,
                    })
                    markersRef.current.forEach((m, id) => {
                      m.setIcon(createCollectiveIcon(id === c.id))
                    })
                  }}
                  className={cn(
                    'shrink-0 flex items-center gap-2',
                    'rounded-2xl bg-white/95 backdrop-blur-sm',
                    'px-4 py-2.5 shadow-sm',
                    'text-sm font-medium text-secondary-700',
                    'active:scale-[0.97] transition-transform duration-150',
                    'border border-primary-100',
                  )}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-400" />
                  {c.name.replace(' Collective', '')}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

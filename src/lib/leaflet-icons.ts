import L from 'leaflet'

/**
 * Creates a Leaflet DivIcon using the Co-Exist branded MapPin SVG.
 * Variant controls the fill color to match map-pin.tsx.
 */
type PinVariant = 'default' | 'event' | 'collective'

const VARIANT_COLORS: Record<PinVariant, string> = {
  default: '#4a7c59',
  event: '#e67e22',
  collective: '#8b6f47',
}

function pinSvg(fillColor: string): string {
  return `<svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 16.2 26.4 17.1 27.15a1.5 1.5 0 0 0 1.8 0C19.8 44.4 36 30.6 36 18 36 8.06 27.94 0 18 0Z" fill="${fillColor}"/>
    <circle cx="18" cy="17" r="10" fill="white" fill-opacity="0.9"/>
    <circle cx="18" cy="17" r="4" fill="${fillColor}"/>
  </svg>`
}

export function createPinIcon(variant: PinVariant = 'default'): L.DivIcon {
  const color = VARIANT_COLORS[variant]
  return L.divIcon({
    html: pinSvg(color),
    className: 'coexist-map-pin',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  })
}

/** Cluster icon matching Co-Exist brand */
export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 40 : count < 50 ? 48 : 56
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      background:#4a7c59;color:white;
      border-radius:50%;border:3px solid white;
      font-size:${count < 10 ? 14 : 12}px;font-weight:600;
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
    ">${count}</div>`,
    className: 'coexist-cluster-icon',
    iconSize: [size, size],
  })
}

import type { MapCenter } from '@/components/map-view'

/**
 * Parse a PostGIS location_point (unknown) into { lat, lng }.
 * Handles GeoJSON Point objects, WKT strings, and plain {lat,lng} objects.
 * Returns null if unparseable.
 */
export function parseLocationPoint(point: unknown): MapCenter | null {
  if (!point) return null

  // GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
  if (
    typeof point === 'object' &&
    point !== null &&
    'type' in point &&
    (point as { type: string }).type === 'Point' &&
    'coordinates' in point
  ) {
    const coords = (point as { coordinates: number[] }).coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lat: coords[1], lng: coords[0] }
    }
  }

  // Plain object with lat/lng
  if (
    typeof point === 'object' &&
    point !== null &&
    'lat' in point &&
    'lng' in point
  ) {
    const p = point as { lat: number; lng: number }
    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      return p
    }
  }

  // WKT: "POINT(lng lat)" or "SRID=4326;POINT(lng lat)"
  if (typeof point === 'string') {
    const match = point.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
    if (match) {
      return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) }
    }
  }

  return null
}

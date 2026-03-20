import { describe, it, expect } from 'vitest'
import { parseLocationPoint } from '@/lib/geo'

describe('parseLocationPoint', () => {
  it('returns null for falsy input', () => {
    expect(parseLocationPoint(null)).toBeNull()
    expect(parseLocationPoint(undefined)).toBeNull()
    expect(parseLocationPoint('')).toBeNull()
    expect(parseLocationPoint(0)).toBeNull()
  })

  it('parses GeoJSON Point', () => {
    const point = { type: 'Point', coordinates: [153.0251, -28.6432] }
    expect(parseLocationPoint(point)).toEqual({ lat: -28.6432, lng: 153.0251 })
  })

  it('returns null for GeoJSON Point with insufficient coordinates', () => {
    const point = { type: 'Point', coordinates: [153.0251] }
    expect(parseLocationPoint(point)).toBeNull()
  })

  it('parses plain {lat, lng} object', () => {
    const point = { lat: -33.8688, lng: 151.2093 }
    expect(parseLocationPoint(point)).toEqual({ lat: -33.8688, lng: 151.2093 })
  })

  it('returns null for plain object with non-numeric lat/lng', () => {
    const point = { lat: 'abc', lng: 'def' }
    expect(parseLocationPoint(point)).toBeNull()
  })

  it('parses WKT POINT string', () => {
    expect(parseLocationPoint('POINT(153.0251 -28.6432)')).toEqual({
      lat: -28.6432,
      lng: 153.0251,
    })
  })

  it('parses WKT with SRID prefix', () => {
    expect(parseLocationPoint('SRID=4326;POINT(151.2093 -33.8688)')).toEqual({
      lat: -33.8688,
      lng: 151.2093,
    })
  })

  it('returns null for unrecognized string', () => {
    expect(parseLocationPoint('not a point')).toBeNull()
  })

  it('returns null for unrecognized object types', () => {
    expect(parseLocationPoint({ type: 'LineString', coordinates: [[0, 0]] })).toBeNull()
    expect(parseLocationPoint({ foo: 'bar' })).toBeNull()
    expect(parseLocationPoint(42)).toBeNull()
  })
})

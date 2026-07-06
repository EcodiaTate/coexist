import { describe, it, expect } from 'vitest'
import { geocodePrecisionRank, type GeocodePrecisionInput } from '@/lib/geo'

/**
 * Regression coverage for "the event create/edit map generalises the location
 * to the suburb instead of the exact pin". Root cause: Nominatim returns the
 * suburb / city centroid mixed in with (and sometimes ahead of) the exact
 * address, and both the autocomplete picker and the type-to-move-pin forward
 * geocode took whichever came first - landing the pin on the locality centre.
 * geocodePrecisionRank lets both surfaces prefer the precise match.
 */

// Real-ish Nominatim shapes for the query "Prospect Lane, Geelong".
const house: GeocodePrecisionInput = {
  place_rank: 30,
  addresstype: 'building',
  address: { house_number: '12', road: 'Prospect Lane' },
}
const street: GeocodePrecisionInput = {
  place_rank: 26,
  addresstype: 'road',
  address: { road: 'Prospect Lane' },
}
const suburb: GeocodePrecisionInput = {
  place_rank: 19,
  addresstype: 'suburb',
  address: {},
}
const city: GeocodePrecisionInput = { place_rank: 16, addresstype: 'city', address: {} }
const state: GeocodePrecisionInput = { place_rank: 8, addresstype: 'state', address: {} }

describe('geocodePrecisionRank ordering', () => {
  it('ranks exact address above street above suburb above city above state', () => {
    expect(geocodePrecisionRank(house)).toBeGreaterThan(geocodePrecisionRank(street))
    expect(geocodePrecisionRank(street)).toBeGreaterThan(geocodePrecisionRank(suburb))
    expect(geocodePrecisionRank(suburb)).toBeGreaterThan(geocodePrecisionRank(city))
    expect(geocodePrecisionRank(city)).toBeGreaterThan(geocodePrecisionRank(state))
  })

  it('picks the precise match when the suburb centroid is listed first (the bug)', () => {
    // Nominatim relevance order put the suburb first; precision picks the house.
    const results = [suburb, city, street, house]
    const best = results.reduce((b, c) =>
      geocodePrecisionRank(c) > geocodePrecisionRank(b) ? c : b,
    )
    expect(best).toBe(house)
  })

  it('sorting a dropdown surfaces the exact address first', () => {
    const results = [state, suburb, house, city, street]
    const sorted = [...results].sort((a, b) => geocodePrecisionRank(b) - geocodePrecisionRank(a))
    expect(sorted[0]).toBe(house)
    expect(sorted[1]).toBe(street)
  })

  it('falls back to addresstype when place_rank is absent', () => {
    const noRankBuilding: GeocodePrecisionInput = { addresstype: 'building', address: { house_number: '5' } }
    const noRankSuburb: GeocodePrecisionInput = { addresstype: 'suburb', address: {} }
    expect(geocodePrecisionRank(noRankBuilding)).toBeGreaterThan(geocodePrecisionRank(noRankSuburb))
  })
})

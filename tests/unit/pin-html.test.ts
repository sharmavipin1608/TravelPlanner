import { describe, it, expect } from 'vitest'
import { mapPlaceType } from '@/lib/google-maps/place-type-map'
import { pinHTML } from '@/lib/google-maps/pin-html'
import { clusterHTML } from '@/lib/google-maps/cluster-html'
import type { Item } from '@/types'

const mockItem: Item = {
  id: '1', user_id: 'u1', name: 'Test', category: 'restaurant',
  google_place_types: ['restaurant'], destination: 'Tokyo, Japan',
  lat: 35.69, lng: 139.69, google_place_id: null, notes: null,
  metadata: {}, status: 'wishlist', created_at: new Date().toISOString(),
}

describe('mapPlaceType', () => {
  it('maps cafe to restaurant', () => {
    expect(mapPlaceType(['cafe', 'food', 'establishment'])).toBe('restaurant')
  })
  it('maps lodging to accommodation', () => {
    expect(mapPlaceType(['lodging'])).toBe('accommodation')
  })
  it('maps museum to place', () => {
    expect(mapPlaceType(['museum', 'tourist_attraction'])).toBe('place')
  })
  it('maps gym to activity', () => {
    expect(mapPlaceType(['gym'])).toBe('activity')
  })
  it('returns null for unrecognized types', () => {
    expect(mapPlaceType(['point_of_interest', 'establishment'])).toBeNull()
  })
  it('returns null for empty array', () => {
    expect(mapPlaceType([])).toBeNull()
  })
})

describe('pinHTML', () => {
  it('teardrop contains new crimson color for restaurant', () => {
    const html = pinHTML(mockItem, 'teardrop', false, false)
    expect(html).toContain('oklch(0.58 0.20 5)')
  })
  it('dimmed pin has opacity 0.25', () => {
    const html = pinHTML(mockItem, 'dot', false, true)
    expect(html).toContain('opacity: 0.25')
  })
  it('selected pin has drop-shadow', () => {
    const html = pinHTML(mockItem, 'ring', true, false)
    expect(html).toContain('drop-shadow')
  })
  it('inTrip pin has indigo drop-shadow', () => {
    const html = pinHTML(mockItem, 'teardrop', false, false, true)
    expect(html).toContain('oklch(0.55 0.18 280)')
  })
  it('null category pin does not throw', () => {
    const nullCatItem = { ...mockItem, category: null }
    expect(() => pinHTML(nullCatItem as Item, 'teardrop', false, false)).not.toThrow()
  })
})

describe('clusterHTML', () => {
  it('contains uppercase city name', () => {
    const html = clusterHTML('Tokyo, Japan', 5, ['restaurant', 'place'], false)
    expect(html).toContain('TOKYO')
  })
  it('dimmed cluster has opacity 0.25', () => {
    const html = clusterHTML('Paris, France', 3, ['restaurant'], true)
    expect(html).toContain('opacity: 0.25')
  })
  it('renders one SVG path per category', () => {
    const html = clusterHTML('Rome, Italy', 4, ['restaurant', 'place', 'accommodation'], false)
    const pathCount = (html.match(/<path d="M 0 0/g) ?? []).length
    expect(pathCount).toBe(3)
  })
})

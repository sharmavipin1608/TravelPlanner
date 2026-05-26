import { describe, it, expect } from 'vitest'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'
import { CITY_BBOX } from '@/lib/google-maps/city-bbox'

describe('CATEGORY_META', () => {
  it('has exactly 4 categories', () => {
    expect(Object.keys(CATEGORY_META)).toHaveLength(4)
  })

  it('restaurant has hue 5 (crimson) and glyph fork', () => {
    expect(CATEGORY_META.restaurant.hue).toBe(5)
    expect(CATEGORY_META.restaurant.glyph).toBe('fork')
  })

  it('all categories have label, hue, and glyph', () => {
    for (const meta of Object.values(CATEGORY_META)) {
      expect(meta.label).toBeTruthy()
      expect(typeof meta.hue).toBe('number')
      expect(meta.glyph).toBeTruthy()
    }
  })
})

describe('CITY_BBOX', () => {
  it('has at least 10 cities', () => {
    expect(Object.keys(CITY_BBOX).length).toBeGreaterThanOrEqual(10)
  })

  it('Tokyo, Japan entry exists with correct shape', () => {
    const tokyo = CITY_BBOX['Tokyo, Japan']
    expect(tokyo).toBeDefined()
    expect(tokyo.center).toHaveLength(2)
    expect(tokyo.minLat).toBeLessThan(tokyo.maxLat)
    expect(tokyo.minLng).toBeLessThan(tokyo.maxLng)
  })

  it('all entries have valid bbox (min < max)', () => {
    for (const [city, bbox] of Object.entries(CITY_BBOX)) {
      expect(bbox.minLat, `${city} minLat`).toBeLessThan(bbox.maxLat)
      expect(bbox.minLng, `${city} minLng`).toBeLessThan(bbox.maxLng)
    }
  })
})

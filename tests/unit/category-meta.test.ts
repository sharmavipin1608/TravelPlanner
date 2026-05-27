import { describe, it, expect } from 'vitest'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'

describe('CATEGORY_META color field', () => {
  it('restaurant color is crimson oklch(0.58 0.20 5)', () => {
    expect(CATEGORY_META.restaurant.color).toBe('oklch(0.58 0.20 5)')
  })
  it('place color is amber oklch(0.65 0.15 45)', () => {
    expect(CATEGORY_META.place.color).toBe('oklch(0.65 0.15 45)')
  })
  it('accommodation color unchanged', () => {
    expect(CATEGORY_META.accommodation.color).toBe('oklch(0.62 0.16 216)')
  })
  it('activity color unchanged', () => {
    expect(CATEGORY_META.activity.color).toBe('oklch(0.62 0.16 152)')
  })
  it('place hue is 45 (amber, was 36)', () => {
    expect(CATEGORY_META.place.hue).toBe(45)
  })
  it('all categories have a color field', () => {
    for (const meta of Object.values(CATEGORY_META)) {
      expect(meta.color).toMatch(/^oklch/)
    }
  })
})

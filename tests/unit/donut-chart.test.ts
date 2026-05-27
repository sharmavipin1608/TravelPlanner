import { describe, it, expect } from 'vitest'

describe('SVG donut segment math', () => {
  it('computes correct dash and offset for known inputs', () => {
    const C = 2 * Math.PI * 30
    const total = 3
    const cats = ['restaurant', 'place', 'accommodation', 'activity'] as const
    const counts = { restaurant: 2, place: 1, accommodation: 0, activity: 0 }

    let offset = 0
    const segments = cats
      .filter((c) => counts[c] > 0)
      .map((c) => {
        const proportion = counts[c] / total
        const dash = proportion * C
        const seg = { c, dash, offset }
        offset += dash
        return seg
      })

    expect(segments).toHaveLength(2)
    expect(segments[0].c).toBe('restaurant')
    expect(segments[0].dash).toBeCloseTo(C * 2 / 3, 3)
    expect(segments[0].offset).toBe(0)
    expect(segments[1].c).toBe('place')
    expect(segments[1].dash).toBeCloseTo(C * 1 / 3, 3)
    expect(segments[1].offset).toBeCloseTo(C * 2 / 3, 3)
  })

  it('returns empty segments when there are no items', () => {
    const C = 2 * Math.PI * 30
    const total = 0
    const cats = ['restaurant', 'place', 'accommodation', 'activity'] as const
    const counts = { restaurant: 0, place: 0, accommodation: 0, activity: 0 }

    let offset = 0
    const segments = cats
      .filter((c) => counts[c] > 0)
      .map((c) => {
        const proportion = total > 0 ? counts[c] / total : 0
        const dash = proportion * C
        const seg = { c, dash, offset }
        offset += dash
        return seg
      })

    expect(segments).toHaveLength(0)
  })

  it('computes a single segment that fills the full circumference', () => {
    const C = 2 * Math.PI * 30
    const total = 5
    const cats = ['restaurant', 'place', 'accommodation', 'activity'] as const
    const counts = { restaurant: 5, place: 0, accommodation: 0, activity: 0 }

    let offset = 0
    const segments = cats
      .filter((c) => counts[c] > 0)
      .map((c) => {
        const proportion = counts[c] / total
        const dash = proportion * C
        const seg = { c, dash, offset }
        offset += dash
        return seg
      })

    expect(segments).toHaveLength(1)
    expect(segments[0].c).toBe('restaurant')
    expect(segments[0].dash).toBeCloseTo(C, 3)
    expect(segments[0].offset).toBe(0)
  })

  it('computes four equal segments for balanced inputs', () => {
    const C = 2 * Math.PI * 30
    const total = 4
    const cats = ['restaurant', 'place', 'accommodation', 'activity'] as const
    const counts = { restaurant: 1, place: 1, accommodation: 1, activity: 1 }

    let offset = 0
    const segments = cats
      .filter((c) => counts[c] > 0)
      .map((c) => {
        const proportion = counts[c] / total
        const dash = proportion * C
        const seg = { c, dash, offset }
        offset += dash
        return seg
      })

    expect(segments).toHaveLength(4)
    const quarter = C / 4
    segments.forEach((seg, i) => {
      expect(seg.dash).toBeCloseTo(quarter, 3)
      expect(seg.offset).toBeCloseTo(quarter * i, 3)
    })
    // cumulative offsets cover the full circumference
    expect(segments[segments.length - 1].offset + segments[segments.length - 1].dash).toBeCloseTo(C, 3)
  })
})

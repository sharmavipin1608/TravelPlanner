import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTrip } from '@/hooks/use-trip'
import type { Trip } from '@/types'

// Mock fetch globally so activateTrip hydration calls don't throw
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  }))
})

const noTrips: Trip[] = []

const sampleTrips: Trip[] = [
  {
    id: 'trip-1',
    user_id: 'user-1',
    name: 'Tokyo 2026',
    destination: 'Tokyo, Japan',
    start_date: '2026-09-01',
    end_date: '2026-09-14',
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('useTrip — tripItemIds exposure', () => {
  it('tripItemIds is an empty Set when initialized with no trips', () => {
    const { result } = renderHook(() => useTrip(noTrips))
    expect(result.current.tripItemIds).toBeInstanceOf(Set)
    expect(result.current.tripItemIds.size).toBe(0)
  })

  it('tripItemIds is an empty Set when initialized with trips but no active trip', () => {
    const { result } = renderHook(() => useTrip(sampleTrips))
    expect(result.current.tripItemIds).toBeInstanceOf(Set)
    expect(result.current.tripItemIds.size).toBe(0)
  })

  it('tripItemIds is a Set (not an Array or other type)', () => {
    const { result } = renderHook(() => useTrip(noTrips))
    expect(result.current.tripItemIds).toBeInstanceOf(Set)
    expect(Array.isArray(result.current.tripItemIds)).toBe(false)
  })

  it('isInTrip returns false for any item when no trip is active', () => {
    const { result } = renderHook(() => useTrip(noTrips))
    const fakeItem = {
      id: 'item-abc',
      user_id: 'user-1',
      name: 'Senso-ji Temple',
      category: null,
      google_place_types: null,
      destination: null,
      lat: null,
      lng: null,
      google_place_id: null,
      notes: null,
      metadata: {},
      status: 'wishlist' as const,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(result.current.isInTrip(fakeItem)).toBe(false)
  })

  it('isInTrip returns false for a different item id when no trip is active', () => {
    const { result } = renderHook(() => useTrip(sampleTrips))
    const anotherItem = {
      id: 'item-xyz',
      user_id: 'user-1',
      name: 'Shibuya Crossing',
      category: null,
      google_place_types: null,
      destination: null,
      lat: null,
      lng: null,
      google_place_id: null,
      notes: null,
      metadata: {},
      status: 'planned' as const,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(result.current.isInTrip(anotherItem)).toBe(false)
  })

  it('tripItemCount is 0 when no trip is active', () => {
    const { result } = renderHook(() => useTrip(noTrips))
    expect(result.current.tripItemCount).toBe(0)
  })
})

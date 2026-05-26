'use client'

import { useState, useCallback } from 'react'
import type { Item, Trip } from '@/types'

export function useTrip(trips: Trip[]) {
  const [activeTripId, setActiveTripId] = useState<string | null>(null)

  const activeTrip = trips.find((t) => t.id === activeTripId) ?? null

  const [tripItemIds, setTripItemIds] = useState<Set<string>>(new Set())

  const isInTrip = useCallback(
    (item: Item) => tripItemIds.has(item.id),
    [tripItemIds]
  )

  const toggleItemInTrip = useCallback(
    async (item: Item): Promise<{ success: boolean; nowInTrip: boolean }> => {
      if (!activeTripId) return { success: false, nowInTrip: false }
      const inTrip = tripItemIds.has(item.id)
      const method = inTrip ? 'DELETE' : 'POST'

      try {
        const res = await fetch('/api/trip-items', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: activeTripId, item_id: item.id }),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({})) as { error?: { message?: string } }
          console.error('trip-items error:', json.error?.message ?? res.status)
          return { success: false, nowInTrip: inTrip }
        }

        setTripItemIds((prev) => {
          const next = new Set(prev)
          inTrip ? next.delete(item.id) : next.add(item.id)
          return next
        })
        return { success: true, nowInTrip: !inTrip }
      } catch {
        return { success: false, nowInTrip: inTrip }
      }
    },
    [activeTripId, tripItemIds]
  )

  const activateTrip = useCallback((id: string | null) => {
    setActiveTripId(id)
    setTripItemIds(new Set())
  }, [])

  return {
    activeTripId,
    activeTrip,
    isInTrip,
    toggleItemInTrip,
    activateTrip,
    tripItemCount: tripItemIds.size,
  }
}

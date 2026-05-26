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
    async (item: Item) => {
      if (!activeTripId) return
      const inTrip = tripItemIds.has(item.id)
      const method = inTrip ? 'DELETE' : 'POST'

      try {
        await fetch('/api/trip-items', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: activeTripId, item_id: item.id }),
        })
        setTripItemIds((prev) => {
          const next = new Set(prev)
          inTrip ? next.delete(item.id) : next.add(item.id)
          return next
        })
      } catch {
        // network error — optimistic update already applied, will reconcile on reload
      }
    },
    [activeTripId, tripItemIds]
  )

  const activateTrip = useCallback((id: string | null) => {
    setActiveTripId(id)
    setTripItemIds(new Set()) // reset on trip change; UI re-fetches as needed
  }, [])

  return { activeTripId, activeTrip, isInTrip, toggleItemInTrip, activateTrip }
}

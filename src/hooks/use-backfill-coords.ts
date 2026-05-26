'use client'

import { useEffect } from 'react'
import type { Item } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGoogleMaps(): any {
  return (window as { google?: { maps?: unknown } }).google?.maps
}

export function useBackfillCoords(items: Item[], onUpdated: (updated: Item) => void) {
  useEffect(() => {
    const toBackfill = items.filter(
      (i) => i.lat == null && i.lng == null && i.google_place_id
    )
    if (toBackfill.length === 0) return

    const maps = getGoogleMaps()
    if (!maps) return

    let cancelled = false

    const run = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let PlacesServiceCtor: any
      try {
        if (typeof maps.importLibrary === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lib = await maps.importLibrary('places') as any
          PlacesServiceCtor = lib?.PlacesService
        }
      } catch { /* fall through */ }
      if (!PlacesServiceCtor) PlacesServiceCtor = maps?.places?.PlacesService
      if (!PlacesServiceCtor || cancelled) return

      const attrDiv = document.createElement('div')
      const svc = new PlacesServiceCtor(attrDiv)

      for (const item of toBackfill) {
        if (cancelled) break
        await new Promise<void>((resolve) => {
          svc.getDetails(
            { placeId: item.google_place_id!, fields: ['geometry'] },
            async (
              result: { geometry?: { location?: { lat: () => number; lng: () => number } } } | null,
              status: string
            ) => {
              if (status === 'OK' && result?.geometry?.location) {
                const lat = result.geometry.location.lat()
                const lng = result.geometry.location.lng()
                try {
                  const res = await fetch('/api/items', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.id, lat, lng }),
                  })
                  const json = await res.json()
                  if (json.data && !cancelled) {
                    onUpdated(json.data as Item)
                  }
                } catch { /* silent */ }
              }
              resolve()
            }
          )
        })
        // Small delay between requests to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    run()
    return () => { cancelled = true }
  // Re-run when items change (new null-coord items might be added)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])
}

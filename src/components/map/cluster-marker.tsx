'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import type { Item, Category } from '@/types'
import { clusterHTML } from '@/lib/google-maps/cluster-html'
import { CITY_BBOX } from '@/lib/google-maps/city-bbox'

interface ClusterMarkerProps {
  dest: string
  items: Item[]
  dimmed: boolean
  onClick: () => void
}

interface LatLng { lat: number; lng: number }

function getStaticPosition(dest: string, items: Item[]): LatLng | null {
  const bbox = CITY_BBOX[dest]
  if (bbox) return { lat: bbox.center[1], lng: bbox.center[0] }
  const valid = items.filter((i) => i.lat != null && i.lng != null)
  if (valid.length === 0) return null
  return {
    lat: valid.reduce((s, i) => s + i.lat!, 0) / valid.length,
    lng: valid.reduce((s, i) => s + i.lng!, 0) / valid.length,
  }
}

export function ClusterMarker({ dest, items, dimmed, onClick }: ClusterMarkerProps) {
  const [geocoded, setGeocoded] = useState<LatLng | null>(null)
  const map = useMap()

  const staticPos = getStaticPosition(dest, items)
  const position = staticPos ?? geocoded

  // Geocode the destination when no static position is available.
  // Depends on `map` so it re-runs once the Maps API is ready (not just on dest change).
  useEffect(() => {
    if (staticPos || !map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = (window as any).google?.maps
    if (!maps) return

    const run = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let GeocoderCtor: any
        if (typeof maps.importLibrary === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lib = await maps.importLibrary('geocoding') as any
          GeocoderCtor = lib?.Geocoder
        }
        if (!GeocoderCtor) GeocoderCtor = maps?.Geocoder
        if (!GeocoderCtor) return

        const geocoder = new GeocoderCtor()
        geocoder.geocode({ address: dest }, (
          results: Array<{ geometry: { location: { lat: () => number; lng: () => number } } }>,
          status: string
        ) => {
          if (status === 'OK' && results?.[0]) {
            setGeocoded({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            })
          }
        })
      } catch { /* silent */ }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, map])

  const cats: Category[] = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is Category => c != null))
  )

  // Ref callback instead of useRef+useEffect: fires on the div's actual mount, not on a dep
  // change. AdvancedMarker creates its portal container in a useEffect (async), so the div only
  // appears on the second render after geocoding completes — by which point the old useEffect
  // deps were unchanged and would not re-run.
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.innerHTML = clusterHTML(dest, items.length, cats, dimmed)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, items.length, dimmed, cats.join(',')])

  if (!position) return null

  return (
    <AdvancedMarker
      position={position}
      onClick={onClick}
    >
      <div ref={contentRef} />
    </AdvancedMarker>
  )
}

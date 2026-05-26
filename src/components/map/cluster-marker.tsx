'use client'

import { useRef, useEffect } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Item, Category } from '@/types'
import { clusterHTML } from '@/lib/google-maps/cluster-html'
import { CITY_BBOX } from '@/lib/google-maps/city-bbox'

interface ClusterMarkerProps {
  dest: string
  items: Item[]
  dimmed: boolean
  onClick: () => void
}

export function ClusterMarker({ dest, items, dimmed, onClick }: ClusterMarkerProps) {
  const divRef = useRef<HTMLDivElement>(null)

  const bbox = CITY_BBOX[dest]
  let lat: number
  let lng: number

  if (bbox) {
    // CITY_BBOX center is [lng, lat]
    lng = bbox.center[0]
    lat = bbox.center[1]
  } else {
    const validItems = items.filter((i) => i.lat != null && i.lng != null)
    if (validItems.length === 0) return null
    lat = validItems.reduce((sum, i) => sum + i.lat!, 0) / validItems.length
    lng = validItems.reduce((sum, i) => sum + i.lng!, 0) / validItems.length
  }

  const cats: Category[] = Array.from(
    new Set(items.map((i) => i.category).filter((c): c is Category => c != null))
  )

  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = clusterHTML(dest, items.length, cats, dimmed)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, items.length, dimmed, cats.join(',')])

  return (
    <AdvancedMarker
      position={{ lat, lng }}
      onClick={onClick}
    >
      <div ref={divRef} />
    </AdvancedMarker>
  )
}

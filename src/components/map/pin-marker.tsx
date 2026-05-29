'use client'

import { useCallback } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Item } from '@/types'
import type { PinStyle } from '@/lib/google-maps/pin-html'
import { pinHTML } from '@/lib/google-maps/pin-html'

interface PinMarkerProps {
  item: Item
  style: PinStyle
  selected: boolean
  dimmed: boolean
  inTrip?: boolean
  onClick: () => void
}

export function PinMarker({ item, style, selected, dimmed, inTrip, onClick }: PinMarkerProps) {
  // Ref callback instead of useRef+useEffect: AdvancedMarker creates its portal
  // container in a useEffect (async), so the div only mounts on the second render.
  // A plain useEffect with unchanged deps would not re-run at that point.
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.innerHTML = pinHTML(item, style, selected, dimmed, inTrip ?? false)
    }
  }, [item, style, selected, dimmed, inTrip])

  if (item.lat == null || item.lng == null) return null

  return (
    <AdvancedMarker
      position={{ lat: item.lat, lng: item.lng }}
      zIndex={selected ? 10 : 1}
      onClick={onClick}
    >
      <div ref={contentRef} />
    </AdvancedMarker>
  )
}

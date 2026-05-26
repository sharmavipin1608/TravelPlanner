'use client'

import { useRef, useEffect } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Item } from '@/types'
import type { PinStyle } from '@/lib/google-maps/pin-html'
import { pinHTML } from '@/lib/google-maps/pin-html'

interface PinMarkerProps {
  item: Item
  style: PinStyle
  selected: boolean
  dimmed: boolean
  onClick: () => void
}

export function PinMarker({ item, style, selected, dimmed, onClick }: PinMarkerProps) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = pinHTML(item, style, selected, dimmed)
    }
  }, [item, style, selected, dimmed])

  if (item.lat == null || item.lng == null) return null

  return (
    <AdvancedMarker
      position={{ lat: item.lat, lng: item.lng }}
      zIndex={selected ? 10 : 1}
      onClick={onClick}
    >
      <div ref={divRef} />
    </AdvancedMarker>
  )
}

'use client'

import { useEffect, useMemo } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import type { Item } from '@/types'
import type { Filters } from '@/hooks/use-filters'
import type { Settings } from '@/hooks/use-settings'
import { useMapMode } from '@/hooks/use-map-mode'
import { CITY_BBOX } from '@/lib/google-maps/city-bbox'
import { ClusterMarker } from './cluster-marker'
import { PinMarker } from './pin-marker'
import { MapBar } from './map-bar'
import { ZoomControls } from './zoom-controls'
import { CategoryLegend } from './category-legend'

interface MapViewProps {
  items: Item[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  settings: Settings
  selected: Item | null
  onSelect: (item: Item) => void
  onZoomTo: (dest: string) => void
}

/** Returns true if item matches all active filters (not dimmed). */
function isShown(item: Item, filters: Filters): boolean {
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const matchesName = item.name.toLowerCase().includes(q)
    const matchesNotes = item.notes?.toLowerCase().includes(q) ?? false
    if (!matchesName && !matchesNotes) return false
  }
  if (filters.category !== 'all' && item.category !== filters.category) return false
  if (filters.status !== 'all' && item.status !== filters.status) return false
  return true
}

// Inner component that uses useMap — must be inside APIProvider + Map
function MapInner({
  items,
  filters,
  setFilters,
  settings,
  selected,
  onSelect,
  onZoomTo,
}: MapViewProps) {
  const map = useMap()
  const { mode, destination } = useMapMode(filters)

  // Register global zoom handle after map loads
  useEffect(() => {
    if (!map) return
    ;(window as unknown as { __tpMap?: { zoomIn: () => void; zoomOut: () => void } }).__tpMap = {
      zoomIn: () => map.setZoom((map.getZoom() ?? 2) + 1),
      zoomOut: () => map.setZoom((map.getZoom() ?? 2) - 1),
    }
  }, [map])

  // Fit bounds when destination changes in local mode
  useEffect(() => {
    if (!map || mode !== 'local' || !destination) return

    const bbox = CITY_BBOX[destination]
    if (bbox) {
      map.fitBounds({
        north: bbox.maxLat,
        south: bbox.minLat,
        east: bbox.maxLng,
        west: bbox.minLng,
      })
    } else {
      // Fallback: average items with coordinates
      const localItems = items.filter(
        (i) => i.destination === destination && i.lat != null && i.lng != null
      )
      if (localItems.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const googleMaps = (window as unknown as { google: { maps: any } }).google.maps
        const bounds = new googleMaps.LatLngBounds()
        localItems.forEach((i) => bounds.extend({ lat: i.lat!, lng: i.lng! }))
        map.fitBounds(bounds)
      }
    }
  // destination and mode are the meaningful triggers; map and items refs are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, destination])

  // Group items by destination for world mode
  const destGroups = useMemo(() => {
    const groups: Record<string, Item[]> = {}
    for (const item of items) {
      const key = item.destination ?? '__unknown__'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [items])

  // Items with lat/lng for local mode
  const localItems = useMemo(() => {
    if (mode !== 'local' || !destination) return []
    return items.filter((i) => i.destination === destination && i.lat != null && i.lng != null)
  }, [items, mode, destination])

  const handleBackToWorld = () => {
    setFilters((prev) => ({ ...prev, destination: null }))
  }

  const visibleItemCount = useMemo(() => {
    if (mode === 'world') return items.length
    return localItems.length
  }, [mode, items.length, localItems.length])

  return (
    <>
      {mode === 'world' &&
        Object.entries(destGroups).map(([dest, groupItems]) => {
          if (dest === '__unknown__') return null
          const dimmed = !groupItems.some((i) => isShown(i, filters))
          return (
            <ClusterMarker
              key={dest}
              dest={dest}
              items={groupItems}
              dimmed={dimmed}
              onClick={() => onZoomTo(dest)}
            />
          )
        })}

      {mode === 'local' &&
        localItems.map((item) => (
          <PinMarker
            key={item.id}
            item={item}
            style={settings.pinStyle}
            selected={selected?.id === item.id}
            dimmed={!isShown(item, filters)}
            onClick={() => onSelect(item)}
          />
        ))}

      <MapBar
        mode={mode}
        destination={destination}
        itemCount={visibleItemCount}
        onBackToWorld={handleBackToWorld}
      />
      <ZoomControls />
      <CategoryLegend show={settings.showLegend} />
    </>
  )
}

export function MapView(props: MapViewProps) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''}>
      <Map
        defaultCenter={{ lat: 25, lng: 10 }}
        defaultZoom={2}
        mapId="tp-map"
        disableDefaultUI
        gestureHandling="greedy"
        style={{ width: '100%', height: '100%' }}
      >
        <MapInner {...props} />
      </Map>
    </APIProvider>
  )
}

'use client'

import { useEffect, useMemo, useRef } from 'react'
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
  activeTripId?: string | null
  isInTrip?: (item: Item) => boolean
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
  activeTripId,
  isInTrip,
}: MapViewProps) {
  const map = useMap()
  const { mode, destination } = useMapMode(filters)

  // Register global map handle after map loads
  useEffect(() => {
    if (!map) return
    ;(window as unknown as { __tpMap?: object }).__tpMap = {
      zoomIn:  () => map.setZoom((map.getZoom() ?? 2) + 1),
      zoomOut: () => map.setZoom((map.getZoom() ?? 2) - 1),
      setZoom: (z: number) => map.setZoom(z),
      panTo:     (lat: number, lng: number) => map.panTo({ lat, lng }),
      setCenter: (lat: number, lng: number) => map.setCenter({ lat, lng }),
      fitBounds: (north: number, south: number, east: number, west: number) =>
        map.fitBounds({ north, south, east, west }),
      getZoom: () => map.getZoom(),
      getBoundsDebug: () => {
        const b = map.getBounds()
        if (!b) return null
        const ne = b.getNorthEast(), sw = b.getSouthWest()
        return { neLat: ne.lat(), neLng: ne.lng(), swLat: sw.lat(), swLng: sw.lng() }
      },
      // Test hook: runs the auto-zoom distance logic with explicit coords,
      // bypassing getCenter() which returns stale/wrong values in headless Chrome.
      simulateIdle: (lat: number, lng: number, zoom: number) => {
        if (zoom < 11) return
        const MAX_DEG = 1.5
        const dests = Object.keys(destGroupsRef.current).filter(d => d !== '__unknown__')
        let target: string | null = null
        let bestDist = MAX_DEG
        for (const dest of dests) {
          const bbox = CITY_BBOX[dest]
          if (!bbox) continue
          const [bLng, bLat] = bbox.center
          const dist = Math.hypot(bLat - lat, bLng - lng)
          if (dist < bestDist) { bestDist = dist; target = dest }
        }
        if (!target) return
        setFilters((f) => ({ ...f, destination: target! }))
      },
    }
  }, [map, setFilters])

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

  // Auto-switch to local mode when the user zooms in past city level (~zoom 11)
  const destGroupsRef = useRef(destGroups)
  destGroupsRef.current = destGroups

  useEffect(() => {
    if (!map || filters.destination) return
    // Use 'idle' instead of 'zoom_changed': idle fires after the map has fully
    // settled so getBounds() reflects the actual zoomed viewport (zoom_changed
    // fires before the viewport is updated and getBounds() still returns the old bounds).
    const listener = map.addListener('idle', () => {
      const zoom = map.getZoom() ?? 0
      if (zoom < 11) return
      const center = map.getCenter()
      if (!center) return
      const cLat = center.lat(), cLng = center.lng()
      // Find the destination whose cluster center is closest to the map center.
      // We use degree distance rather than getBounds() because getBounds() can
      // return stale values before the viewport has fully settled.
      // At zoom 11+ we pick the nearest destination within ~1.5 degree radius.
      const MAX_DEG = 1.5
      const dests = Object.keys(destGroupsRef.current).filter(d => d !== '__unknown__')
      let target: string | null = null
      let bestDist = MAX_DEG
      for (const dest of dests) {
        const bbox = CITY_BBOX[dest]
        if (!bbox) continue
        const [lng, lat] = bbox.center
        const dist = Math.hypot(lat - cLat, lng - cLng)
        if (dist < bestDist) { bestDist = dist; target = dest }
      }
      if (!target) return
      setFilters((f) => ({ ...f, destination: target! }))
    })
    return () => { listener.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, filters.destination])

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
        localItems.map((item) => {
          const itemIsSelected = selected?.id === item.id
          const itemInTrip = activeTripId ? (isInTrip?.(item) ?? false) : false
          const dimmed = !itemIsSelected && (
            activeTripId != null
              ? !itemInTrip
              : !isShown(item, filters)
          )
          return (
            <PinMarker
              key={item.id}
              item={item}
              style={settings.pinStyle}
              selected={itemIsSelected}
              dimmed={dimmed}
              inTrip={itemInTrip}
              onClick={() => onSelect(item)}
            />
          )
        })}

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
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''} libraries={['places']}>
      <Map
        defaultCenter={{ lat: 25, lng: 10 }}
        defaultZoom={2}
        minZoom={2}
        mapId="tp-map"
        disableDefaultUI
        gestureHandling="greedy"
        restriction={{
          latLngBounds: { north: 85, south: -85, east: 180, west: -180 },
          strictBounds: true,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <MapInner {...props} />
      </Map>
    </APIProvider>
  )
}

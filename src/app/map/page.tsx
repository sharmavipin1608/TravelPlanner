'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Item, Trip, ScratchpadEntry } from '@/types'
import { useFilters } from '@/hooks/use-filters'
import { useSettings } from '@/hooks/use-settings'
import { useTrip } from '@/hooks/use-trip'
import { useBackfillCoords } from '@/hooks/use-backfill-coords'
import { Sidebar } from '@/components/sidebar/sidebar'
import { MapView } from '@/components/map/map-view'
import { ItemCard } from '@/components/map/item-card'
import { Fab } from '@/components/ui/fab'
import { AddMenu } from '@/components/modals/add-menu'
import { AutocompleteAdd } from '@/components/modals/autocomplete-add'
import { Scratchpad } from '@/components/modals/scratchpad'
import { TripsModal } from '@/components/modals/trips-modal'
import { SettingsModal } from '@/components/modals/settings-modal'
import { DeleteConfirmModal } from '@/components/modals/delete-confirm-modal'

export default function MapPage() {
  const [items, setItems] = useState<Item[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [scratchpadEntries, setScratchpadEntries] = useState<ScratchpadEntry[]>([])
  const [selected, setSelected] = useState<Item | null>(null)
  const [modal, setModal] = useState<'autocomplete' | 'manual' | 'scratchpad' | 'trips' | 'settings' | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)

  const { filters, setFilters } = useFilters()
  const [settings, updateSetting] = useSettings()
  const { activeTripId, activeTrip, isInTrip, toggleItemInTrip, activateTrip, tripItemCount, tripItemIds } = useTrip(trips)

  useBackfillCoords(items, (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  })

  function refreshItems() {
    fetch('/api/items')
      .then((r) => r.json())
      .then((json) => { if (json.data) setItems(json.data) })
      .catch(() => {})
  }

  async function handleDeleteItem() {
    if (!deleteTarget) return
    const res = await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) setSelected(null)
      setDeleteTarget(null)
    }
  }

  async function handleToggleTrip(item: Item) {
    const result = await toggleItemInTrip(item)
    if (result.success) refreshItems()
  }

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((json) => { if (json.data) setItems(json.data) })
      .catch(() => {})

    fetch('/api/trips')
      .then((r) => r.json())
      .then((json) => { if (json.data) setTrips(json.data) })
      .catch(() => {})
  }, [])

  const destinations = useMemo(
    () => [...new Set(items.flatMap((i) => (i.destination ? [i.destination] : [])))],
    [items]
  )

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--paper)' }}>
      <Sidebar
        items={items}
        filters={filters}
        setFilters={setFilters}
        destinations={destinations}
        selected={selected}
        onSelect={setSelected}
        onOpenAdd={() => setModal('autocomplete')}
        onOpenScratchpad={() => setModal('scratchpad')}
        onOpenTrips={() => setModal('trips')}
        onOpenSettings={() => setModal('settings')}
        trips={trips}
        activeTripId={activeTripId}
        tripItemCount={tripItemCount}
        onDeactivateTrip={() => activateTrip(null)}
        scratchpadCount={scratchpadEntries.length}
        isInTrip={isInTrip}
        onDeleteItem={(item) => setDeleteTarget(item)}
        onToggleTrip={toggleItemInTrip}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          item={deleteTarget}
          onConfirm={handleDeleteItem}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <MapView
          items={items}
          filters={filters}
          setFilters={setFilters}
          settings={settings}
          selected={selected}
          onSelect={setSelected}
          onZoomTo={(dest) => setFilters((f) => ({ ...f, destination: dest }))}
        />

        {selected && (
          <ItemCard
            item={selected}
            activeTrip={activeTrip}
            inActiveTrip={isInTrip(selected)}
            onClose={() => setSelected(null)}
            onAddToTrip={() => setModal('trips')}
            onToggleTrip={handleToggleTrip}
            onOpenTrips={() => setModal('trips')}
          />
        )}

        <Fab isOpen={addMenuOpen} onClick={() => setAddMenuOpen((o) => !o)} />

        {addMenuOpen && (
          <AddMenu
            onSearchPlace={() => { setModal('autocomplete'); setAddMenuOpen(false) }}
            onScratchpad={() => { setModal('scratchpad'); setAddMenuOpen(false) }}
            onAddManually={() => { setModal('manual'); setAddMenuOpen(false) }}
            onCloseMenu={() => setAddMenuOpen(false)}
          />
        )}
      </div>

      {(modal === 'autocomplete' || modal === 'manual') && (
        <AutocompleteAdd
          manualMode={modal === 'manual'}
          onClose={() => setModal(null)}
          onSave={(item) => {
            setItems((prev) => [...prev, item])
            setModal(null)
            // Only switch to local mode (showing pins) if already viewing this destination,
            // or if no destination filter is active yet and the item has coordinates.
            // Never silently replace an existing destination filter — that hides the user's list.
            if (item.destination && item.lat != null && item.lng != null) {
              setFilters((f) => {
                if (f.destination === null || f.destination === item.destination) {
                  return { ...f, destination: item.destination as string }
                }
                return f
              })
            }
          }}
        />
      )}

      {modal === 'scratchpad' && (
        <Scratchpad
          entries={scratchpadEntries}
          onClose={() => setModal(null)}
          onSaved={(item, entryId) => {
            setItems((prev) => [...prev, item])
            setScratchpadEntries((prev) => prev.filter((e) => e.id !== entryId))
            // Only switch to local mode if already viewing this destination.
            // Scratchpad items have no coordinates so we can't show a pin anyway.
            if (item.destination) {
              setFilters((f) => {
                if (f.destination === item.destination) {
                  return { ...f, destination: item.destination as string }
                }
                return f
              })
            }
          }}
          onDiscarded={(entryId) => {
            setScratchpadEntries((prev) => prev.filter((e) => e.id !== entryId))
          }}
        />
      )}

      {modal === 'trips' && (
        <TripsModal
          trips={trips}
          activeTripId={activeTripId}
          onActivate={(tripId) => { activateTrip(tripId); setModal(null) }}
          onClose={() => setModal(null)}
          onTripsUpdated={setTrips}
          items={items}
          tripItemIds={tripItemIds}
        />
      )}

      {modal === 'settings' && (
        <SettingsModal
          settings={settings}
          updateSetting={updateSetting}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

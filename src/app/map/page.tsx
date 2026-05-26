'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Item, Trip, ScratchpadEntry } from '@/types'
import { useFilters } from '@/hooks/use-filters'
import { useSettings } from '@/hooks/use-settings'
import { useTrip } from '@/hooks/use-trip'
import { Sidebar } from '@/components/sidebar/sidebar'
import { MapView } from '@/components/map/map-view'
import { ItemCard } from '@/components/map/item-card'
import { Fab } from '@/components/ui/fab'
import { AddMenu } from '@/components/modals/add-menu'
import { AutocompleteAdd } from '@/components/modals/autocomplete-add'
import { Scratchpad } from '@/components/modals/scratchpad'
import { TripsModal } from '@/components/modals/trips-modal'
import { SettingsModal } from '@/components/modals/settings-modal'

export default function MapPage() {
  const [items, setItems] = useState<Item[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [scratchpadEntries, setScratchpadEntries] = useState<ScratchpadEntry[]>([])
  const [selected, setSelected] = useState<Item | null>(null)
  const [modal, setModal] = useState<'autocomplete' | 'manual' | 'scratchpad' | 'trips' | 'settings' | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const { filters, setFilters } = useFilters()
  const [settings, updateSetting] = useSettings()
  const { activeTripId, activeTrip, isInTrip, toggleItemInTrip, activateTrip } = useTrip(trips)

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
        onDeactivateTrip={() => activateTrip(null)}
        scratchpadCount={scratchpadEntries.length}
      />

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
            onToggleTrip={toggleItemInTrip}
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

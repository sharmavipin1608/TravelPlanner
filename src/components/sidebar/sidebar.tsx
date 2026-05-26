'use client'

import React from 'react'
import type { Item, Trip, Category, Status } from '@/types'
import type { Filters } from '@/hooks/use-filters'
import { Icon } from '@/components/ui/icon'
import { DestinationChips } from './destination-chips'
import { CategoryGrid } from './category-grid'
import { ItemList } from './item-list'
import { ActiveTripPill } from './active-trip-pill'

export interface SidebarProps {
  items: Item[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  destinations: string[]
  selected: Item | null
  onSelect: (item: Item) => void
  onOpenAdd: () => void
  onOpenScratchpad: () => void
  onOpenTrips: () => void
  onOpenSettings: () => void
  trips: Trip[]
  activeTripId: string | null
  onDeactivateTrip: () => void
  scratchpadCount: number
}

export function Sidebar({
  items,
  filters,
  setFilters,
  destinations,
  selected,
  onSelect,
  onOpenAdd,
  onOpenScratchpad,
  onOpenTrips,
  onOpenSettings,
  trips,
  activeTripId,
  onDeactivateTrip,
  scratchpadCount,
}: SidebarProps) {
  const activeTrip = activeTripId ? trips.find((t) => t.id === activeTripId) ?? null : null

  function handleDestinationChange(d: string | null) {
    setFilters((prev) => ({ ...prev, destination: d }))
  }

  function handleCategoryToggle(c: Category) {
    setFilters((prev) => ({
      ...prev,
      category: prev.category === c ? 'all' : c,
    }))
  }

  function handleStatusChange(status: Status | 'all') {
    setFilters((prev) => ({ ...prev, status }))
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, q: e.target.value }))
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '380px',
        background: 'var(--paper)',
        borderRight: '1px solid var(--paper-3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      {/* 1. Brand bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          Wayfare
        </span>
        <button
          onClick={onOpenSettings}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--ink-3)',
          }}
          aria-label="Settings"
        >
          <Icon name="gear" size={18} stroke="var(--ink-3)" />
        </button>
      </div>

      {/* 2. Search input */}
      <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
        <input
          className="input"
          type="text"
          placeholder="Search…"
          value={filters.q}
          onChange={handleSearchChange}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* 3. Destination chips */}
      <div style={{ flexShrink: 0 }}>
        <DestinationChips
          destinations={destinations}
          active={filters.destination}
          onChange={handleDestinationChange}
        />
      </div>

      {/* 4. Category grid */}
      <div style={{ flexShrink: 0 }}>
        <CategoryGrid
          items={items}
          activeDestination={filters.destination}
          activeCategory={filters.category}
          onToggle={handleCategoryToggle}
        />
      </div>

      {/* 5. Active trip pill */}
      {activeTrip && (
        <div style={{ flexShrink: 0 }}>
          <ActiveTripPill
            trip={activeTrip}
            stopCount={items.filter((item) => item.status === 'planned').length}
            onDeactivate={onDeactivateTrip}
          />
        </div>
      )}

      {/* 6. Item list */}
      <ItemList
        items={items}
        filters={filters}
        selected={selected}
        onSelect={onSelect}
        onOpenScratchpad={onOpenScratchpad}
        onStatusChange={handleStatusChange}
      />

      {/* 7. Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderTop: '1px solid var(--paper-3)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onOpenScratchpad}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--ink-2)',
            fontSize: '13px',
            borderRadius: '6px',
          }}
          aria-label="Open scratchpad"
        >
          <Icon name="sparkle" size={16} stroke="var(--ink-2)" />
          {scratchpadCount > 0 && (
            <span
              style={{
                background: 'var(--ink)',
                color: 'var(--paper)',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {scratchpadCount}
            </span>
          )}
        </button>
        <button
          onClick={onOpenTrips}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--ink-2)',
            borderRadius: '6px',
          }}
          aria-label="Open trips"
        >
          <Icon name="suitcase" size={16} stroke="var(--ink-2)" />
        </button>
      </div>
    </div>
  )
}

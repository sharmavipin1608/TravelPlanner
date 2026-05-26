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
          padding: '16px 16px 14px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Brand mark */}
          <svg viewBox="0 0 24 24" width="26" height="26" style={{ flexShrink: 0 }}>
            <path
              d="M12 2 C 5 2 3 7 4 12 C 5 18 11 23 12 23 C 13 23 19 18 20 12 C 21 7 19 2 12 2 Z"
              fill="oklch(0.6 0.14 36)"
            />
            <circle cx="12" cy="10.5" r="3.4" fill="#fefcf6" />
            <circle cx="12" cy="10.5" r="1.4" fill="oklch(0.4 0.08 36)" />
          </svg>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1.15,
              }}
            >
              Wayfare
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              your travel atlas
            </div>
          </div>
        </div>
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

      {/* 2. Add a place CTA */}
      <div style={{ padding: '0 14px 10px', flexShrink: 0 }}>
        <button
          onClick={onOpenAdd}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Icon name="search" size={15} stroke="var(--paper)" strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>Add a place</div>
            <div style={{ fontSize: '11px', opacity: 0.6, lineHeight: 1.2 }}>search Google Places</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenScratchpad() }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.7,
            }}
            title="AI scratchpad"
            aria-label="Open scratchpad"
          >
            <Icon name="sparkle" size={15} stroke="var(--paper)" />
          </button>
        </button>
      </div>

      {/* 3. Search input */}
      <div style={{ padding: '0 14px 10px', flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '10px', pointerEvents: 'none', display: 'flex' }}>
            <Icon name="search" size={14} stroke="var(--ink-3)" />
          </span>
          <input
            className="input"
            type="text"
            placeholder={filters.destination ? `Search in ${filters.destination.split(',')[0]}` : 'Search saved places'}
            value={filters.q}
            onChange={handleSearchChange}
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '30px' }}
          />
        </div>
      </div>

      {/* 4. Destination chips */}
      <div style={{ flexShrink: 0 }}>
        <DestinationChips
          destinations={destinations}
          active={filters.destination}
          onChange={handleDestinationChange}
        />
      </div>

      {/* 5. Category grid */}
      <div style={{ flexShrink: 0 }}>
        <CategoryGrid
          items={items}
          activeDestination={filters.destination}
          activeCategory={filters.category}
          onToggle={handleCategoryToggle}
        />
      </div>

      {/* 6. Active trip pill */}
      {activeTrip && (
        <div style={{ flexShrink: 0 }}>
          <ActiveTripPill
            trip={activeTrip}
            stopCount={items.filter((item) => item.status === 'planned').length}
            onDeactivate={onDeactivateTrip}
          />
        </div>
      )}

      {/* 7. Item list */}
      <ItemList
        items={items}
        filters={filters}
        selected={selected}
        onSelect={onSelect}
        onOpenScratchpad={onOpenScratchpad}
        onStatusChange={handleStatusChange}
      />

      {/* 8. Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '10px 12px',
          borderTop: '1px solid var(--paper-3)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onOpenTrips}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: 'var(--ink-2)',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '6px',
            fontFamily: 'var(--font-ui)',
          }}
          aria-label="Open trips"
        >
          <Icon name="suitcase" size={15} stroke="var(--ink-2)" />
          <span>Trips</span>
          {trips.length > 0 && (
            <span
              style={{
                background: 'var(--paper-3)',
                color: 'var(--ink-2)',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {trips.length}
            </span>
          )}
        </button>

        {scratchpadCount > 0 && (
          <button
            onClick={onOpenScratchpad}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--ink-2)',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '6px',
              fontFamily: 'var(--font-ui)',
            }}
            aria-label="Open scratchpad"
          >
            <Icon name="sparkle" size={15} stroke="var(--ink-2)" />
            <span>{scratchpadCount} to triage</span>
          </button>
        )}
      </div>
    </div>
  )
}

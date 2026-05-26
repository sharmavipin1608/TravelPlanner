'use client'

import type { Item, Status } from '@/types'
import type { Filters } from '@/hooks/use-filters'
import { ItemRow } from './item-row'

interface ItemListProps {
  items: Item[]
  filters: Filters
  selected: Item | null
  onSelect: (item: Item) => void
  onOpenScratchpad: () => void
  onStatusChange?: (status: Status | 'all') => void
}

const STATUS_OPTIONS: Array<{ value: Status | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'planned', label: 'Planned' },
  { value: 'visited', label: 'Visited' },
]

function applyFilters(items: Item[], filters: Filters): Item[] {
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.status !== 'all' && item.status !== filters.status) return false
    if (filters.destination !== null && item.destination !== filters.destination) return false
    if (filters.q) {
      const q = filters.q.toLowerCase()
      const nameMatch = item.name.toLowerCase().includes(q)
      const notesMatch = item.notes?.toLowerCase().includes(q) ?? false
      if (!nameMatch && !notesMatch) return false
    }
    return true
  })
}

export function ItemList({
  items,
  filters,
  selected,
  onSelect,
  onOpenScratchpad,
  onStatusChange,
}: ItemListProps) {
  const filtered = applyFilters(items, filters)

  const labelText =
    filters.category !== 'all'
      ? filters.category === 'accommodation'
        ? 'stays'
        : filters.category === 'activity'
        ? 'activities'
        : `${filters.category}s`
      : 'places'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
          {filtered.length} {labelText}
        </span>
        <select
          value={filters.status}
          onChange={(e) => onStatusChange?.(e.target.value as Status | 'all')}
          style={{
            fontSize: '12px',
            color: 'var(--ink-2)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontSize: '14px',
            }}
          >
            <div style={{ marginBottom: '12px' }}>Nothing saved here yet.</div>
            <button
              onClick={onOpenScratchpad}
              style={{
                fontSize: '13px',
                color: 'var(--ink-2)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Add via scratchpad →
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onClick={() => onSelect(item)}
            />
          ))
        )}
      </div>
    </div>
  )
}

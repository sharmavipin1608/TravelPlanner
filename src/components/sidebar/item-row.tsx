'use client'

import type { Item } from '@/types'
import { CATEGORY_META } from '@/lib/google-maps/category-meta'
import { Icon } from '@/components/ui/icon'

interface ItemRowProps {
  item: Item
  selected: boolean
  onClick: () => void
  activeTripId?: string | null
  isInTrip?: boolean
  onDelete?: (item: Item) => void
  onToggleTrip?: (item: Item) => void
}

export function ItemRow({ item, selected, onClick, activeTripId = null, isInTrip = false, onDelete = () => {}, onToggleTrip = () => {} }: ItemRowProps) {
  const meta = item.category ? CATEGORY_META[item.category] : null
  const categoryColor = meta?.color ?? 'oklch(0.62 0.16 0)'

  return (
    <div
      role="button"
      data-testid="item-row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: 'var(--pad-y) 16px',
        cursor: 'pointer',
        background: selected ? 'var(--paper-2)' : 'transparent',
        outline: 'none',
      }}
    >
      {/* Category dot */}
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: categoryColor,
          flexShrink: 0,
          marginTop: '4px',
        }}
      />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--ink-3)',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.destination ?? 'Unknown'}
        </div>
        {item.notes && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ink-2)',
              marginTop: '2px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.notes}
          </div>
        )}
      </div>

      {/* Contextual action button */}
      {(() => {
        if (activeTripId === null) {
          // No trip active → delete button (red-tinted ×)
          return (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item) }}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'rgba(220,50,30,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Icon name="x" size={14} stroke="oklch(0.55 0.18 14)" />
            </button>
          )
        }
        if (!isInTrip) {
          // Trip active, not in trip → add button (green-tinted +)
          return (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTrip(item) }}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'rgba(60,180,100,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Icon name="plus" size={14} stroke="oklch(0.55 0.16 152)" />
            </button>
          )
        }
        // Trip active, in trip → remove-from-trip button (indigo-tinted ×)
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTrip(item) }}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'rgba(80,70,200,.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Icon name="x" size={14} stroke="oklch(0.55 0.18 280)" />
          </button>
        )
      })()}
    </div>
  )
}

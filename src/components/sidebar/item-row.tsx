'use client'

import type { Item, Category } from '@/types'

const CATEGORY_HUE: Record<Category, number> = {
  restaurant: 14,
  place: 36,
  accommodation: 216,
  activity: 152,
}

const STATUS_COLOR: Record<string, string> = {
  wishlist: '#888',
  planned: 'oklch(0.62 0.16 80)',
  visited: 'oklch(0.55 0.16 145)',
}

interface ItemRowProps {
  item: Item
  selected: boolean
  onClick: () => void
}

export function ItemRow({ item, selected, onClick }: ItemRowProps) {
  const hue = item.category ? CATEGORY_HUE[item.category] : 0
  const categoryColor = `oklch(0.62 0.16 ${hue})`
  const statusColor = STATUS_COLOR[item.status] ?? '#888'

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

      {/* Status dot */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
          marginTop: '5px',
        }}
      />
    </div>
  )
}

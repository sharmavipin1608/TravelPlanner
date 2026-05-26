'use client'

import type { Item, Category } from '@/types'

const CATEGORY_META: Record<Category, { hue: number; label: string }> = {
  restaurant: { hue: 14, label: 'Restaurants' },
  place: { hue: 36, label: 'Places' },
  accommodation: { hue: 216, label: 'Stays' },
  activity: { hue: 152, label: 'Activities' },
}

const CATEGORY_ORDER: Category[] = ['restaurant', 'place', 'accommodation', 'activity']

interface CategoryGridProps {
  items: Item[]
  activeDestination: string | null
  activeCategory: Category | 'all'
  onToggle: (c: Category) => void
}

export function CategoryGrid({
  items,
  activeDestination,
  activeCategory,
  onToggle,
}: CategoryGridProps) {
  const filteredItems = activeDestination
    ? items.filter((item) => item.destination === activeDestination)
    : items

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        padding: '0 14px 10px',
      }}
    >
      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_META[cat]
        const count = filteredItems.filter((item) => item.category === cat).length
        const isActive = activeCategory === cat
        const color = `oklch(0.62 0.16 ${meta.hue})`

        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: isActive ? `oklch(0.96 0.03 ${meta.hue})` : 'var(--paper-2)',
              cursor: 'pointer',
              border: isActive ? `1.5px solid ${color}` : '1.5px solid transparent',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--ink-2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {meta.label}
            </span>
            {count > 0 && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isActive ? color : 'var(--ink-3)',
                  flexShrink: 0,
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
